import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbLayout } from '../test/arbitraries';
import { BREAKPOINTS } from '../types';
import { getEnabledBreakpoints, resolveItem } from './breakpoint';
import { blocksInReadingOrder, compareReadingOrder, sortByReadingOrder } from './readingOrder';

const RUNS = { numRuns: 150, seed: 20261105 };

const arbPlaced = fc.record({
  id: fc.string({ maxLength: 3 }),
  fullBleed: fc.option(fc.boolean(), { nil: undefined }),
  placement: fc.record({
    x: fc.nat({ max: 4 }),
    y: fc.nat({ max: 4 }),
    w: fc.integer({ min: 1, max: 3 }),
    h: fc.integer({ min: 1, max: 3 }),
    hidden: fc.boolean(),
  }),
});

describe('sortByReadingOrder', () => {
  it('is a stable permutation sorted by row, then column', () => {
    fc.assert(
      fc.property(fc.array(arbPlaced, { maxLength: 12 }), (entries) => {
        const sorted = sortByReadingOrder(entries);
        expect(sorted.map((e) => e.stackIndex).sort((a, b) => a - b)).toEqual(
          entries.map((_, i) => i),
        );
        for (const entry of sorted) expect(entry).toMatchObject(entries[entry.stackIndex]!);
        for (let k = 1; k < sorted.length; k += 1) {
          const order = compareReadingOrder(sorted[k - 1]!, sorted[k]!);
          expect(order).toBeLessThanOrEqual(0);
          if (order === 0) expect(sorted[k]!.stackIndex).toBeGreaterThan(sorted[k - 1]!.stackIndex);
        }
      }),
      RUNS,
    );
  });

  it('reads a full-bleed block from column 0 on either side of the comparison', () => {
    const at = (x: number, fullBleed?: boolean) => ({
      fullBleed,
      placement: { x, y: 0, w: 1, h: 1, hidden: false },
    });
    expect(compareReadingOrder(at(3), at(5, true))).toBeGreaterThan(0);
    expect(compareReadingOrder(at(5, true), at(3))).toBeLessThan(0);
    expect(compareReadingOrder(at(0), at(5, true))).toBe(0);
  });
});

describe('blocksInReadingOrder', () => {
  it('lists every visible block once, section by section, in reading order', () => {
    fc.assert(
      fc.property(arbLayout({ maxSections: 3 }), fc.constantFrom(...BREAKPOINTS), (layout, bp) => {
        const enabled = getEnabledBreakpoints(layout);
        const refs = blocksInReadingOrder(layout, bp);
        const visible = layout.sections.flatMap((section) =>
          section.items
            .filter((item) => !resolveItem(item, section, bp, enabled).hidden)
            .map((item) => `${section.id}/${item.id}`),
        );
        const listed = refs.map((r) => `${r.sectionId}/${r.itemId}`);
        expect([...listed].sort()).toEqual([...visible].sort());
        const sectionOrder = layout.sections.map((s) => s.id);
        const sectionIndexes = refs.map((r) => sectionOrder.indexOf(r.sectionId));
        expect(sectionIndexes).toEqual([...sectionIndexes].sort((a, b) => a - b));
        for (let k = 1; k < refs.length; k += 1) {
          const [a, b] = [refs[k - 1]!, refs[k]!];
          if (a.sectionId !== b.sectionId) continue;
          const section = layout.sections.find((s) => s.id === a.sectionId)!;
          const place = (id: string) => {
            const item = section.items.find((i) => i.id === id)!;
            return {
              fullBleed: item.fullBleed,
              placement: resolveItem(item, section, bp, enabled),
              index: section.items.indexOf(item),
            };
          };
          const [pa, pb] = [place(a.itemId), place(b.itemId)];
          const order = compareReadingOrder(pa, pb);
          expect(order < 0 || (order === 0 && pa.index < pb.index)).toBe(true);
        }
      }),
      RUNS,
    );
  });
});
