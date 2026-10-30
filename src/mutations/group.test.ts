import { describe, expect, it } from 'vitest';
import { resolveItem } from '../lib/breakpoint';
import type { GridItem, Layout, Section } from '../types';
import { alignItems, groupBounds, groupMoveRange, moveItems, removeItems } from './group';

const item = (id: string, x: number, y: number, w = 2, h = 1, extra: Partial<GridItem> = {}) => ({
  id,
  kind: 'block',
  x,
  y,
  w,
  h,
  ...extra,
});

function layoutWith(items: GridItem[], extra: Partial<Section> = {}): Layout {
  return {
    breakpoints: ['desktop', 'tablet', 'mobile'],
    breakpointWidths: {},
    breakpointPreviewWidths: {},
    sections: [{ id: 's', columns: 12, colGap: 8, rowGap: 8, rows: 6, items, ...extra }],
  };
}

const at = (layout: Layout, id: string, bp: 'desktop' | 'tablet' | 'mobile' = 'desktop') => {
  const section = layout.sections[0]!;
  const { x, y, w, h } = resolveItem(section.items.find((i) => i.id === id)!, section, bp);
  return { x, y, w, h };
};

describe('groupMoveRange / groupBounds', () => {
  it('limits the group by its outermost blocks', () => {
    const layout = layoutWith([item('a', 1, 0), item('b', 6, 3, 4, 2)]);
    const section = layout.sections[0]!;
    expect(groupMoveRange(section, ['a', 'b'], 'desktop')).toEqual({
      minDx: -1,
      maxDx: 2,
      minDy: 0,
      maxDy: 1,
    });
    expect(groupBounds(section, ['a', 'b'], 'desktop')).toEqual({ x: 1, y: 0, w: 9, h: 5 });
  });

  it('ignores blocks hidden at the breakpoint and returns null when none is shown', () => {
    const layout = layoutWith([item('a', 1, 0, 2, 1, { hidden: true }), item('b', 6, 3)]);
    const section = layout.sections[0]!;
    expect(groupBounds(section, ['a', 'b'], 'desktop')).toEqual({ x: 6, y: 3, w: 2, h: 1 });
    expect(groupMoveRange(section, ['a'], 'desktop')).toBeNull();
    // Desktop `hidden` is not inherited by tablet.
    expect(groupBounds(section, ['a', 'b'], 'tablet')).not.toBeNull();
  });
});

describe('moveItems', () => {
  it('moves every block by the same delta and keeps their relative positions', () => {
    const layout = layoutWith([item('a', 1, 0), item('b', 4, 2), item('c', 9, 5)]);
    const next = moveItems(layout, 's', ['a', 'b'], 2, 1);
    expect(at(next, 'a')).toMatchObject({ x: 3, y: 1 });
    expect(at(next, 'b')).toMatchObject({ x: 6, y: 3 });
    expect(at(next, 'c')).toMatchObject({ x: 9, y: 5 });
  });

  it('clamps the delta as a unit at the section edges', () => {
    const layout = layoutWith([item('a', 1, 0), item('b', 8, 4)]);
    // b stops at the right edge (x 10) and the bottom (rows 6): a stops two columns later too.
    const next = moveItems(layout, 's', ['a', 'b'], 5, 5);
    expect(at(next, 'a')).toMatchObject({ x: 3, y: 1 });
    expect(at(next, 'b')).toMatchObject({ x: 10, y: 5 });
    const left = moveItems(layout, 's', ['a', 'b'], -5, -5);
    expect(at(left, 'a')).toMatchObject({ x: 0, y: 0 });
    expect(at(left, 'b')).toMatchObject({ x: 7, y: 4 });
  });

  it('never grows the section', () => {
    const layout = layoutWith([item('a', 0, 4, 2, 2), item('b', 4, 0)]);
    const next = moveItems(layout, 's', ['a', 'b'], 0, 3);
    expect(next).toBe(layout);
  });

  it('returns the same layout when nothing moves', () => {
    const layout = layoutWith([item('a', 0, 0), item('b', 4, 0)]);
    expect(moveItems(layout, 's', ['a', 'b'], 0, 0)).toBe(layout);
    expect(moveItems(layout, 's', ['a', 'b'], -1, -1)).toBe(layout);
    expect(moveItems(layout, 'missing', ['a'], 1, 1)).toBe(layout);
  });

  it('moves full-bleed blocks only vertically', () => {
    const layout = layoutWith([item('a', 0, 0, 12, 1, { fullBleed: true }), item('b', 4, 2)]);
    const next = moveItems(layout, 's', ['a', 'b'], 3, 1);
    expect(at(next, 'a')).toMatchObject({ x: 0, y: 1 });
    expect(at(next, 'b')).toMatchObject({ x: 7, y: 3 });
  });

  it('writes the breakpoint override off desktop and leaves desktop alone', () => {
    const layout = layoutWith([item('a', 0, 0), item('b', 4, 2)]);
    const next = moveItems(layout, 's', ['a', 'b'], 1, 1, 'tablet');
    expect(at(next, 'a', 'tablet')).toMatchObject({ x: 1, y: 1 });
    expect(at(next, 'b', 'tablet')).toMatchObject({ x: 5, y: 3 });
    expect(at(next, 'a')).toMatchObject({ x: 0, y: 0 });
    expect(next.sections[0]!.overrides?.tablet?.items?.b).toMatchObject({ x: 5, y: 3 });
  });

  it('leaves blocks hidden at the breakpoint in place', () => {
    const layout = layoutWith([item('a', 0, 0, 2, 1, { hidden: true }), item('b', 4, 2)]);
    const next = moveItems(layout, 's', ['a', 'b'], 1, 0);
    expect(at(next, 'a')).toMatchObject({ x: 0, y: 0 });
    expect(at(next, 'b')).toMatchObject({ x: 5, y: 2 });
  });
});

