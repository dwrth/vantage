import { describe, expect, it } from 'vitest';
import type { GridItem, Layout } from '../types';
import { applyBlockAction, keyToAction } from './keyboard';
import { blocksInReadingOrder, sortByReadingOrder } from './readingOrder';

const key = (k: string, mods: Partial<Record<'shift' | 'meta' | 'ctrl' | 'alt', boolean>> = {}) =>
  keyToAction({
    key: k,
    shiftKey: !!mods.shift,
    metaKey: !!mods.meta,
    ctrlKey: !!mods.ctrl,
    altKey: !!mods.alt,
  });

describe('keyToAction', () => {
  it('moves with arrows and resizes with Shift+arrows', () => {
    expect(key('ArrowLeft')).toEqual({ type: 'move', dx: -1, dy: 0 });
    expect(key('ArrowDown')).toEqual({ type: 'move', dx: 0, dy: 1 });
    expect(key('ArrowRight', { shift: true })).toEqual({ type: 'resize', dw: 1, dh: 0 });
    expect(key('ArrowUp', { shift: true })).toEqual({ type: 'resize', dw: 0, dh: -1 });
  });

  it('maps delete, escape and layering', () => {
    expect(key('Delete')).toEqual({ type: 'delete' });
    expect(key('Backspace')).toEqual({ type: 'delete' });
    expect(key('Escape')).toEqual({ type: 'deselect' });
    expect(key('ArrowUp', { meta: true, shift: true })).toEqual({ type: 'bringForward' });
    expect(key('ArrowDown', { ctrl: true, shift: true })).toEqual({ type: 'sendBackward' });
  });

  it('maps undo and both redo shortcuts on Cmd and Ctrl', () => {
    expect(key('z', { meta: true })).toEqual({ type: 'undo' });
    expect(key('z', { ctrl: true })).toEqual({ type: 'undo' });
    expect(key('Z', { meta: true, shift: true })).toEqual({ type: 'redo' });
    expect(key('y', { ctrl: true })).toEqual({ type: 'redo' });
  });

  it('leaves host and browser keys alone', () => {
    for (const k of ['c', 'v', 'd', 'x', 'a']) expect(key(k, { meta: true })).toBeNull();
    expect(key('ArrowLeft', { meta: true })).toBeNull();
    expect(key('ArrowLeft', { alt: true })).toBeNull();
    expect(key('Tab')).toBeNull();
    expect(key('Delete', { shift: true })).toBeNull();
    expect(key('z')).toBeNull();
  });
});

function layoutWith(items: Partial<GridItem>[], rows = 6): Layout {
  return {
    breakpoints: ['desktop', 'mobile'],
    breakpointWidths: { mobile: 640 },
    breakpointPreviewWidths: {},
    sections: [
      {
        id: 's',
        columns: 12,
        colGap: 8,
        rowGap: 8,
        rows,
        items: items.map((item, i) => ({
          id: `i${i}`,
          kind: 'block',
          x: 0,
          y: 0,
          w: 2,
          h: 2,
          ...item,
        })),
      },
    ],
  };
}

const sel = (itemId: string) => ({ sectionId: 's', itemId });
const placed = (l: Layout, id = 'i0') => {
  const { x, y, w, h } = l.sections[0]!.items.find((i) => i.id === id)!;
  return { x, y, w, h };
};

