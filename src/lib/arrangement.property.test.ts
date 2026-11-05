import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbSectionArrangement } from '../test/arbitraries';
import { BREAKPOINTS } from '../types';
import { arrangementSlots, arrangementTrack, insertionIndexAt } from './arrangement';

const RUNS = { numRuns: 150, seed: 20261105 };

describe('arrangementSlots', () => {
  it('gives every block one slot inside the track, filling rows in order without overlap', () => {
    fc.assert(
      fc.property(
        arbSectionArrangement,
        fc.constantFrom(...BREAKPOINTS),
        fc.nat({ max: 10 }),
        (arrangement, bp, count) => {
          const visible = Array.from({ length: count }, (_, i) => ({ id: `b${i}` }));
          const slots = arrangementSlots(visible, arrangement, bp);
          const track = arrangementTrack(arrangement, bp);
          expect([...slots.keys()].sort()).toEqual(visible.map((v) => v.id).sort());
          const byRow = new Map<number, { col: number; span: number }[]>();
          for (const slot of slots.values()) {
            expect(slot.col).toBeGreaterThanOrEqual(0);
            expect(slot.span).toBeGreaterThanOrEqual(1);
            expect(slot.col + slot.span).toBeLessThanOrEqual(track.columns);
            byRow.set(slot.row, [...(byRow.get(slot.row) ?? []), slot]);
          }
          const rows = [...byRow.keys()].sort((a, b) => a - b);
          expect(rows).toEqual(rows.map((_, i) => i));
          for (const row of byRow.values()) {
            const sorted = [...row].sort((a, b) => a.col - b.col);
            for (let k = 1; k < sorted.length; k += 1) {
              expect(sorted[k]!.col).toBeGreaterThanOrEqual(
                sorted[k - 1]!.col + sorted[k - 1]!.span,
              );
            }
          }
        },
      ),
      RUNS,
    );
  });
});

describe('insertionIndexAt', () => {
  it('returns an index between 0 and the block count', () => {
    const arbRect = fc
      .record({
        left: fc.integer({ min: 0, max: 500 }),
        top: fc.integer({ min: 0, max: 500 }),
        w: fc.integer({ min: 1, max: 200 }),
        h: fc.integer({ min: 1, max: 200 }),
      })
      .map(({ left, top, w, h }) => ({ left, top, right: left + w, bottom: top + h }));
    fc.assert(
      fc.property(
        fc.array(arbRect, { maxLength: 8 }),
        fc.record({
          x: fc.integer({ min: -100, max: 800 }),
          y: fc.integer({ min: -100, max: 800 }),
        }),
        (rects, point) => {
          const index = insertionIndexAt(rects, point);
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThanOrEqual(rects.length);
        },
      ),
      RUNS,
    );
  });
});
