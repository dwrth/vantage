import type { SelectionRef } from '../context/BuilderContext';
import type { Breakpoint, Layout } from '../types';
import { getEnabledBreakpoints, resolveItem, type ResolvedItemLayout } from './breakpoint';

type Placed = { placement: ResolvedItemLayout; fullBleed?: boolean };

/**
 * Reading order of blocks in one section: by row, then column. Ties keep the stacking order
 * (`items` order). Full-bleed blocks start at column 0.
 */
export function compareReadingOrder(a: Placed, b: Placed): number {
  const ax = a.fullBleed ? 0 : a.placement.x;
  const bx = b.fullBleed ? 0 : b.placement.x;
  return a.placement.y - b.placement.y || ax - bx;
}

/** Stable sort into reading order; entries keep their stacking index for `z-index` / `order`. */
export function sortByReadingOrder<T extends Placed>(
  entries: T[],
): Array<T & { stackIndex: number }> {
  return entries
    .map((entry, stackIndex) => ({ ...entry, stackIndex }))
    .sort((a, b) => compareReadingOrder(a, b) || a.stackIndex - b.stackIndex);
}

/** Every block visible on `breakpoint`, section by section, in reading order. */
export function blocksInReadingOrder(layout: Layout, breakpoint: Breakpoint): SelectionRef[] {
  const enabled = getEnabledBreakpoints(layout);
  return layout.sections.flatMap((section) =>
    sortByReadingOrder(
      section.items.map((item) => ({
        id: item.id,
        fullBleed: item.fullBleed,
        placement: resolveItem(item, section, breakpoint, enabled),
      })),
    )
      .filter(({ placement }) => !placement.hidden)
      .map(({ id }) => ({ sectionId: section.id, itemId: id })),
  );
}
