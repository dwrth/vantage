import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { addItem, moveItemToIndex, moveItemToSection } from '../mutations/layout';
import { arbLayout, deepFreeze } from '../test/arbitraries';
import type { Breakpoint, Layout } from '../types';
import { arrangementSlots, arrangementTrack, type ArrangementSlot } from './arrangement';
import {
  arrangementDropPreview,
  itemsIndexOf,
  readingOrder,
  trailingSlot,
} from './arrangementPreview';
import { resolveItem } from './breakpoint';

const RUNS = { numRuns: 200, seed: 20261109 };

/** Slots of the section after the drop, the way the section renders them. */
function slotsAfter(layout: Layout, sectionId: string, breakpoint: Breakpoint) {
  const section = layout.sections.find((s) => s.id === sectionId)!;
  const visible = section.items.filter(
    (item) => !resolveItem(item, section, breakpoint, layout.breakpoints).hidden,
  );
  return arrangementSlots(visible, section.arrangement!, breakpoint);
}

/** A layout with an arrangement section to drop into, a breakpoint it enables and an index. */
const arbDrop = arbLayout({ arrangements: 0.6, maxSections: 3, maxItems: 5 })
  .filter((layout) => layout.sections.some((s) => s.arrangement))
  .chain((layout) =>
    fc.record({
      layout: fc.constant(deepFreeze(layout)),
      target: fc.constantFrom(...layout.sections.filter((s) => s.arrangement).map((s) => s.id)),
      breakpoint: fc.constantFrom(...layout.breakpoints),
      index: fc.integer({ min: -1, max: 7 }),
    }),
  );

describe('arrangementDropPreview', () => {
  it('matches the layout the canvas drop of a block produces', () => {
    const arbBlockDrop = arbDrop
      .filter(({ layout }) => layout.sections.some((s) => s.items.length > 0))
      .chain((drop) =>
        fc.record({
          drop: fc.constant(drop),
          source: fc.constantFrom(
            ...drop.layout.sections.flatMap((s) =>
              s.items.map((item) => ({ sectionId: s.id, itemId: item.id })),
            ),
          ),
        }),
      );
    fc.assert(
      fc.property(arbBlockDrop, ({ drop: { layout, target, breakpoint, index }, source }) => {
        const preview = arrangementDropPreview(
          layout,
          target,
          { type: 'block', ...source },
          index,
          breakpoint,
        )!;
        const dropped = moveItemToSection(layout, source.sectionId, source.itemId, target, {
          index,
          breakpoint,
        });
        const slots = slotsAfter(dropped, target, breakpoint);
        expect(preview.slots).toEqual(slots);
        expect(preview.order).toEqual(readingOrder(slots));
        expect(preview.droppedId).toBe(source.itemId);
        if (source.sectionId === target) {
          // The section's own drop handler reorders with moveItemToIndex: same result.
          const reordered = moveItemToIndex(layout, target, source.itemId, index);
          expect(slotsAfter(reordered, target, breakpoint)).toEqual(slots);
        }
      }),
      RUNS,
    );
  });

  it('matches the layout addItem produces for a new block at the index', () => {
    fc.assert(
      fc.property(
        arbDrop,
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 8 }),
        ({ layout, target, breakpoint, index }, w, h) => {
          const preview = arrangementDropPreview(
            layout,
            target,
            { type: 'new', w, h },
            index,
            breakpoint,
          )!;
          const added = addItem(layout, target, 'text', { id: 'host-id', index, w, h });
          const expected = [...slotsAfter(added, target, breakpoint)].map(
            ([id, slot]): [string, ArrangementSlot] => [
              id === 'host-id' ? preview.droppedId : id,
              slot,
            ],
          );
          expect([...preview.slots]).toEqual(expected);
        },
      ),
      RUNS,
    );
  });
});

describe('itemsIndexOf', () => {
  it('puts the block between the same visible neighbours', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { maxLength: 8 }),
        fc.integer({ min: 0, max: 8 }),
        (shown, rawIndex) => {
          const others = shown.map((_, i) => `b${i}`);
          const visible = others.filter((_, i) => shown[i]);
          const visibleIndex = Math.min(rawIndex, visible.length);
          const at = itemsIndexOf(others, visible, visibleIndex);
          const after = [...others.slice(0, at), 'x', ...others.slice(at)].filter(
            (id) => id === 'x' || visible.includes(id),
          );
          expect(after.indexOf('x')).toBe(visibleIndex);
        },
      ),
      RUNS,
    );
  });
});

describe('trailingSlot', () => {
  it('stays inside the track, after or below every block and clear of them', () => {
    fc.assert(
      fc.property(
        arbDrop.map(({ layout, target, breakpoint }) => ({
          arrangement: layout.sections.find((s) => s.id === target)!.arrangement!,
          breakpoint,
        })),
        fc.nat({ max: 9 }),
        ({ arrangement, breakpoint }, count) => {
          const track = arrangementTrack(arrangement, breakpoint);
          const blocks = arrangementSlots(
            Array.from({ length: count }, (_, i) => ({ id: `b${i}` })),
            { ...arrangement, mobileOrder: 'asis' },
            breakpoint,
          );
          const slot = trailingSlot(count, track, arrangement.align);
          expect(slot.col).toBeGreaterThanOrEqual(0);
          expect(slot.col + slot.span).toBeLessThanOrEqual(track.columns);
          for (const block of blocks.values()) {
            expect(slot.row).toBeGreaterThanOrEqual(block.row);
            const overlaps =
              block.row === slot.row &&
              block.col < slot.col + slot.span &&
              slot.col < block.col + block.span;
            expect(overlaps).toBe(false);
          }
        },
      ),
      RUNS,
    );
  });
});