describe('applyBlockAction', () => {
  it('moves by one cell and clamps at the section edges', () => {
    const layout = layoutWith([{ x: 0, y: 0 }]);
    const right = applyBlockAction(layout, sel('i0'), { type: 'move', dx: 1, dy: 0 }, 'desktop')!;
    expect(placed(right.layout)).toEqual({ x: 1, y: 0, w: 2, h: 2 });
    expect(right.item).toMatchObject({ x: 1, y: 0 });

    const left = applyBlockAction(layout, sel('i0'), { type: 'move', dx: -1, dy: 0 }, 'desktop')!;
    expect(left.layout).toBe(layout);

    const bottom = layoutWith([{ y: 4 }]);
    const down = applyBlockAction(bottom, sel('i0'), { type: 'move', dx: 0, dy: 1 }, 'desktop')!;
    expect(down.layout).toBe(bottom);
  });

  it('resizes from the top-left corner within the grid, never below one cell', () => {
    const layout = layoutWith([{ x: 10, y: 0, w: 2, h: 1 }]);
    const wider = applyBlockAction(layout, sel('i0'), { type: 'resize', dw: 1, dh: 0 }, 'desktop')!;
    expect(wider.layout).toBe(layout);
    const taller = applyBlockAction(
      layout,
      sel('i0'),
      { type: 'resize', dw: 0, dh: 1 },
      'desktop',
    )!;
    expect(placed(taller.layout)).toEqual({ x: 10, y: 0, w: 2, h: 2 });
    const shorter = applyBlockAction(
      layout,
      sel('i0'),
      { type: 'resize', dw: 0, dh: -1 },
      'desktop',
    )!;
    expect(shorter.layout).toBe(layout);
  });

  it('keeps full-bleed blocks horizontally fixed', () => {
    const layout = layoutWith([{ fullBleed: true, w: 12 }]);
    const moved = applyBlockAction(layout, sel('i0'), { type: 'move', dx: 1, dy: 0 }, 'desktop')!;
    expect(moved.layout).toBe(layout);
    const resized = applyBlockAction(
      layout,
      sel('i0'),
      { type: 'resize', dw: -1, dh: 0 },
      'desktop',
    )!;
    expect(resized.layout).toBe(layout);
  });

  it('writes a breakpoint override when not on desktop', () => {
    const layout = layoutWith([{ x: 0, y: 0 }]);
    const result = applyBlockAction(layout, sel('i0'), { type: 'move', dx: 0, dy: 1 }, 'mobile')!;
    expect(placed(result.layout)).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(result.layout.sections[0]!.overrides?.mobile?.items?.i0).toMatchObject({ y: 1 });
  });

  it('changes layering one step and stops at the ends', () => {
    const layout = layoutWith([{}, {}, {}]);
    const ids = (l: Layout) => l.sections[0]!.items.map((i) => i.id);
    const up = applyBlockAction(layout, sel('i0'), { type: 'bringForward' }, 'desktop')!;
    expect(ids(up.layout)).toEqual(['i1', 'i0', 'i2']);
    const down = applyBlockAction(layout, sel('i0'), { type: 'sendBackward' }, 'desktop')!;
    expect(down.layout).toBe(layout);
    const top = applyBlockAction(layout, sel('i2'), { type: 'bringForward' }, 'desktop')!;
    expect(top.layout).toBe(layout);
  });

  it('deletes the block', () => {
    const layout = layoutWith([{}, {}]);
    const result = applyBlockAction(layout, sel('i0'), { type: 'delete' }, 'desktop')!;
    expect(result.layout.sections[0]!.items.map((i) => i.id)).toEqual(['i1']);
    expect(result.item.id).toBe('i0');
  });

  it('ignores missing blocks and blocks hidden on the breakpoint', () => {
    const layout = layoutWith([{}]);
    expect(applyBlockAction(layout, sel('nope'), { type: 'delete' }, 'desktop')).toBeNull();
    const hidden: Layout = {
      ...layout,
      sections: [
        { ...layout.sections[0]!, overrides: { mobile: { items: { i0: { hidden: true } } } } },
      ],
    };
    expect(applyBlockAction(hidden, sel('i0'), { type: 'delete' }, 'mobile')).toBeNull();
  });
});

describe('reading order', () => {
  it('sorts by row, then column, then stacking order', () => {
    const entries = [
      { id: 'b', placement: { x: 6, y: 0, w: 1, h: 1, hidden: false } },
      { id: 'c', placement: { x: 0, y: 2, w: 1, h: 1, hidden: false } },
      { id: 'a', placement: { x: 0, y: 0, w: 1, h: 1, hidden: false } },
      { id: 'a2', placement: { x: 0, y: 0, w: 1, h: 1, hidden: false } },
      { id: 'bleed', fullBleed: true, placement: { x: 4, y: 1, w: 12, h: 1, hidden: false } },
    ];
    const sorted = sortByReadingOrder(entries);
    expect(sorted.map((e) => e.id)).toEqual(['a', 'a2', 'b', 'bleed', 'c']);
    expect(sorted.map((e) => e.stackIndex)).toEqual([2, 3, 0, 4, 1]);
  });

  it('lists visible blocks section by section for a breakpoint', () => {
    const layout = layoutWith([
      { x: 4, y: 0 },
      { x: 0, y: 0 },
    ]);
    layout.sections.push({
      ...layout.sections[0]!,
      id: 't',
      items: [{ id: 'j', kind: 'block', x: 0, y: 0, w: 1, h: 1 }],
    });
    layout.sections[0]!.overrides = { mobile: { items: { i0: { hidden: true } } } };
    expect(blocksInReadingOrder(layout, 'desktop').map((r) => r.itemId)).toEqual(['i1', 'i0', 'j']);
    expect(blocksInReadingOrder(layout, 'mobile').map((r) => r.itemId)).toEqual(['i1', 'j']);
  });
});
