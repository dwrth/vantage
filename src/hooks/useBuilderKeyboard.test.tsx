// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SelectionRef } from '../context/BuilderContext';
import { DEFAULT_BLOCK_ANNOUNCEMENTS, DEFAULT_BLOCK_LABELS } from '../lib/keyboardLabels';
import type { GridItem, Layout } from '../types';
import {
  BLOCK_ATTR,
  blockKey,
  useBuilderKeyboard,
  type BuilderHistory,
} from './useBuilderKeyboard';

const item = (id: string, x: number, y: number): GridItem => ({
  id,
  kind: 'block',
  label: id.toUpperCase(),
  x,
  y,
  w: 2,
  h: 2,
});

const layout: Layout = {
  breakpoints: ['desktop'],
  breakpointWidths: {},
  breakpointPreviewWidths: {},
  sections: [
    {
      id: 's',
      columns: 12,
      rows: 6,
      items: [item('a', 0, 0), item('b', 4, 0), item('c', 8, 0), item('d', 0, 3)],
    },
  ],
};

const ref = (itemId: string): SelectionRef => ({ sectionId: 's', itemId });

let root: HTMLDivElement;

function block(id: string) {
  const el = document.createElement('div');
  el.setAttribute(BLOCK_ATTR, blockKey(ref(id)));
  el.tabIndex = 0;
  root.append(el);
  return el;
}

function setup(
  overrides: Partial<Parameters<typeof useBuilderKeyboard>[1]> = {},
  mountRoot = true,
) {
  const state = {
    layout,
    selection: ref('a') as SelectionRef | null,
    setSelection: vi.fn(),
    selectedItems: [ref('a')],
    setSelectedItems: vi.fn(),
    activeBreakpoint: 'desktop' as const,
    isInteracting: false,
    emitChange: vi.fn(),
    blockLabels: DEFAULT_BLOCK_LABELS,
    announcements: DEFAULT_BLOCK_ANNOUNCEMENTS,
    announce: vi.fn(),
    minSizes: { current: new Map() },
    ...overrides,
  };
  const rootRef = { current: mountRoot ? root : null };
  const view = renderHook((s) => useBuilderKeyboard(rootRef, s), { initialProps: state });
  return { state, view, rootRef };
}

function key(init: KeyboardEventInit, target: EventTarget = window) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

const history = (over: Partial<BuilderHistory> = {}): BuilderHistory => ({
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: true,
  canRedo: true,
  ...over,
});

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('useBuilderKeyboard guards', () => {
  it('acts on keys dispatched on the window (focus nowhere)', () => {
    const { state } = setup();
    const event = key({ key: 'ArrowRight' });
    expect(event.defaultPrevented).toBe(true);
    expect(state.emitChange).toHaveBeenCalledTimes(1);
    const next: Layout = state.emitChange.mock.calls[0]![0];
    expect(next.sections[0]!.items[0]!.x).toBe(1);
    expect(state.announce).toHaveBeenCalledWith('A moved to column 2, row 1');
  });

  it('does nothing while a drag or resize is in progress', () => {
    const { state } = setup({ isInteracting: true });
    key({ key: 'ArrowRight' });
    expect(state.emitChange).not.toHaveBeenCalled();
  });

  it('ignores events another handler already handled', () => {
    const { state } = setup();
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
    event.preventDefault();
    window.dispatchEvent(event);
    expect(state.emitChange).not.toHaveBeenCalled();
  });

  it('ignores keys without a builder action', () => {
    const { state } = setup();
    const event = key({ key: 'a' });
    expect(event.defaultPrevented).toBe(false);
    expect(state.emitChange).not.toHaveBeenCalled();
  });

  it('does nothing when the root is not mounted', () => {
    const { state } = setup({}, false);
    key({ key: 'ArrowRight' });
    expect(state.emitChange).not.toHaveBeenCalled();
  });

  it.each(['input', 'textarea', 'select'])('leaves %s fields alone', (tag) => {
    const { state } = setup({ history: history() });
    const field = document.createElement(tag);
    document.body.append(field);
    key({ key: 'ArrowRight' }, field);
    key({ key: 'z', metaKey: true }, field);
    expect(state.emitChange).not.toHaveBeenCalled();
    expect(state.history!.undo).not.toHaveBeenCalled();
  });

  it('leaves contenteditable regions alone', () => {
    const { state } = setup();
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    root.append(editable);
    key({ key: 'Delete' }, editable);
    expect(state.emitChange).not.toHaveBeenCalled();
  });

  it('does nothing without a selection', () => {
    const { state } = setup({ selection: null, selectedItems: [] });
    const event = key({ key: 'ArrowRight' });
    expect(event.defaultPrevented).toBe(false);
    expect(state.emitChange).not.toHaveBeenCalled();
  });

  it('ignores keys while focus sits in another block', () => {
    const { state } = setup();
    block('a');
    const other = block('b');
    key({ key: 'ArrowRight' }, other);
    expect(state.emitChange).not.toHaveBeenCalled();
  });

  it('acts when focus is on the selected block or the document element', () => {
    const { state } = setup();
    key({ key: 'ArrowDown' }, block('a'));
    key({ key: 'ArrowDown' }, document.documentElement);
    key({ key: 'ArrowDown' }, document.body);
    expect(state.emitChange).toHaveBeenCalledTimes(3);
  });

  it('stops listening after unmount', () => {
    const { state, view } = setup();
    view.unmount();
    key({ key: 'ArrowRight' });
    expect(state.emitChange).not.toHaveBeenCalled();
  });

  it('reads the latest state without re-subscribing', () => {
    const { state, view } = setup();
    view.rerender({ ...state, selection: ref('b'), selectedItems: [ref('b')] });
    key({ key: 'ArrowRight' });
    const next: Layout = state.emitChange.mock.calls[0]![0];
    expect(next.sections[0]!.items.find((i) => i.id === 'b')!.x).toBe(5);
  });
});

