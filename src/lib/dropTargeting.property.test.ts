import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { edgeScrollSpeed, gridCellAt, sectionAtY, type GridGeometry } from './dropTargeting';

const RUNS = { numRuns: 150, seed: 20261105 };

const arbGeometry: fc.Arbitrary<GridGeometry> = fc.record({
  rect: fc.record({
    left: fc.integer({ min: -500, max: 500 }),
    top: fc.integer({ min: -2000, max: 2000 }),
  }),
  contentOffsetX: fc.integer({ min: 0, max: 200 }),
  contentOffsetY: fc.integer({ min: 0, max: 200 }),
  columns: fc.integer({ min: 1, max: 24 }),
  rows: fc.integer({ min: 1, max: 30 }),
  cellXStep: fc.integer({ min: 0, max: 120 }),
  cellHeight: fc.integer({ min: 0, max: 80 }),
  rowSteps: fc.option(fc.array(fc.integer({ min: 1, max: 120 }), { maxLength: 30 }), {
    nil: null,
  }),
});

const arbClient = fc.double({ min: -5000, max: 5000, noNaN: true });

describe('gridCellAt', () => {
  it('returns an in-bounds cell for any pointer position and block size', () => {
    fc.assert(
      fc.property(
        arbGeometry,
        arbClient,
        arbClient,
        fc.integer({ min: -2, max: 40 }),
        fc.integer({ min: -2, max: 40 }),
        (geometry, left, top, w, h) => {
          const cell = gridCellAt(geometry, left, top, w, h);
          expect(Number.isInteger(cell.x) && Number.isInteger(cell.y)).toBe(true);
          expect(cell.w).toBe(Math.max(1, Math.min(w, geometry.columns)));
          expect(cell.h).toBe(Math.max(1, Math.min(h, geometry.rows)));
          expect(cell.x).toBeGreaterThanOrEqual(0);
          expect(cell.y).toBeGreaterThanOrEqual(0);
          expect(cell.x + cell.w).toBeLessThanOrEqual(geometry.columns);
          expect(cell.y + cell.h).toBeLessThanOrEqual(geometry.rows);
        },
      ),
      RUNS,
    );
  });

  it('lands in column 0 when the columns have no width', () => {
    const geometry: GridGeometry = {
      rect: { left: 0, top: 0 },
      contentOffsetX: 0,
      contentOffsetY: 0,
      columns: 6,
      rows: 4,
      cellXStep: 0,
      cellHeight: 0,
      rowSteps: null,
    };
    expect(gridCellAt(geometry, 300, 300, 1, 1)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });
});

describe('sectionAtY', () => {
  it('always picks a section, and the one whose grid holds the point', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: 0, max: 200 }), fc.integer({ min: 1, max: 300 })), {
          minLength: 1,
          maxLength: 6,
        }),
        fc.shuffledSubarray([0, 1, 2, 3, 4, 5]),
        fc.integer({ min: -500, max: 3000 }),
        (spans, order, y) => {
          let cursor = 0;
          const bands = spans.map(([gap, height], index) => {
            const top = cursor + gap;
            cursor = top + height;
            return { sectionId: `s${index}`, top, bottom: cursor };
          });
          const shuffled = [
            ...order.filter((i) => i < bands.length).map((i) => bands[i]!),
            ...bands.filter((_, i) => !order.includes(i)),
          ];
          const hit = sectionAtY(y, shuffled);
          const inside = bands.find((b) => y >= b.top && y < b.bottom);
          const firstBelow = bands.find((b) => y < b.bottom);
          expect(hit).toBe((inside ?? firstBelow ?? bands.at(-1)!).sectionId);
        },
      ),
      RUNS,
    );
  });
});

describe('edgeScrollSpeed', () => {
  it('stays within the maximum and points towards the nearer edge', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 1500 }),
        fc.double({ min: -500, max: 3000, noNaN: true }),
        (top, height, y) => {
          const bottom = top + height;
          const speed = edgeScrollSpeed(y, top, bottom);
          expect(Math.abs(speed)).toBeLessThanOrEqual(2);
          if (speed < 0) expect(y).toBeLessThan(top + height / 2);
          if (speed > 0) expect(y).toBeGreaterThan(top + height / 2);
        },
      ),
      RUNS,
    );
  });

  it('does not scroll an area without height', () => {
    expect(edgeScrollSpeed(10, 100, 100)).toBe(0);
    expect(edgeScrollSpeed(10, 100, 50)).toBe(0);
  });
});
