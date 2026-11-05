import { resolveItem } from '../lib/breakpoint';
import {
  ARRANGEMENT_COLUMNS,
  arrangementSlots,
  arrangementTrack,
  type ArrangementSlot,
} from '../lib/arrangement';
import {
  NON_DESKTOP_BREAKPOINTS,
  type Breakpoint,
  type GridItem,
  type ItemOverride,
  type Layout,
  type Section,
  type SectionArrangement,
  type SectionOverride,
} from '../types';

const PLACEMENT_KEYS = ['x', 'y', 'w', 'h'] as const;

function withoutPlacement(override: ItemOverride): ItemOverride {
  const rest = { ...override };
  for (const key of PLACEMENT_KEYS) delete rest[key];
  return rest;
}

/** Reading order of the desktop grid: by row, then column; ties keep `items` order. */
function inReadingOrder(items: GridItem[]): GridItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.y - b.item.y || a.item.x - b.item.x || a.index - b.index)
    .map(({ item }) => item);
}

function toArrangement(section: Section, arrangement: SectionArrangement): Section {
  const next: Section = {
    ...section,
    columns: ARRANGEMENT_COLUMNS,
    arrangement,
    items: section.arrangement ? section.items : inReadingOrder(section.items),
  };
  delete next.rows;
  const overrides: NonNullable<Section['overrides']> = {};
  for (const bp of NON_DESKTOP_BREAKPOINTS) {
    const current = section.overrides?.[bp];
    if (!current) continue;
    const { items, ...fields } = current;
    const kept: Record<string, ItemOverride> = {};
    for (const [id, override] of Object.entries(items ?? {})) {
      const stripped = withoutPlacement(override);
      if (Object.keys(stripped).length > 0) kept[id] = stripped;
    }
    const bpOverride: SectionOverride = {
      ...fields,
      ...(Object.keys(kept).length > 0 ? { items: kept } : {}),
    };
    delete bpOverride.columns;
    delete bpOverride.rows;
    if (Object.keys(bpOverride).length > 0) overrides[bp] = bpOverride;
  }
  if (Object.keys(overrides).length > 0) next.overrides = overrides;
  else delete next.overrides;
  return next;
}

/** Free-grid placement that reproduces the arrangement on `breakpoint`; rows are as tall as their tallest block. */
function gridPlacement(
  section: Section,
  arrangement: SectionArrangement,
  breakpoint: Breakpoint,
): Map<string, Pick<GridItem, 'x' | 'y' | 'w' | 'h'>> {
  const visible = section.items.filter((item) => !resolveItem(item, section, breakpoint).hidden);
  const slots = arrangementSlots(visible, arrangement, breakpoint);
  const rowHeights: number[] = [];
  for (const item of visible) {
    const slot = slots.get(item.id) as ArrangementSlot;
    rowHeights[slot.row] = Math.max(rowHeights[slot.row] ?? 0, item.h);
  }
  const rowTops: number[] = [];
  let top = 0;
  rowHeights.forEach((height, row) => {
    rowTops[row] = top;
    top += height ?? 0;
  });
  const placements = new Map<string, Pick<GridItem, 'x' | 'y' | 'w' | 'h'>>();
  for (const item of visible) {
    const slot = slots.get(item.id) as ArrangementSlot;
    placements.set(item.id, { x: slot.col, y: rowTops[slot.row] ?? 0, w: slot.span, h: item.h });
  }
  return placements;
}

function toFreeGrid(section: Section): Section {
  const { arrangement, ...rest } = section;
  if (!arrangement) return section;
  const desktop = gridPlacement(section, arrangement, 'desktop');
  const next: Section = {
    ...rest,
    columns: arrangementTrack(arrangement, 'desktop').columns,
    items: section.items.map((item) => ({ ...item, ...desktop.get(item.id) })),
  };
  const overrides: NonNullable<Section['overrides']> = { ...section.overrides };
  for (const bp of NON_DESKTOP_BREAKPOINTS) {
    const placements = gridPlacement(section, arrangement, bp);
    const items: Record<string, ItemOverride> = { ...overrides[bp]?.items };
    for (const [id, placement] of placements) items[id] = { ...items[id], ...placement };
    overrides[bp] = { ...overrides[bp], columns: arrangementTrack(arrangement, bp).columns, items };
  }
  next.overrides = overrides;
  return next;
}

/**
 * Switch a section between free grid and arrangement, or change its arrangement. `null` makes
 * it a free grid: the current arrangement is written out as explicit placement on every
 * breakpoint. An arrangement from a free grid orders the blocks by their desktop reading order
 * and drops the grid placement of the breakpoints.
 */
export function setSectionArrangement(
  layout: Layout,
  sectionId: string,
  arrangement: SectionArrangement | null,
): Layout {
  return {
    ...layout,
    sections: layout.sections.map((section) => {
      if (section.id !== sectionId) return section;
      if (arrangement === null) return toFreeGrid(section);
      return toArrangement(section, arrangement);
    }),
  };
}