describe('useBuilderKeyboard undo and redo', () => {
  it('undoes and redoes with announcements', () => {
    const h = history();
    const { state } = setup({ history: h });
    expect(key({ key: 'z', ctrlKey: true }).defaultPrevented).toBe(true);
    expect(h.undo).toHaveBeenCalledTimes(1);
    expect(state.announce).toHaveBeenLastCalledWith('Undone');
    key({ key: 'z', ctrlKey: true, shiftKey: true });
    expect(h.redo).toHaveBeenCalledTimes(1);
    expect(state.announce).toHaveBeenLastCalledWith('Redone');
  });

  it('works without a selection', () => {
    const h = history();
    setup({ history: h, selection: null, selectedItems: [] });
    key({ key: 'z', metaKey: true });
    expect(h.undo).toHaveBeenCalledTimes(1);
  });

  it('leaves the key to the browser when there is nothing to undo', () => {
    const h = history({ canUndo: false });
    const { state } = setup({ history: h });
    expect(key({ key: 'z', metaKey: true }).defaultPrevented).toBe(false);
    expect(h.undo).not.toHaveBeenCalled();
    expect(state.announce).not.toHaveBeenCalled();
  });

  it('leaves the key to the browser when there is nothing to redo', () => {
    const h = history({ canRedo: false });
    setup({ history: h });
    expect(key({ key: 'y', ctrlKey: true }).defaultPrevented).toBe(false);
    expect(h.redo).not.toHaveBeenCalled();
  });

  it('stays out of dialogs outside the builder', () => {
    const h = history();
    setup({ history: h });
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const button = document.createElement('button');
    dialog.append(button);
    document.body.append(dialog);
    key({ key: 'z', metaKey: true }, button);
    expect(h.undo).not.toHaveBeenCalled();
  });

  it('still undoes inside a dialog that lives within the builder root', () => {
    const h = history();
    setup({ history: h });
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const button = document.createElement('button');
    dialog.append(button);
    root.append(dialog);
    key({ key: 'z', metaKey: true }, button);
    expect(h.undo).toHaveBeenCalledTimes(1);
  });

  it('undoes from outside the root when no dialog is involved', () => {
    const h = history();
    setup({ history: h });
    const outside = document.createElement('button');
    document.body.append(outside);
    key({ key: 'z', metaKey: true }, outside);
    expect(h.undo).toHaveBeenCalledTimes(1);
  });
});

