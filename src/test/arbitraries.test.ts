import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { validateLayout } from '../lib/validate';
import { getEnabledBreakpoints } from '../lib/breakpoint';
import { arbLayout } from './arbitraries';
import {
  allItemIds,
  arrangementViolations,
  columnBoundsViolations,
  danglingOverrideKeys,
  rectsShareCell,
  visibleRects,
} from './layoutInvariants';

const RUNS = { numRuns: 200, seed: 1105 };

describe('test arbitraries', () => {
  it('generate valid, in-bounds layouts with unique ids', () => {
    fc.assert(
      fc.property(arbLayout({ arrangements: 0.4 }), (layout) => {
        expect(validateLayout(layout).errors).toEqual([]);
        expect(columnBoundsViolations(layout)).toEqual([]);
        expect(danglingOverrideKeys(layout)).toEqual([]);
        expect(arrangementViolations(layout)).toEqual([]);
        const ids = allItemIds(layout);
        expect(new Set(ids).size).toBe(ids.length);
      }),
      RUNS,
    );
  });

  it('generate free-grid sections whose blocks overlap', () => {
    const overlapping = fc.sample(arbLayout({ arrangements: 0 }), RUNS).filter((layout) => {
      const enabled = getEnabledBreakpoints(layout);
      return layout.sections.some((section) =>
        enabled.some((bp) => {
          const rects = visibleRects(section, bp, enabled);
          return rects.some((a, i) => rects.slice(i + 1).some((b) => rectsShareCell(a, b)));
        }),
      );
    });
    expect(overlapping.length).toBeGreaterThan(RUNS.numRuns / 4);
  });
});
