import { insertionIndexAt, type ArrangementSlot } from './arrangement';
import {
  itemsIndexOf,
  previewInsertionIndex,
  readingOrder,
  type ArrangementDropPreview,
} from './arrangementPreview';

export const CELL_ATTR = 'data-vantage-arrangement-cell';
export const SLOT_ATTR = 'data-vantage-drop-slot';

type Point = { x: number; y: number };
type Box = { left: number; top: number; right: number; bottom: number };

/** Rects of the cells of `ids` (the active slot for `slotId`) in order; `null` when one is missing. */
function rectsOf(grid: HTMLElement, ids: string[], slotId?: string): Box[] | null {
  const rects: Box[] = [];
  for (const id of ids) {
    const el =
      id === slotId
        ? grid.querySelector(`[${SLOT_ATTR}="active"]`)
        : grid.querySelector(`[${CELL_ATTR}="${CSS.escape(id)}"]`);
    if (!el) return null;
    const { left, top, right, bottom } = el.getBoundingClientRect();
    rects.push({ left, top, right, bottom });
  }
  return rects;
}

/** What an arrangement section shows, for hit-testing a drop. */
export type ArrangementDropState = {
  /** Ids of the section's `items`. */
  itemIds: string[];
  /** Ids of the blocks shown on the breakpoint, in `items` order. */
  visibleIds: string[];
  /** Their slots without a preview. */
  slots: Map<string, ArrangementSlot>;
  /** The stacked breakpoint shows the blocks in reverse. */
  reversed: boolean;
  preview: ArrangementDropPreview | null;
};

/**
 * Index in the section's `items` without the dragged block (`dragged`, else the cell marked as
 * dragging) that a drop at `point`
 * lands at. The blocks are hit-tested as shown, in reading order. With a preview the slot stands
 * for the dropped block, so the index holds while the pointer is over the slot.
 */
export function dropIndexAt(
  grid: HTMLElement | null,
  state: ArrangementDropState,
  point: Point,
  dragged?: string,
): number {
  const excludeId =
    dragged ??
    grid?.querySelector(`[${CELL_ATTR}][data-vantage-dragging]`)?.getAttribute(CELL_ATTR);
  const others = state.itemIds.filter((id) => id !== excludeId);
  const visible = state.visibleIds.filter((id) => id !== excludeId);
  if (!grid) return itemsIndexOf(others, visible, visible.length);
  const { preview } = state;
  let shown: number | null = null;
  if (preview) {
    const order = preview.order.filter((id) => id === preview.droppedId || id !== excludeId);
    const rects = order.includes(preview.droppedId)
      ? rectsOf(grid, order, preview.droppedId)
      : null;
    if (rects) shown = previewInsertionIndex(rects, order.indexOf(preview.droppedId), point);
  }
  if (shown === null) {
    const order = readingOrder(state.slots).filter((id) => id !== excludeId);
    shown = insertionIndexAt(rectsOf(grid, order) ?? [], point);
  }
  return itemsIndexOf(others, visible, state.reversed ? visible.length - shown : shown);
}