describe('alignItems', () => {
  const layout = layoutWith([item('a', 1, 0, 2, 1), item('b', 5, 2, 4, 3), item('c', 0, 5)]);
  const ids = ['a', 'b'];

  it.each([
    ['left', { x: 1, y: 0 }, { x: 1, y: 2 }],
    ['right', { x: 7, y: 0 }, { x: 5, y: 2 }],
    ['center', { x: 4, y: 0 }, { x: 3, y: 2 }],
    ['top', { x: 1, y: 0 }, { x: 5, y: 0 }],
    ['bottom', { x: 1, y: 4 }, { x: 5, y: 2 }],
    ['middle', { x: 1, y: 2 }, { x: 5, y: 1 }],
  ] as const)('%s aligns to the bounding box', (alignment, a, b) => {
    const next = alignItems(layout, 's', ids, alignment);
    expect(at(next, 'a')).toMatchObject(a);
    expect(at(next, 'b')).toMatchObject(b);
    // Sizes stay; blocks outside the group stay.
    expect(at(next, 'b')).toMatchObject({ w: 4, h: 3 });
    expect(at(next, 'c')).toMatchObject({ x: 0, y: 5 });
  });

  it('returns the same layout for one block or when already aligned', () => {
    expect(alignItems(layout, 's', ['a'], 'right')).toBe(layout);
    const aligned = alignItems(layout, 's', ids, 'left');
    expect(alignItems(aligned, 's', ids, 'left')).toBe(aligned);
  });

  it('ignores full-bleed blocks for horizontal alignment', () => {
    const withBleed = layoutWith([
      item('a', 1, 0, 12, 1, { fullBleed: true }),
      item('b', 5, 2),
      item('c', 3, 4),
    ]);
    const next = alignItems(withBleed, 's', ['a', 'b', 'c'], 'right');
    expect(at(next, 'b')).toMatchObject({ x: 5 });
    expect(at(next, 'c')).toMatchObject({ x: 5 });
    expect(withBleed.sections[0]!.items[0]).toMatchObject({ x: 1 });
    const top = alignItems(withBleed, 's', ['a', 'b'], 'top');
    expect(at(top, 'b')).toMatchObject({ y: 0 });
  });

  it('aligns the breakpoint placement and writes overrides off desktop', () => {
    const base = layoutWith([item('a', 0, 0), item('b', 4, 2)]);
    const tablet = moveItems(base, 's', ['b'], 2, 0, 'tablet');
    const next = alignItems(tablet, 's', ['a', 'b'], 'right', 'tablet');
    expect(at(next, 'a', 'tablet')).toMatchObject({ x: 6 });
    expect(at(next, 'a')).toMatchObject({ x: 0 });
  });
});

describe('removeItems', () => {
  it('removes every block and its overrides in one layout', () => {
    const base = layoutWith([item('a', 0, 0), item('b', 4, 2), item('c', 8, 0)]);
    const withOverride = moveItems(base, 's', ['a'], 1, 1, 'mobile');
    const next = removeItems(withOverride, 's', ['a', 'b']);
    expect(next.sections[0]!.items.map((i) => i.id)).toEqual(['c']);
    expect(next.sections[0]!.overrides?.mobile?.items?.a).toBeUndefined();
  });

  it('returns the same layout when none of the blocks exists', () => {
    const base = layoutWith([item('a', 0, 0)]);
    expect(removeItems(base, 's', ['x'])).toBe(base);
  });
});
