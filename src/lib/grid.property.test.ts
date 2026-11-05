import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbRect } from '../test/arbitraries';
import {
  clampItem,
  getFlexRowHeight,
  overlaps,
  pxToCell,
  resizeByHandle,
  resizeFloor,
  type PlacementRect,
  type ResizeEdge,
} from './grid';

const RUNS = { numRuns: 150, seed: 20261105 };

const arbAnyRect: fc.Arbitrary<PlacementRect> = fc.record({
  x: fc.integer({ min: -20, max: 40 }),
  y: fc.integer({ min: -20, max: 40 }),
  w: fc.integer({ min: -3, max: 30 }),
  h: fc.integer({ min: -3, max: 30 }),
});

const arbColumns = fc.integer({ min: 1, max: 24 });
const arbRows = fc.option(fc.integer({ min: 1, max: 30 }), { nil: undefined });

function inBounds(rect: PlacementRect, columns: number, rows?: number) {
  expect(rect.w).toBeGreaterThanOrEqual(1);
  expect(rect.h).toBeGreaterThanOrEqual(1);
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.y).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.w).toBeLessThanOrEqual(columns);
  if (rows !== undefined) expect(rect.y + rect.h).toBeLessThanOrEqual(rows);
}

const cells = (r: PlacementRect) =>
  Array.from({ length: Math.max(0, r.w) * Math.max(0, r.h) }, (_, k) => [
    r.x + (k % r.w),
    r.y + Math.floor(k / r.w),
  ]);

describe('clampItem', () => {
  it('lands inside the grid and is idempotent', () => {
    fc.assert(
      fc.property(arbAnyRect, arbColumns, arbRows, (rect, columns, rows) => {
        const once = clampItem(rect, columns, rows);
        inBounds(once, columns, rows);
        expect(clampItem(once, columns, rows)).toEqual(once);
      }),
      RUNS,
    );
  });

  it('leaves a block that already fits untouched', () => {
    fc.assert(
      fc.property(
        arbColumns.chain((columns) => fc.tuple(fc.constant(columns), arbRect(columns, 6, 10))),
        ([columns, rect]) => {
          expect(clampItem(rect, columns)).toEqual(rect);
          expect(clampItem(rect, columns, rect.y + rect.h)).toEqual(rect);
        },
      ),
      RUNS,
    );
  });
});

describe('resizeByHandle', () => {
  const edges: ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  it('stays inside the grid, keeps the opposite edges and respects the floor', () => {
    fc.assert(
      fc.property(
        arbColumns.chain((columns) =>
          fc.record({
            columns: fc.constant(columns),
            start: arbRect(columns, 6, 10),
            extraRows: fc.option(fc.nat({ max: 5 }), { nil: undefined }),
            edge: fc.constantFrom(...edges),
            dw: fc.integer({ min: -30, max: 30 }),
            dh: fc.integer({ min: -30, max: 30 }),
            minSize: fc.option(
              fc.record({ w: fc.integer({ min: 1, max: 8 }), h: fc.integer({ min: 1, max: 8 }) }),
              { nil: undefined },
            ),
          }),
        ),
        ({ columns, start, extraRows, edge, dw, dh, minSize }) => {
          const rows = extraRows === undefined ? undefined : start.y + start.h + extraRows;
          const next = resizeByHandle(start, edge, dw, dh, columns, rows, minSize);
          inBounds(next, columns, rows);
          const floor = resizeFloor(start, minSize);
          expect(next.w).toBeGreaterThanOrEqual(floor.w);
          expect(next.h).toBeGreaterThanOrEqual(floor.h);
          if (!edge.includes('w')) expect(next.x).toBe(start.x);
          if (!edge.includes('e')) expect(next.x + next.w).toBe(start.x + start.w);
          if (!edge.includes('n')) expect(next.y).toBe(start.y);
          if (!edge.includes('s')) expect(next.y + next.h).toBe(start.y + start.h);
        },
      ),
      RUNS,
    );
  });
});

describe('overlaps', () => {
  it('is symmetric and true exactly when the rects share a cell', () => {
    const arbSmall = fc.record({
      x: fc.integer({ min: 0, max: 6 }),
      y: fc.integer({ min: 0, max: 6 }),
      w: fc.integer({ min: 1, max: 4 }),
      h: fc.integer({ min: 1, max: 4 }),
    });
    fc.assert(
      fc.property(arbSmall, arbSmall, (a, b) => {
        const bCells = new Set(cells(b).map(([x, y]) => `${x},${y}`));
        const shared = cells(a).some(([x, y]) => bCells.has(`${x},${y}`));
        expect(overlaps(a, b)).toBe(shared);
        expect(overlaps(b, a)).toBe(shared);
      }),
      RUNS,
    );
  });
});

describe('pxToCell', () => {
  it('is odd and never further than half a cell from the pointer', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -2000, max: 2000, noNaN: true }),
        fc.double({ min: 1, max: 200, noNaN: true }),
        (px, cell) => {
          const snapped = pxToCell(px, cell);
          expect(pxToCell(-px, cell) + snapped).toBe(0);
          expect(Math.abs(snapped * cell - px)).toBeLessThanOrEqual(cell / 2 + 1e-9);
        },
      ),
      RUNS,
    );
  });
});

describe('getFlexRowHeight', () => {
  it('is zero without a positive cell maximum', () => {
    expect(getFlexRowHeight(1200, 12, 8, 48, 0)).toBe(0);
    expect(getFlexRowHeight(1200, 12, 8, 48, -1)).toBe(0);
  });
});
