import { getEnabledBreakpoints, resolveItem, resolveSection, sectionRows } from '../lib/breakpoint';
import type { PlacementRect } from '../lib/grid';
import { BREAKPOINTS, type Breakpoint, type Layout, type Section } from '../types';
import { moveItem, removeItem } from './layout';

/**
 * Group alignment over the selection's bounding box: `left` / `center` / `right` move blocks
 * horizontally, `top` / `middle` / `bottom` vertically.
 */
export type GroupAlignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

export const GROUP_ALIGNMENTS: GroupAlignment[] = [
  'left',
  'center',
  'right',
  'top',
  'middle',
  'bottom',
];

/** How far a group may move, in cells, so that every block stays inside the section. */
export type GroupMoveRange = { minDx: number; maxDx: number; minDy: number; maxDy: number };

type PlacedItem = PlacementRect & { id: string; fullBleed: boolean };

/** The group's blocks shown at `breakpoint`, at their placement there. Hidden blocks are left out. */
function placedGroup(
  section: Section,
  itemIds: readonly string[],
  breakpoint: Breakpoint,
  enabled: Breakpoint[],
): PlacedItem[] {
  const ids = new Set(itemIds);
  const placed: PlacedItem[] = [];
  for (const item of section.items) {
    if (!ids.has(item.id)) continue;
    const placement = resolveItem(item, section, breakpoint, enabled);
    if (placement.hidden) continue;
    const { x, y, w, h } = placement;
    placed.push({ id: item.id, x, y, w, h, fullBleed: item.fullBleed === true });
  }
  return placed;
}

/**
 * Bounding box of the group's blocks at `breakpoint` (hidden blocks left out), or `null` when
 * none is shown. Full-bleed blocks span all columns.
 */
