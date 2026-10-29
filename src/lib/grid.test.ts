import { describe, expect, it } from 'vitest';
import type { GridItem } from '../types';
import {
  CELL_MAX_PX,
  clampItem,
  deltaToGrid,
  getCellWidth,
  getCellXStep,
  getFlexRowHeight,
  getGridContentOffset,
  getGridContentWidth,
  itemsAtPointer,
  nextSlot,
  overlaps,
  pointerHitsItem,
  pxToCell,
  resizeByHandle,
  resizeEdgeAxes,
} from './grid';

function item(id: string, x: number, y: number, w: number, h: number): GridItem {
  return { id, x, y, w, h, kind: 'block' };
}

const rect = (left: number, top: number) => ({ left, top }) as DOMRect;

describe('pxToCell', () => {
  it('rounds to the nearest cell symmetrically around zero', () => {
    expect(pxToCell(49, 100)).toBe(0);
    expect(pxToCell(50, 100)).toBe(1);
    expect(pxToCell(-50, 100)).toBe(-1);
    expect(pxToCell(-149, 100)).toBe(-1);
  });

  it('returns 0 for a collapsed cell size', () => {
    expect(pxToCell(500, 0)).toBe(0);
    expect(pxToCell(500, -1)).toBe(0);
  });

  it('deltaToGrid snaps both axes with their own step', () => {
    expect(deltaToGrid(210, -95, 100, 50)).toEqual({ dx: 2, dy: -2 });
  });
});

describe('grid sizing', () => {
  it('caps content width at columns * cell max and leaves a gap on each side', () => {
    expect(getGridContentWidth(2000, 12, 8)).toBe(12 * CELL_MAX_PX);
    expect(getGridContentWidth(500, 12, 8)).toBe(484);
    expect(getGridContentWidth(10, 12, 8)).toBe(0);
  });

  it('centers capped content', () => {
    expect(getGridContentOffset(2000, 12, 8)).toBe((2000 - 12 * CELL_MAX_PX) / 2);
    expect(getGridContentOffset(500, 12, 8)).toBe(8);
  });

  it('splits content into cells minus gaps, and rows follow the cell aspect', () => {
    // 4 columns at 400px wide: 384 inner, 3 gaps of 8 → 90px cells.
    expect(getCellWidth(400, 4, 8)).toBe(90);
    expect(getFlexRowHeight(400, 4, 8, 48, 96)).toBe(45);
    expect(getCellWidth(400, 0, 8)).toBe(0);
    expect(getCellXStep(90, 8)).toBe(98);
    expect(getCellXStep(0, 8)).toBe(0);
  });
});

