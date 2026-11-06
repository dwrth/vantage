import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { closestRowForOffset, getRowStart, snapSectionRows } from './rowMetrics';

const RUNS = { numRuns: 150, seed: 20261105 };

const arbHeights = fc.array(fc.integer({ min: 1, max: 120 }), { maxLength: 12 });
const arbStep = fc.integer({ min: 1, max: 120 });
const arbCoarseStep = fc.integer({ min: 120, max: 200 });

describe('getRowStart', () => {
  it('grows strictly with the row count', () => {
    fc.assert(
      fc.property(arbHeights, arbStep, fc.nat({ max: 20 }), (heights, step, row) => {
        expect(getRowStart(row + 1, heights, step)).toBeGreaterThan(
          getRowStart(row, heights, step),
        );
        expect(getRowStart(row + 1, heights, step) - getRowStart(row, heights, step)).toBe(
          heights[row] ?? step,
        );
      }),
      RUNS,
    );
  });

  it('starts at 0 for row 0 and below', () => {
    expect(getRowStart(0, [10], 5)).toBe(0);
    expect(getRowStart(-3, [10], 5)).toBe(0);
  });

  it('uses the fallback step for holes in the measured rows', () => {
    // eslint-disable-next-line no-sparse-arrays
    expect(getRowStart(3, [10, , 30], 7)).toBe(47);
  });
});

describe('closestRowForOffset', () => {
  it('finds a row again from its start offset', () => {
    fc.assert(
      fc.property(arbHeights, arbStep, fc.nat({ max: 20 }), (heights, step, row) => {
        expect(closestRowForOffset(getRowStart(row, heights, step), heights, step)).toBe(row);
      }),
      RUNS,
    );
  });

  it('never moves up as the offset grows when no measured row is taller than the fallback', () => {
    fc.assert(
      fc.property(
        arbHeights,
        arbCoarseStep,
        fc.array(fc.integer({ min: -100, max: 3000 }), { minLength: 2, maxLength: 10 }),
        (heights, step, offsets) => {
          const rows = [...offsets]
            .sort((a, b) => a - b)
            .map((offset) => closestRowForOffset(offset, heights, step));
          for (let k = 1; k < rows.length; k += 1) {
            expect(rows[k]).toBeGreaterThanOrEqual(rows[k - 1]!);
          }
          expect(rows[0]).toBeGreaterThanOrEqual(0);
        },
      ),
      RUNS,
    );
  });

  it('is row 0 without a positive fallback step', () => {
    expect(closestRowForOffset(500, [10, 10], 0)).toBe(0);
    expect(closestRowForOffset(500, [10, 10], -4)).toBe(0);
  });

  it.fails(
    'never moves up past the last measured row when that row is taller than the fallback',
    () => {
      expect(closestRowForOffset(3, [6], 1)).toBe(0);
      expect(closestRowForOffset(4, [6], 1)).toBeGreaterThanOrEqual(0);
    },
  );

  it('uses the fallback step for holes in the measured rows', () => {
    // eslint-disable-next-line no-sparse-arrays
    expect(closestRowForOffset(39, [10, , 30], 20)).toBe(2);
  });
});

describe('snapSectionRows', () => {
  it('never drops below the minimum and grows with the drag distance', () => {
    fc.assert(
      fc.property(
        arbHeights,
        arbCoarseStep,
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 4 }),
        fc.integer({ min: -1500, max: 1500 }),
        fc.integer({ min: -1500, max: 1500 }),
        (heights, step, startRows, minRows, a, b) => {
          const [small, large] = a <= b ? [a, b] : [b, a];
          const low = snapSectionRows(startRows, small, heights, step, minRows);
          const high = snapSectionRows(startRows, large, heights, step, minRows);
          expect(low).toBeGreaterThanOrEqual(minRows);
          expect(high).toBeGreaterThanOrEqual(low);
          expect(snapSectionRows(startRows, 0, heights, step, minRows)).toBe(
            Math.max(minRows, startRows),
          );
        },
      ),
      RUNS,
    );
  });

  it.fails('keeps more rows when the bottom edge is dragged up less far', () => {
    const rows = (dy: number) => snapSectionRows(3, dy, [10, 10, 100], 5, 1);
    expect(rows(-20)).toBeGreaterThanOrEqual(rows(-60));
  });
});
