import { describe, expect, it } from 'vitest';
import type { GridItem, Layout } from '../types';
import { resizeByHandle, resizeFloor, resolveMinSize, rowsForHeight } from './grid';
import { applyBlockAction } from './keyboard';

describe('rowsForHeight', () => {
  // 40px rows + 8px gap: 1 row = 40px, 2 rows = 88px, 3 rows = 136px.
  it('rounds content height up to whole rows at the base row height', () => {
    expect(rowsForHeight(40, 48, 8)).toBe(1);
    expect(rowsForHeight(41, 48, 8)).toBe(2);
    expect(rowsForHeight(88, 48, 8)).toBe(2);
    expect(rowsForHeight(89, 48, 8)).toBe(3);
  });

  it('falls back to one row without a usable height or grid', () => {
    expect(rowsForHeight(0, 48, 8)).toBe(1);
    expect(rowsForHeight(100, 0, 8)).toBe(1);
  });
});

describe('resolveMinSize', () => {
  const grid = { columns: 4, cellHeight: 48, rowGap: 8 };

  it('takes the larger of rows and measured px, and caps columns at the grid', () => {
    expect(resolveMinSize({ w: 6, h: 2, heightPx: 130 }, grid)).toEqual({ w: 4, h: 3 });
    expect(resolveMinSize({ h: 5, heightPx: 30 }, grid)).toEqual({ w: 1, h: 5 });
  });

  it('is one cell without a minimum', () => {
    expect(resolveMinSize(undefined, grid)).toEqual({ w: 1, h: 1 });
    expect(resolveMinSize(null, grid)).toEqual({ w: 1, h: 1 });
  });
});

describe('resizeByHandle with a content minimum', () => {
  const start = { x: 2, y: 2, w: 4, h: 4 };
  const min = { w: 3, h: 3 };

  it('stops shrinking at the minimum on every edge', () => {
    expect(resizeByHandle(start, 'e', -10, 0, 12, undefined, min)).toMatchObject({ x: 2, w: 3 });
    expect(resizeByHandle(start, 'w', 10, 0, 12, undefined, min)).toMatchObject({ x: 3, w: 3 });
    expect(resizeByHandle(start, 's', 0, -10, 12, undefined, min)).toMatchObject({ y: 2, h: 3 });
    expect(resizeByHandle(start, 'n', 0, 10, 12, undefined, min)).toMatchObject({ y: 3, h: 3 });
    expect(resizeByHandle(start, 'nw', 10, 10, 12, undefined, min)).toEqual({
      x: 3,
      y: 3,
      w: 3,
      h: 3,
    });
  });

  it('still grows freely', () => {
    expect(resizeByHandle(start, 'se', 2, 2, 12, undefined, min)).toEqual({
      x: 2,
      y: 2,
      w: 6,
      h: 6,
    });
  });

  it('keeps a block already below its minimum from shrinking further, without forcing it up', () => {
    const small = { x: 0, y: 0, w: 2, h: 2 };
    expect(resizeFloor(small, { w: 5, h: 5 })).toEqual({ w: 2, h: 2 });
    expect(resizeByHandle(small, 'se', -1, -1, 12, undefined, { w: 5, h: 5 })).toEqual(small);
    expect(resizeByHandle(small, 'se', 1, 0, 12, undefined, { w: 5, h: 5 })).toMatchObject({
      w: 3,
      h: 2,
    });
  });
});

function layoutWith(items: Partial<GridItem>[]): Layout {
  return {
    breakpoints: ['desktop', 'tablet', 'mobile'],
    breakpointWidths: { mobile: 640, tablet: 1023 },
    breakpointPreviewWidths: {},
    sections: [
      {
        id: 's',
        columns: 12,
        colGap: 8,
        rowGap: 8,
        rows: 10,
        items: items.map((item, i) => ({
          id: `i${i}`,
          kind: 'block',
          x: 0,
          y: 0,
          w: 4,
          h: 4,
          ...item,
        })),
        overrides: { mobile: { columns: 4, items: { i0: { x: 0, y: 0, w: 4, h: 4 } } } },
      },
    ],
  };
}

describe('applyBlockAction with a content minimum', () => {
  const sel = { sectionId: 's', itemId: 'i0' };
  const shrink = { type: 'resize', dw: -1, dh: -1 } as const;

  it('stops Shift+arrow shrinking at the minimum on desktop', () => {
    const layout = layoutWith([{}]);
    const once = applyBlockAction(layout, sel, shrink, 'desktop', { minSize: { w: 3, h: 3 } })!;
    expect(once.item).toMatchObject({ w: 3, h: 3 });
    const twice = applyBlockAction(once.layout, sel, shrink, 'desktop', {
      minSize: { w: 3, h: 3 },
    })!;
    expect(twice.layout).toBe(once.layout);
  });

  it('applies on other breakpoints, writing their override', () => {
    const layout = layoutWith([{}]);
    const result = applyBlockAction(layout, sel, shrink, 'mobile', { minSize: { w: 4, h: 4 } })!;
    expect(result.layout).toBe(layout);
    const grown = applyBlockAction(layout, sel, { type: 'resize', dw: 0, dh: 1 }, 'mobile', {
      minSize: { w: 4, h: 4 },
    })!;
    expect(grown.layout.sections[0]!.overrides!.mobile!.items!.i0).toMatchObject({ h: 5 });
    expect(grown.layout.sections[0]!.items[0]).toMatchObject({ h: 4 });
  });
});