export function groupBounds(
  section: Section,
  itemIds: readonly string[],
  breakpoint: Breakpoint,
  enabled?: Breakpoint[],
): PlacementRect | null {
  const bps = enabled ?? BREAKPOINTS;
  const placed = placedGroup(section, itemIds, breakpoint, bps);
  if (placed.length === 0) return null;
  const { columns } = resolveSection(section, breakpoint, bps);
  const left = Math.min(...placed.map((p) => (p.fullBleed ? 0 : p.x)));
  const right = Math.max(...placed.map((p) => (p.fullBleed ? columns : p.x + p.w)));
  const top = Math.min(...placed.map((p) => p.y));
  const bottom = Math.max(...placed.map((p) => p.y + p.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * Range of a group move at `breakpoint` that keeps every block inside the section's columns and
 * rows (the section never grows), like a single block's drag. Full-bleed blocks only limit the
 * vertical range. `null` when no block of the group is shown there.
 */
export function groupMoveRange(
  section: Section,
  itemIds: readonly string[],
  breakpoint: Breakpoint,
  enabled?: Breakpoint[],
): GroupMoveRange | null {
  const bps = enabled ?? BREAKPOINTS;
  const placed = placedGroup(section, itemIds, breakpoint, bps);
  if (placed.length === 0) return null;
  const { columns } = resolveSection(section, breakpoint, bps);
  const rows = sectionRows(section, breakpoint, bps);
  const narrow = placed.filter((p) => !p.fullBleed);
  // `0 -` rather than unary minus, so a block at the edge gives 0, not -0.
  const minDx = narrow.length ? Math.min(0, 0 - Math.min(...narrow.map((p) => p.x))) : 0;
  const maxDx = narrow.length
    ? Math.max(0, Math.min(...narrow.map((p) => columns - p.x - p.w)))
    : 0;
  const minDy = Math.min(0, 0 - Math.min(...placed.map((p) => p.y)));
  const maxDy = Math.max(0, Math.min(...placed.map((p) => rows - p.y - p.h)));
  return { minDx, maxDx, minDy, maxDy };
}

/** `dx` / `dy` limited to `range`. */
export function clampGroupDelta(range: GroupMoveRange, dx: number, dy: number) {
  return {
    dx: Math.max(range.minDx, Math.min(dx, range.maxDx)),
    dy: Math.max(range.minDy, Math.min(dy, range.maxDy)),
  };
}

function applyPlacements(
  layout: Layout,
  sectionId: string,
  targets: { id: string; x: number; y: number }[],
  breakpoint: Breakpoint,
): Layout {
  let next = layout;
  for (const { id, x, y } of targets) next = moveItem(next, sectionId, id, x, y, breakpoint);
  return next;
}

/**
 * Move several blocks of one section by `dx` columns and `dy` rows on `breakpoint`'s grid, as a
 * unit: the delta is clamped so that every block stays inside the section (see
 * `groupMoveRange`), so the blocks keep their relative positions. Full-bleed blocks only move
 * vertically; blocks hidden at `breakpoint` stay where they are. Off desktop the moves are
 * written to that breakpoint's overrides. One layout, so one undo step. Returns the same
 * layout object when nothing moves.
 */
export function moveItems(
  layout: Layout,
  sectionId: string,
  itemIds: readonly string[],
  dx: number,
  dy: number,
  breakpoint: Breakpoint = 'desktop',
): Layout {
  const enabled = getEnabledBreakpoints(layout);
  const section = layout.sections.find((s) => s.id === sectionId);
  if (!section) return layout;
  const range = groupMoveRange(section, itemIds, breakpoint, enabled);
  if (!range) return layout;
  const delta = clampGroupDelta(range, Math.round(dx), Math.round(dy));
  if (delta.dx === 0 && delta.dy === 0) return layout;
  const targets = placedGroup(section, itemIds, breakpoint, enabled)
    .map((p) => ({ id: p.id, x: p.fullBleed ? p.x : p.x + delta.dx, y: p.y + delta.dy, p }))
    .filter(({ x, y, p }) => x !== p.x || y !== p.y);
  return targets.length ? applyPlacements(layout, sectionId, targets, breakpoint) : layout;
}

/**
 * Align several blocks of one section to the bounding box of those shown at `breakpoint`. Sizes
 * do not change; `center` / `middle` round down to whole cells. Full-bleed blocks ignore
 * horizontal alignment and do not widen the box for it. Off desktop the result is written to
 * that breakpoint's overrides. One layout, so one undo step; the same layout object when
 * nothing moves (e.g. a single block).
 */
export function alignItems(
  layout: Layout,
  sectionId: string,
  itemIds: readonly string[],
  alignment: GroupAlignment,
  breakpoint: Breakpoint = 'desktop',
): Layout {
  const enabled = getEnabledBreakpoints(layout);
  const section = layout.sections.find((s) => s.id === sectionId);
  if (!section) return layout;
  const placed = placedGroup(section, itemIds, breakpoint, enabled);
  if (placed.length < 2) return layout;
  const horizontal = alignment === 'left' || alignment === 'center' || alignment === 'right';
  const movable = horizontal ? placed.filter((p) => !p.fullBleed) : placed;
  if (movable.length === 0) return layout;
  const left = Math.min(...movable.map((p) => p.x));
  const right = Math.max(...movable.map((p) => p.x + p.w));
  const top = Math.min(...movable.map((p) => p.y));
  const bottom = Math.max(...movable.map((p) => p.y + p.h));

  const targets = movable
    .map((p) => {
      switch (alignment) {
        case 'left':
          return { id: p.id, x: left, y: p.y, p };
        case 'right':
          return { id: p.id, x: right - p.w, y: p.y, p };
        case 'center':
          return { id: p.id, x: left + Math.floor((right - left - p.w) / 2), y: p.y, p };
        case 'top':
          return { id: p.id, x: p.x, y: top, p };
        case 'bottom':
          return { id: p.id, x: p.x, y: bottom - p.h, p };
        case 'middle':
          return { id: p.id, x: p.x, y: top + Math.floor((bottom - top - p.h) / 2), p };
      }
    })
    .filter(({ x, y, p }) => x !== p.x || y !== p.y);
  return targets.length ? applyPlacements(layout, sectionId, targets, breakpoint) : layout;
}

/**
 * Remove several blocks of one section (on every breakpoint, like `removeItem`). One layout, so
 * one undo step. Returns the same layout object when none of them exists.
 */
export function removeItems(layout: Layout, sectionId: string, itemIds: readonly string[]): Layout {
  const section = layout.sections.find((s) => s.id === sectionId);
  if (!section) return layout;
  const ids = new Set(itemIds);
  const present = section.items.filter((item) => ids.has(item.id));
  let next = layout;
  for (const item of present) next = removeItem(next, sectionId, item.id);
  return next;
}