describe('clampItem', () => {
  it('shrinks too-wide items and shifts them back inside the columns', () => {
    expect(clampItem({ x: 10, y: 0, w: 4, h: 1 }, 12)).toEqual({ x: 8, y: 0, w: 4, h: 1 });
    expect(clampItem({ x: 3, y: 0, w: 20, h: 1 }, 12)).toEqual({ x: 0, y: 0, w: 12, h: 1 });
  });

  it('keeps size and position at least 1 / 0', () => {
    expect(clampItem({ x: -2, y: -3, w: 0, h: -1 }, 12)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it('leaves y and h unbounded without rows', () => {
    expect(clampItem({ x: 0, y: 99, w: 1, h: 50 }, 12)).toEqual({ x: 0, y: 99, w: 1, h: 50 });
  });
});

describe('resizeByHandle', () => {
  const start = { x: 2, y: 2, w: 4, h: 3 };

  it('maps every edge to the sides it moves', () => {
    expect(resizeEdgeAxes('se')).toEqual({ moveE: true, moveW: false, moveN: false, moveS: true });
    expect(resizeEdgeAxes('nw')).toEqual({ moveE: false, moveW: true, moveN: true, moveS: false });
    expect(resizeEdgeAxes('n')).toEqual({ moveE: false, moveW: false, moveN: true, moveS: false });
  });

  it('grows east and south from a fixed top-left corner', () => {
    expect(resizeByHandle(start, 'se', 2, 1, 12)).toEqual({ x: 2, y: 2, w: 6, h: 4 });
  });

  it('moves the west and north sides while the opposite edges stay put', () => {
    expect(resizeByHandle(start, 'nw', -1, -1, 12)).toEqual({ x: 1, y: 1, w: 5, h: 4 });
    expect(resizeByHandle(start, 'w', 3, 0, 12)).toEqual({ x: 5, y: 2, w: 1, h: 3 });
  });

  it('never collapses below one cell or crosses the opposite edge', () => {
    expect(resizeByHandle(start, 'e', -10, 0, 12)).toMatchObject({ x: 2, w: 1 });
    expect(resizeByHandle(start, 'n', 0, 10, 12)).toMatchObject({ y: 4, h: 1 });
  });

  it('stops at the grid edges', () => {
    expect(resizeByHandle(start, 'e', 20, 0, 12)).toMatchObject({ x: 2, w: 10 });
    expect(resizeByHandle(start, 'w', -20, 0, 12)).toMatchObject({ x: 0, w: 6 });
    expect(resizeByHandle(start, 'n', 0, -20, 12)).toMatchObject({ y: 0, h: 5 });
  });

  it('stops the south edge at the section rows', () => {
    expect(resizeByHandle(start, 's', 0, 10, 12, 6)).toMatchObject({ y: 2, h: 4 });
    expect(resizeByHandle(start, 's', 0, 10, 12)).toMatchObject({ y: 2, h: 13 });
  });

  it('ignores the vertical delta on side handles', () => {
    expect(resizeByHandle(start, 'e', 1, 5, 12)).toEqual({ x: 2, y: 2, w: 5, h: 3 });
  });
});

describe('overlaps / nextSlot', () => {
  it('detects shared cells but not touching edges', () => {
    const a = item('a', 0, 0, 2, 2);
    expect(overlaps(a, item('b', 1, 1, 2, 2))).toBe(true);
    expect(overlaps(a, item('c', 2, 0, 2, 2))).toBe(false);
    expect(overlaps(a, item('d', 0, 2, 2, 2))).toBe(false);
  });

  it('places the next item below the lowest bottom edge', () => {
    expect(nextSlot([])).toEqual({ x: 0, y: 0 });
    expect(nextSlot([item('a', 4, 0, 2, 3), item('b', 0, 1, 2, 1)])).toEqual({ x: 0, y: 3 });
  });
});

describe('pointer hit testing', () => {
  // 100px cells, 10px gaps, 50px rows; container at (20, 30), content offset (5, 0).
  const geom = [100, 110, 10, 50, 10, 5, 0] as const;
  const hits = (x: number, y: number, it: GridItem) =>
    pointerHitsItem(x, y, rect(20, 30), it, ...geom);

  it('hits inside the item box and misses the gap after it', () => {
    const a = item('a', 1, 1, 2, 1); // left 115, top 60, width 210, height 50
    expect(hits(20 + 115, 30 + 60, a)).toBe(true);
    expect(hits(20 + 324, 30 + 109, a)).toBe(true);
    expect(hits(20 + 325, 30 + 60, a)).toBe(false);
    expect(hits(20 + 114, 30 + 60, a)).toBe(false);
    expect(hits(20 + 115, 30 + 110, a)).toBe(false);
  });

  it('lists stacked items top-most (last in the array) first', () => {
    const items = [item('under', 0, 0, 3, 3), item('miss', 5, 5, 1, 1), item('over', 0, 0, 1, 1)];
    const found = itemsAtPointer(20 + 10, 30 + 10, rect(20, 30), items, ...geom);
    expect(found.map((i) => i.id)).toEqual(['over', 'under']);
  });
});
