import { getEnabledBreakpoints, resolveItem, resolveSection } from '../lib/breakpoint';
import { NON_DESKTOP_BREAKPOINTS, type Breakpoint, type Layout, type Section } from '../types';

export type PlacedRect = { id: string; x: number; y: number; w: number; h: number };

/** Cells of the blocks shown at `breakpoint`; full-bleed blocks span every column. */
export function visibleRects(
  section: Section,
  breakpoint: Breakpoint,
  enabled: Breakpoint[],
): PlacedRect[] {
  const { columns } = resolveSection(section, breakpoint, enabled);
  return section.items.flatMap((item) => {
    const placement = resolveItem(item, section, breakpoint, enabled);
    if (placement.hidden) return [];
    const { x, y, w, h } = placement;
    return [item.fullBleed ? { id: item.id, x: 0, y, w: columns, h } : { id: item.id, x, y, w, h }];
  });
}

export function rectsShareCell(a: PlacedRect, b: PlacedRect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function overlappingPairs(
  section: Section,
  breakpoint: Breakpoint,
  enabled: Breakpoint[],
): [string, string][] {
  const rects = visibleRects(section, breakpoint, enabled);
  const pairs: [string, string][] = [];
  rects.forEach((a, i) => {
    for (const b of rects.slice(i + 1)) if (rectsShareCell(a, b)) pairs.push([a.id, b.id]);
  });
  return pairs;
}

/** `section:breakpoint:a+b` for every overlapping pair in a free-grid section. */
export function overlapViolations(layout: Layout, breakpoints?: Breakpoint[]): string[] {
  const enabled = getEnabledBreakpoints(layout);
  const checked = breakpoints ?? enabled;
  return layout.sections.flatMap((section) =>
    section.arrangement
      ? []
      : checked.flatMap((bp) =>
          overlappingPairs(section, bp, enabled).map(([a, b]) => `${section.id}:${bp}:${a}+${b}`),
        ),
  );
}

/** Stored desktop placements of free-grid blocks that leave the column grid. */
export function columnBoundsViolations(layout: Layout): string[] {
  const violations: string[] = [];
  for (const section of layout.sections) {
    if (section.arrangement) continue;
    for (const item of section.items) {
      const { x, y, w, h } = item;
      if (!(x >= 0 && y >= 0 && w >= 1 && h >= 1 && x + w <= section.columns)) {
        violations.push(`${section.id}:desktop:${item.id} ${JSON.stringify({ x, y, w, h })}`);
      }
    }
  }
  return violations;
}

/** Stored override placements that are negative or below the minimum size. */
export function overridePlacementViolations(layout: Layout): string[] {
  const violations: string[] = [];
  for (const section of layout.sections) {
    for (const bp of NON_DESKTOP_BREAKPOINTS) {
      for (const [id, ovr] of Object.entries(section.overrides?.[bp]?.items ?? {})) {
        const bad =
          (ovr.x !== undefined && ovr.x < 0) ||
          (ovr.y !== undefined && ovr.y < 0) ||
          (ovr.w !== undefined && ovr.w < 1) ||
          (ovr.h !== undefined && ovr.h < 1);
        if (bad) violations.push(`${section.id}:${bp}:${id}`);
      }
    }
  }
  return violations;
}

/** Item override keys whose item is not in the section. */
export function danglingOverrideKeys(layout: Layout): string[] {
  return layout.sections.flatMap((section) => {
    const ids = new Set(section.items.map((item) => item.id));
    return NON_DESKTOP_BREAKPOINTS.flatMap((bp) =>
      Object.keys(section.overrides?.[bp]?.items ?? {})
        .filter((id) => !ids.has(id))
        .map((id) => `${section.id}:${bp}:${id}`),
    );
  });
}

const GRID_ONLY_OVERRIDE_KEYS = ['x', 'y', 'w', 'h'] as const;

/** Arrangement sections that keep fixed rows, override columns or override placements. */
export function arrangementViolations(layout: Layout): string[] {
  const violations: string[] = [];
  for (const section of layout.sections) {
    if (!section.arrangement) continue;
    if (section.rows !== undefined) violations.push(`${section.id}: rows`);
    for (const bp of NON_DESKTOP_BREAKPOINTS) {
      const ovr = section.overrides?.[bp];
      if (!ovr) continue;
      if (ovr.rows !== undefined) violations.push(`${section.id}:${bp}: rows`);
      if (ovr.columns !== undefined) violations.push(`${section.id}:${bp}: columns`);
      for (const [id, itemOvr] of Object.entries(ovr.items ?? {})) {
        const keys = GRID_ONLY_OVERRIDE_KEYS.filter((key) => itemOvr[key] !== undefined);
        if (keys.length > 0) violations.push(`${section.id}:${bp}:${id}: ${keys.join(',')}`);
      }
    }
  }
  return violations;
}

export function allItemIds(layout: Layout): string[] {
  return layout.sections.flatMap((section) => section.items.map((item) => item.id));
}
