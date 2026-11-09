import { addItem, moveItemToSection } from '../mutations/layout';
import type { ArrangementAlign, Breakpoint, Layout } from '../types';
import {
  arrangeSlots,
  arrangementSlots,
  insertionIndexAt,
  type ArrangementSlot,
  type ArrangementTrack,
} from './arrangement';
import { resolveItem } from './breakpoint';

/** What is dragged over the canvas: a block of a section, or a new block from a palette. */
export type DropSource =
  | { type: 'block'; sectionId: string; itemId: string }
  | { type: 'new'; w: number; h: number };

/** Id (and kind) of the stand-in block a preview of a new block inserts. */
export const DROP_PREVIEW_ID = 'vantage-drop-preview';

/**
 * The layout dropping `source` at `index` of the arrangement section's `items` produces. It is
 * the mutation the drop applies: `moveItemToSection` for a block (same section or another one),
 * `addItem` for a new block, which the preview inserts as `DROP_PREVIEW_ID`.
 */
export function arrangementDropLayout(
  layout: Layout,
  sectionId: string,
  source: DropSource,
  index: number,
  breakpoint: Breakpoint = 'desktop',
): Layout {
  if (source.type === 'block') {
    return moveItemToSection(layout, source.sectionId, source.itemId, sectionId, {
      index,
      breakpoint,
    });
  }
  return addItem(layout, sectionId, DROP_PREVIEW_ID, {
    id: DROP_PREVIEW_ID,
    index,
    w: source.w,
    h: source.h,
  });
}

export type ArrangementDropPreview = {
  /** Slot of every block shown on the breakpoint after the drop, by id. */
  slots: Map<string, ArrangementSlot>;
  /** Id the dropped block has after the drop. It has no slot when it is hidden there. */
  droppedId: string;
  /** Ids of `slots` in reading order (row, then column). */
  order: string[];
};

/** Ids of `slots` in reading order. */
export function readingOrder(slots: Map<string, ArrangementSlot>): string[] {
  return [...slots].sort(([, a], [, b]) => a.row - b.row || a.col - b.col).map(([id]) => id);
}

/**
 * How the arrangement section `sectionId` looks on `breakpoint` once `source` is dropped at
 * `index`, from the layout the drop produces (`arrangementDropLayout`). `null` when the section
 * is no arrangement or the drop changes nothing about it (an unknown block).
 */
export function arrangementDropPreview(
  layout: Layout,
  sectionId: string,
  source: DropSource,
  index: number,
  breakpoint: Breakpoint,
): ArrangementDropPreview | null {
  const before = layout.sections.find((s) => s.id === sectionId);
  if (!before?.arrangement) return null;
  const next = arrangementDropLayout(layout, sectionId, source, index, breakpoint);
  const section = next.sections.find((s) => s.id === sectionId)!;
  const known = new Set(before.items.map((item) => item.id));
  const droppedId =
    source.type === 'block' && source.sectionId === sectionId
      ? known.has(source.itemId)
        ? source.itemId
        : undefined
      : section.items.find((item) => !known.has(item.id))?.id;
  if (droppedId === undefined) return null;
  const visible = section.items.filter(
    (item) => !resolveItem(item, section, breakpoint, next.breakpoints).hidden,
  );
  const slots = arrangementSlots(visible, section.arrangement!, breakpoint);
  return { slots, droppedId, order: readingOrder(slots) };
}

const overlaps = (a: ArrangementSlot, b: ArrangementSlot) =>
  a.row === b.row && a.col < b.col + b.span && b.col < a.col + a.span;

/**
 * Where a block after `count` blocks would go without moving them: the next slot of the track,
 * or a new row when that slot is taken (a lone last block that fills its row, a centered row).
 */
export function trailingSlot(
  count: number,
  track: ArrangementTrack,
  align: ArrangementAlign = 'start',
): ArrangementSlot {
  const current = arrangeSlots(count, track, align);
  const next = arrangeSlots(count + 1, track, align)[count]!;
  if (!current.some((slot) => overlaps(slot, next))) return next;
  return { ...arrangeSlots(1, track, align)[0]!, row: current.at(-1)!.row + 1 };
}

type Rect = { left: number; top: number; right: number; bottom: number };

/**
 * Index among the other blocks for a point while a preview shows the dropped block at `current`
 * of `rects` (the blocks as shown, the slot included, in reading order). Over the slot the index
 * stays, so the reflow cannot make the target flip back and forth.
 */
export function previewInsertionIndex(
  rects: Rect[],
  current: number,
  point: { x: number; y: number },
): number {
  const at = insertionIndexAt(rects, point);
  return at > current ? at - 1 : at;
}

/**
 * Index in `others` (a section's blocks without the dragged one, in `items` order) for an index
 * among `visible` (those of them shown on the breakpoint, in `items` order): in front of the
 * visible block at that index, or right after the last visible one.
 */
export function itemsIndexOf(others: string[], visible: string[], visibleIndex: number): number {
  if (visible.length === 0) return others.length;
  const at = Math.max(0, Math.min(visibleIndex, visible.length));
  if (at < visible.length) return others.indexOf(visible[at]!);
  return others.indexOf(visible.at(-1)!) + 1;
}