describe('useBuilderKeyboard single selection', () => {
  it('deselect announces the block that was selected', () => {
    const { state } = setup();
    expect(key({ key: 'Escape' }).defaultPrevented).toBe(true);
    expect(state.setSelection).toHaveBeenCalledWith(null);
    expect(state.announce).toHaveBeenCalledWith('A deselected');
  });

  it('deselect of a selection whose block is gone stays silent', () => {
    const { state } = setup({ selection: ref('gone'), selectedItems: [ref('gone')] });
    key({ key: 'Escape' });
    expect(state.setSelection).toHaveBeenCalledWith(null);
    expect(state.announce).not.toHaveBeenCalled();
  });

  it('deselect with a section that is gone also stays silent', () => {
    const { state } = setup({
      selection: { sectionId: 'nope', itemId: 'a' },
      selectedItems: [{ sectionId: 'nope', itemId: 'a' }],
    });
    key({ key: 'Escape' });
    expect(state.setSelection).toHaveBeenCalledWith(null);
    expect(state.announce).not.toHaveBeenCalled();
  });

  it('does not prevent the key when the action changes nothing for a missing block', () => {
    const { state } = setup({ selection: ref('gone'), selectedItems: [ref('gone')] });
    const event = key({ key: 'ArrowRight' });
    expect(event.defaultPrevented).toBe(false);
    expect(state.emitChange).not.toHaveBeenCalled();
  });

  it('announces but emits nothing when a move hits the edge', () => {
    const { state } = setup();
    const event = key({ key: 'ArrowLeft' });
    expect(event.defaultPrevented).toBe(true);
    expect(state.emitChange).not.toHaveBeenCalled();
    expect(state.announce).toHaveBeenCalledWith('A moved to column 1, row 1');
  });

  it('uses the reported content minimum as the resize floor', () => {
    const minSizes = { current: new Map([[blockKey(ref('a')), { w: 2, h: 2 }]]) };
    const { state } = setup({ minSizes });
    key({ key: 'ArrowLeft', shiftKey: true });
    expect(state.emitChange).not.toHaveBeenCalled();
  });

  it('resize and layer keys announce their result', () => {
    const { state } = setup({ selection: ref('d'), selectedItems: [ref('d')] });
    key({ key: 'ArrowRight', shiftKey: true });
    expect(state.announce).toHaveBeenLastCalledWith('D resized to 3 columns by 2 rows');
    key({ key: 'ArrowUp', ctrlKey: true, shiftKey: true });
    expect(state.announce).toHaveBeenLastCalledWith('D brought forward');
    key({ key: 'ArrowDown', ctrlKey: true, shiftKey: true });
    expect(state.announce).toHaveBeenLastCalledWith('D sent backward');
  });

  it('one held key shares a merge key, a new press starts a new one', () => {
    const { state } = setup();
    key({ key: 'ArrowDown' });
    key({ key: 'ArrowDown', repeat: true });
    key({ key: 'ArrowDown' });
    const keys = state.emitChange.mock.calls.map((c) => c[1].mergeKey);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
    expect(keys[0]).toMatch(/^vantage-key:move:s:a:\d+$/);
  });

  it('delete selects the previous block when the last one is removed', () => {
    const { state } = setup({ selection: ref('d'), selectedItems: [ref('d')] });
    key({ key: 'Delete' });
    expect(state.setSelection).toHaveBeenCalledWith(ref('c'));
    expect(state.announce).toHaveBeenCalledWith('D deleted');
  });

  it('delete of the only block clears the selection', () => {
    const only: Layout = {
      ...layout,
      sections: [{ ...layout.sections[0]!, items: [item('a', 0, 0)] }],
    };
    const { state } = setup({ layout: only });
    key({ key: 'Backspace' });
    expect(state.setSelection).toHaveBeenCalledWith(null);
    expect(state.emitChange.mock.calls[0]![0].sections[0].items).toEqual([]);
  });

  it('moves focus to the next block once the layout changed', () => {
    const { state, view } = setup();
    const a = block('a');
    const b = block('b');
    a.focus();
    key({ key: 'Delete' }, a);
    view.rerender({
      ...state,
      layout: { ...layout, sections: [{ ...layout.sections[0]!, items: [] }] },
    });
    expect(document.activeElement).toBe(b);
  });

  it('does not steal focus while the layout is unchanged', () => {
    const { state, view } = setup();
    const a = block('a');
    const b = block('b');
    a.focus();
    key({ key: 'Delete' }, a);
    view.rerender({ ...state });
    expect(document.activeElement).toBe(a);
    expect(document.activeElement).not.toBe(b);
  });

  it('keeps focus when the target block is not in the DOM', () => {
    const { state, view } = setup();
    const a = block('a');
    a.focus();
    key({ key: 'Delete' }, a);
    view.rerender({ ...state, layout: { ...layout } });
    expect(document.activeElement).toBe(a);
  });
});

