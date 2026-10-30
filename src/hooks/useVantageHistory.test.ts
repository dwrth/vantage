// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { LayoutChangeset } from '../lib/diff';
import { addSection, createEmptyLayout, updateLayoutMeta } from '../mutations/layout';
import type { Layout } from '../types';
import { useVantageHistory, type VantageHistoryOptions } from './useVantageHistory';

/** Host-owned state wired through the hook, as in docs/history.md. */
function setup(opts?: VantageHistoryOptions, initial: Layout = createEmptyLayout()) {
  const onChange = vi.fn<(next: Layout, changeset: LayoutChangeset) => void>();
  const view = renderHook(() => {
    const [layout, setLayout] = useState(initial);
    return useVantageHistory(
      layout,
      (next, changeset) => {
        onChange(next, changeset);
        setLayout(next);
      },
      opts,
    );
  });
  /** Apply an edit through the wrapped onChange, like the builder does. */
  const edit = (fn: (layout: Layout) => Layout, mergeKey?: string) =>
    act(() => {
      const current = view.result.current.layout;
      view.result.current.onChange(fn(current), {} as LayoutChangeset, { mergeKey });
    });
  return { view, onChange, edit, initial };
}

const stepOf = (layout: Layout) => layout.meta?.step;

describe('useVantageHistory', () => {
  it('starts empty and forwards edits to the host', () => {
    const { view, onChange, edit } = setup();
    expect(view.result.current.canUndo).toBe(false);
    expect(view.result.current.canRedo).toBe(false);

    edit((l) => updateLayoutMeta(l, { step: 1 }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(stepOf(view.result.current.layout)).toBe(1);
    expect(view.result.current.canUndo).toBe(true);
  });

  it('undoes and redoes edits in order', () => {
    const { view, edit, initial } = setup();
    edit((l) => updateLayoutMeta(l, { step: 1 }));
    edit((l) => updateLayoutMeta(l, { step: 2 }));

    act(() => view.result.current.undo());
    expect(stepOf(view.result.current.layout)).toBe(1);
    expect(view.result.current.canRedo).toBe(true);

    act(() => view.result.current.undo());
    expect(view.result.current.layout).toBe(initial);
    expect(view.result.current.canUndo).toBe(false);

    act(() => view.result.current.redo());
    act(() => view.result.current.redo());
    expect(stepOf(view.result.current.layout)).toBe(2);
    expect(view.result.current.canRedo).toBe(false);
  });

  it('passes a real changeset to the host on undo', () => {
    const { view, onChange, edit } = setup();
    edit((l) => addSection(l).layout);
    const added = view.result.current.layout.sections[0]!;

    act(() => view.result.current.undo());
    const [restored, changeset] = onChange.mock.lastCall!;
    expect(restored.sections).toEqual([]);
    expect(changeset.sectionsRemoved).toEqual([{ sectionId: added.id, prev: added }]);
  });

  it('drops the redo stack on a new edit', () => {
    const { view, edit } = setup();
    edit((l) => updateLayoutMeta(l, { step: 1 }));
    act(() => view.result.current.undo());
    expect(view.result.current.canRedo).toBe(true);

    edit((l) => updateLayoutMeta(l, { step: 9 }));
    expect(view.result.current.canRedo).toBe(false);
    act(() => view.result.current.redo());
    expect(stepOf(view.result.current.layout)).toBe(9);
  });

  it('ignores a change that returns the current layout', () => {
    const { view, onChange, edit } = setup();
    edit((l) => l);
    expect(onChange).not.toHaveBeenCalled();
    expect(view.result.current.canUndo).toBe(false);
  });

  it('keeps at most `capacity` past entries', () => {
    const { view, edit } = setup({ capacity: 2 });
    for (const n of [1, 2, 3, 4]) edit((l) => updateLayoutMeta(l, { step: n }));

    act(() => view.result.current.undo());
    act(() => view.result.current.undo());
    expect(stepOf(view.result.current.layout)).toBe(2);
    expect(view.result.current.canUndo).toBe(false);
    act(() => view.result.current.undo());
    expect(stepOf(view.result.current.layout)).toBe(2);
  });

  it('keeps edits without a merge key as separate steps, however fast', () => {
    const { view, edit, initial } = setup();
    edit((l) => updateLayoutMeta(l, { step: 1 }));
    edit((l) => updateLayoutMeta(l, { step: 2 }));

    act(() => view.result.current.undo());
    expect(stepOf(view.result.current.layout)).toBe(1);
    act(() => view.result.current.undo());
    expect(view.result.current.layout).toBe(initial);
  });

  it('merges consecutive edits of one gesture (same merge key) into one step', () => {
    const { view, edit, initial } = setup();
    edit((l) => updateLayoutMeta(l, { step: 1 }), 'drag-a');
    edit((l) => updateLayoutMeta(l, { step: 2 }), 'drag-a');
    edit((l) => updateLayoutMeta(l, { step: 3 }), 'drag-a');
    edit((l) => updateLayoutMeta(l, { step: 4 }), 'drag-b');

    act(() => view.result.current.undo());
    expect(stepOf(view.result.current.layout)).toBe(3);
    act(() => view.result.current.undo());
    expect(view.result.current.layout).toBe(initial);
    expect(view.result.current.canUndo).toBe(false);
  });

  it('ends a gesture at any edit with another or no key', () => {
    const { view, edit } = setup();
    edit((l) => updateLayoutMeta(l, { step: 1 }), 'typing');
    edit((l) => updateLayoutMeta(l, { step: 2 }));
    edit((l) => updateLayoutMeta(l, { step: 3 }), 'typing');

    act(() => view.result.current.undo());
    expect(stepOf(view.result.current.layout)).toBe(2);
  });

  it('starts a new step after undo even with the same merge key', () => {
    const { view, edit } = setup();
    edit((l) => updateLayoutMeta(l, { step: 1 }), 'key');
    act(() => view.result.current.undo());
    edit((l) => updateLayoutMeta(l, { step: 2 }), 'key');
    edit((l) => updateLayoutMeta(l, { step: 3 }), 'key');
    act(() => view.result.current.undo());
    expect(view.result.current.layout.meta).toBeUndefined();
  });

  it('starts a new step after reset even with the same merge key', () => {
    const { view, edit } = setup();
    edit((l) => updateLayoutMeta(l, { step: 1 }), 'key');
    act(() => view.result.current.reset(view.result.current.layout));
    edit((l) => updateLayoutMeta(l, { step: 2 }), 'key');
    expect(view.result.current.canUndo).toBe(true);
    act(() => view.result.current.undo());
    expect(stepOf(view.result.current.layout)).toBe(1);
  });

  it('reset clears both stacks without touching the layout', () => {
    const { view, onChange, edit } = setup();
    edit((l) => updateLayoutMeta(l, { step: 1 }));
    edit((l) => updateLayoutMeta(l, { step: 2 }));
    act(() => view.result.current.undo());
    onChange.mockClear();

    act(() => view.result.current.reset(view.result.current.layout));
    expect(view.result.current.canUndo).toBe(false);
    expect(view.result.current.canRedo).toBe(false);
    expect(stepOf(view.result.current.layout)).toBe(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});
