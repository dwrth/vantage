import { BREAKPOINTS, type Breakpoint, type GridItem, type Section } from '../types';
import { resolveItem, resolveSection } from './breakpoint';
import { overlaps as rectsOverlap, type PlacementRect } from './grid';

/** Two blocks that share at least one grid cell. `below` is lower in the stack than `above`. */
export type ItemOverlap = {
  below: string;
  above: string;
};

type PlacedItem = { item: GridItem; rect: PlacementRect };

/** Items shown at `breakpoint`, in stacking order (bottom first), at their cells there. */
function visiblePlacements(
  section: Section,
  breakpoint: Breakpoint,
  enabled: Breakpoint[] = BREAKPOINTS,
): PlacedItem[] {
  const { columns } = resolveSection(section, breakpoint, enabled);
  const placed: PlacedItem[] = [];
  for (const item of section.items) {
    const placement = resolveItem(item, section, breakpoint, enabled);
    if (placement.hidden) continue;
    // A full-bleed block spans the whole row, whatever its stored `x` / `w`.
    const rect = item.fullBleed
      ? { x: 0, y: placement.y, w: columns, h: placement.h }
      : { x: placement.x, y: placement.y, w: placement.w, h: placement.h };
    placed.push({ item, rect });
  }
  return placed;
}

/**
 * Overlapping block pairs of a section at `breakpoint`. Hidden blocks are skipped, and so is
 * every pair that involves a block with `allowOverlap` (intended layering).
 */
export function findOverlaps(
  section: Section,
  breakpoint: Breakpoint,
  enabled: Breakpoint[] = BREAKPOINTS,
): ItemOverlap[] {
  const placed = visiblePlacements(section, breakpoint, enabled).filter(
    ({ item }) => item.allowOverlap !== true,
  );
  const pairs: ItemOverlap[] = [];
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      if (rectsOverlap(placed[i]!.rect, placed[j]!.rect)) {
        pairs.push({ below: placed[i]!.item.id, above: placed[j]!.item.id });
      }
    }
  }
  return pairs;
}

/** Ids of the blocks that take part in an unintended overlap at `breakpoint`, by partner ids. */
export function overlappingItems(
  section: Section,
  breakpoint: Breakpoint,
  enabled: Breakpoint[] = BREAKPOINTS,
): Map<string, string[]> {
  const byItem = new Map<string, string[]>();
  for (const { below, above } of findOverlaps(section, breakpoint, enabled)) {
    byItem.set(below, [...(byItem.get(below) ?? []), above]);
    byItem.set(above, [...(byItem.get(above) ?? []), below]);
  }
  return byItem;
}

/**
 * First row at which `itemId` no longer overlaps anything, below the blocks it overlaps now
 * (as `findOverlaps` sees them) at `breakpoint`. Free means no visible block at all, layered
 * ones included. `null` when the block is missing, hidden or overlaps nothing.
 */
export function rowBelowOverlaps(
  section: Section,
  itemId: string,
  breakpoint: Breakpoint,
  enabled: Breakpoint[] = BREAKPOINTS,
): number | null {
  const placed = visiblePlacements(section, breakpoint, enabled);
  const self = placed.find(({ item }) => item.id === itemId);
  if (!self) return null;
  const partners = overlappingItems(section, breakpoint, enabled).get(itemId);
  if (!partners || partners.length === 0) return null;
  const others = placed.filter(({ item }) => item.id !== itemId);
  let y = Math.max(
    ...others.filter(({ item }) => partners.includes(item.id)).map(({ rect }) => rect.y + rect.h),
  );
  // The first free row is the start row or the bottom of a block in the way; jump to the
  // nearest such bottom until nothing is in the way.
  for (;;) {
    const candidate = { ...self.rect, y };
    const blockers = others.filter(({ rect }) => rectsOverlap(rect, candidate));
    if (blockers.length === 0) return y;
    y = Math.min(...blockers.map(({ rect }) => rect.y + rect.h));
  }
}
