import { useCallback, useEffect, useRef, useState } from 'react';
import { diffLayouts, type LayoutChangeOptions, type LayoutChangeset } from '../lib/diff';
import type { Layout } from '../types';

export type VantageHistoryOptions = {
  /** Max past entries. Default 50. */
  capacity?: number;
  /**
   * @deprecated Ignored. Edits merge by gesture (`LayoutChangeOptions.mergeKey`), not by time.
   */
  coalesceMs?: number;
};

export type VantageHistory = {
  layout: Layout;
  /**
   * Records the change, then forwards it. Consecutive changes with the same
   * `options.mergeKey` become one undo step.
   */
  onChange: (next: Layout, changeset: LayoutChangeset, options?: LayoutChangeOptions) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Clear stacks; host must set layout separately. Does not call `onChange`. */
  reset: (layout: Layout) => void;
};

const DEFAULT_CAPACITY = 50;

type HistoryStacks = {
  past: Layout[];
  future: Layout[];
};

function trimPast(past: Layout[], capacity: number): Layout[] {
  return past.length > capacity ? past.slice(past.length - capacity) : past;
}

export function useVantageHistory(
  layout: Layout,
  onChange: (next: Layout, changeset: LayoutChangeset) => void,
  opts?: VantageHistoryOptions,
): VantageHistory {
  const capacity = opts?.capacity ?? DEFAULT_CAPACITY;

  const [stacks, setStacks] = useState<HistoryStacks>({ past: [], future: [] });
  // Merge key of the gesture the newest past entry started; null once anything else happens.
  const gestureRef = useRef<string | null>(null);

  const layoutRef = useRef(layout);
  const onChangeRef = useRef(onChange);
  const capacityRef = useRef(capacity);
  const stacksRef = useRef(stacks);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    capacityRef.current = capacity;
  }, [capacity]);

  const commitStacks = useCallback((next: HistoryStacks) => {
    stacksRef.current = next;
    setStacks(next);
  }, []);

  const wrappedOnChange = useCallback(
    (next: Layout, changeset: LayoutChangeset, options?: LayoutChangeOptions) => {
      const current = layoutRef.current;
      if (next === current) return;

      const key = options?.mergeKey ?? null;
      const continuesGesture =
        key !== null && key === gestureRef.current && stacksRef.current.past.length > 0;

      if (!continuesGesture) {
        const { past } = stacksRef.current;
        commitStacks({
          past: trimPast([...past, current], capacityRef.current),
          future: [],
        });
      }
      gestureRef.current = key;
      onChangeRef.current(next, changeset);
    },
    [commitStacks],
  );

  const undo = useCallback(() => {
    const { past, future } = stacksRef.current;
    if (past.length === 0) return;
    const restored = past[past.length - 1]!;
    const current = layoutRef.current;
    commitStacks({ past: past.slice(0, -1), future: [...future, current] });
    gestureRef.current = null;
    onChangeRef.current(restored, diffLayouts(current, restored));
  }, [commitStacks]);

  const redo = useCallback(() => {
    const { past, future } = stacksRef.current;
    if (future.length === 0) return;
    const restored = future[future.length - 1]!;
    const current = layoutRef.current;
    commitStacks({
      past: trimPast([...past, current], capacityRef.current),
      future: future.slice(0, -1),
    });
    gestureRef.current = null;
    onChangeRef.current(restored, diffLayouts(current, restored));
  }, [commitStacks]);

  const reset = useCallback(
    (_baseline: Layout) => {
      void _baseline;
      commitStacks({ past: [], future: [] });
      gestureRef.current = null;
    },
    [commitStacks],
  );

  return {
    layout,
    onChange: wrappedOnChange,
    undo,
    redo,
    canUndo: stacks.past.length > 0,
    canRedo: stacks.future.length > 0,
    reset,
  };
}
