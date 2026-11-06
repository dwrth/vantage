import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { validateLayout } from '../lib/validate';
import { arbLayout, arbRect, packRects } from './arbitraries';
import {
  allItemIds,
  arrangementViolations,
  columnBoundsViolations,
  danglingOverrideKeys,
  overlapViolations,
  rectsShareCell,
} from './layoutInvariants';

const RUNS = { numRuns: 200, seed: 1105 };

describe('test arbitraries', () => {
  it('pack rects without shared cells and keep their columns and sizes', () => {
    fc.assert(
      fc.property(fc.array(arbRect(8), { maxLength: 10 }), (rects) => {
        const packed = packRects(rects);
        packed.forEach((rect, i) => {
          expect({ ...rect, y: 0 }).toEqual({ ...rects[i]!, y: 0 });
          expect(rect.y).toBeGreaterThanOrEqual(rects[i]!.y);
          for (const other of packed.slice(i + 1)) {
            expect(rectsShareCell({ id: 'a', ...rect }, { id: 'b', ...other })).toBe(false);
          }
        });
      }),
      RUNS,
    );
  });

  it('generate valid, overlap-free, in-bounds layouts with unique ids', () => {
    fc.assert(
      fc.property(arbLayout({ arrangements: 0.4 }), (layout) => {
        expect(validateLayout(layout).errors).toEqual([]);
        expect(overlapViolations(layout)).toEqual([]);
        expect(columnBoundsViolations(layout)).toEqual([]);
        expect(danglingOverrideKeys(layout)).toEqual([]);
        expect(arrangementViolations(layout)).toEqual([]);
        const ids = allItemIds(layout);
        expect(new Set(ids).size).toBe(ids.length);
      }),
      RUNS,
    );
  });
});