describe('useBuilderKeyboard group', () => {
  const group = [ref('a'), ref('b')];

  it('moves the group as a unit and announces it', () => {
    const { state } = setup({ selection: ref('b'), selectedItems: group });
    expect(key({ key: 'ArrowDown' }).defaultPrevented).toBe(true);
    const next: Layout = state.emitChange.mock.calls[0]![0];
    expect(next.sections[0]!.items.filter((i) => i.y === 1).map((i) => i.id)).toEqual(['a', 'b']);
    expect(state.emitChange.mock.calls[0]![1].mergeKey).toMatch(/^vantage-key:group-move:s:\d+$/);
    expect(state.announce).toHaveBeenCalledWith('2 blocks moved');
  });

  it('a group move that clamps to nothing emits no change but still announces', () => {
    const { state } = setup({ selection: ref('b'), selectedItems: group });
    key({ key: 'ArrowUp' });
    expect(state.emitChange).not.toHaveBeenCalled();
    expect(state.announce).toHaveBeenCalledWith('2 blocks moved');
  });

  it('resize and layer keys are swallowed without changes', () => {
    const { state } = setup({ selection: ref('b'), selectedItems: group });
    expect(key({ key: 'ArrowRight', shiftKey: true }).defaultPrevented).toBe(true);
    expect(key({ key: 'ArrowUp', metaKey: true, shiftKey: true }).defaultPrevented).toBe(true);
    expect(state.emitChange).not.toHaveBeenCalled();
    expect(state.announce).not.toHaveBeenCalled();
  });

  it('Escape clears the selection and announces it', () => {
    const { state } = setup({ selection: ref('b'), selectedItems: group });
    key({ key: 'Escape' });
    expect(state.setSelection).toHaveBeenCalledWith(null);
    expect(state.announce).toHaveBeenCalledWith('Selection cleared');
  });

  it('Delete removes the group and selects the next block after the primary one', () => {
    const { state } = setup({ selection: ref('a'), selectedItems: group });
    key({ key: 'Delete' });
    expect(state.emitChange.mock.calls[0]![0].sections[0].items.map((i: GridItem) => i.id)).toEqual(
      ['c', 'd'],
    );
    expect(state.setSelection).toHaveBeenCalledWith(ref('c'));
    expect(state.announce).toHaveBeenCalledWith('2 blocks deleted');
  });

  it('Delete falls back to the nearest block before the group', () => {
    const { state } = setup({
      selection: ref('d'),
      selectedItems: [ref('c'), ref('d')],
    });
    key({ key: 'Delete' });
    expect(state.setSelection).toHaveBeenCalledWith(ref('b'));
  });

  it('Delete of every block clears the selection', () => {
    const { state } = setup({
      selection: ref('d'),
      selectedItems: [ref('a'), ref('b'), ref('c'), ref('d')],
    });
    key({ key: 'Delete' });
    expect(state.setSelection).toHaveBeenCalledWith(null);
  });

  it('acts from any block of the group but not from one outside it', () => {
    const { state } = setup({ selection: ref('b'), selectedItems: group });
    key({ key: 'ArrowDown' }, block('a'));
    expect(state.emitChange).toHaveBeenCalledTimes(1);
    key({ key: 'ArrowDown' }, block('c'));
    expect(state.emitChange).toHaveBeenCalledTimes(1);
  });
});
