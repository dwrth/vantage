import { useCallback, useEffect, useRef, useState } from 'react';
import { diffLayouts, type LayoutChangeset } from '../lib/diff';
import type { Layout } from '../types';

export type VantageHistoryOptions = {
  /** Max past entries. Default 50. */
  capacity?: number;
  /** Merge rapid edits into one stack entry. Default 400. `0` disables. */
  coalesceMs?: number;
};

export type VantageHistory = {
  layout: Layout;
  onChange: (next: Layout, changeset: LayoutChangeset) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Clear stacks; host must set layout separately. Does not call `onChange`. */
  reset: (layout: Layout) => void;
};

const DEFAULT_CAPACITY = 50;
const DEFAULT_COALESCE_MS = 400;

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
  const coalesceMs = opts?.coalesceMs ?? DEFAULT_COALESCE_MS;

  const [stacks, setStacks] = useState<HistoryStacks>({ past: [], future: [] });
  const lastPushAtRef = useRef(0);

  const layoutRef = useRef(layout);
  const onChangeRef = useRef(onChange);
  const capacityRef = useRef(capacity);
  const coalesceMsRef = useRef(coalesceMs);
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

  useEffect(() => {
    coalesceMsRef.current = coalesceMs;
  }, [coalesceMs]);

  const commitStacks = useCallback((next: HistoryStacks) => {
    stacksRef.current = next;
    setStacks(next);
  }, []);

  const wrappedOnChange = useCallback(
    (next: Layout, changeset: LayoutChangeset) => {
      const current = layoutRef.current;
      if (next === current) return;

      const now = Date.now();
      const windowMs = coalesceMsRef.current;
      const shouldCoalesce =
        windowMs > 0 && lastPushAtRef.current > 0 && now - lastPushAtRef.current < windowMs;

      if (!shouldCoalesce) {
        const { past } = stacksRef.current;
        commitStacks({
          past: trimPast([...past, current], capacityRef.current),
          future: [],
        });
      }
      lastPushAtRef.current = now;
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
    lastPushAtRef.current = 0;
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
    lastPushAtRef.current = 0;
    onChangeRef.current(restored, diffLayouts(current, restored));
  }, [commitStacks]);

  const reset = useCallback(
    (_baseline: Layout) => {
      void _baseline;
      commitStacks({ past: [], future: [] });
      lastPushAtRef.current = 0;
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
