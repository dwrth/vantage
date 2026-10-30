import { closestRowForOffset } from './rowMetrics';

/** Viewport (client) coordinates. */
export type ClientPoint = { x: number; y: number };

/** Vertical extent of a section's grid in client coordinates. */
export type SectionBand = { sectionId: string; top: number; bottom: number };

/**
 * Section a drag at `clientY` targets. Every point resolves to a section, so a drag never loses its
 * target between two grids: a section owns its grid and everything above it down from the previous
 * grid's bottom (its header bar, the gap, the previous section's footer). Above the first grid
 * resolves to the first section, below the last grid to the last one.
 */
export function sectionAtY(clientY: number, bands: SectionBand[]): string | null {
  const ordered = [...bands].sort((a, b) => a.top - b.top);
  for (const band of ordered) {
    if (clientY < band.bottom) return band.sectionId;
  }
  return ordered.at(-1)?.sectionId ?? null;
}

/** Live grid geometry of a section, everything in px. */
export type GridGeometry = {
  /** `getBoundingClientRect()` of the grid element, read at the time of the hit test. */
  rect: { left: number; top: number };
  /** Horizontal space left of the first column (centered content). */
  contentOffsetX: number;
  /** Space above the first row: padding plus the free space of a center/end aligned fill-screen grid. */
  contentOffsetY: number;
  columns: number;
  rows: number;
  /** Column width plus gap. */
  cellXStep: number;
  /** Fallback row step (row height plus gap). */
  cellHeight: number;
  /** Measured row steps, when available. */
  rowSteps: number[] | null;
};

function cellIndex(px: number, step: number): number {
  return step > 0 ? Math.round(px / step) : 0;
}

/**
 * Grid cell whose top-left is closest to a client point, clamped so a `w` x `h` block stays inside
 * the grid. A point above the grid (e.g. on the header bar) clamps to row 0. The block shrinks to
 * the grid when it is wider or taller.
 */
export function gridCellAt(
  geometry: GridGeometry,
  clientLeft: number,
  clientTop: number,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  const { rect, contentOffsetX, contentOffsetY, columns, rows, cellXStep, cellHeight, rowSteps } =
    geometry;
  const width = Math.max(1, Math.min(w, columns));
  const height = Math.max(1, Math.min(h, rows));
  const left = clientLeft - rect.left - contentOffsetX;
  const top = clientTop - rect.top - contentOffsetY;
  const x = Math.max(0, Math.min(cellIndex(left, cellXStep), columns - width));
  const row = rowSteps
    ? closestRowForOffset(top, rowSteps, cellHeight)
    : cellIndex(top, cellHeight);
  const y = Math.max(0, Math.min(row, rows - height));
  return { x, y, w: width, h: height };
}

/** Auto-scroll band at each edge of the visible scroll area, as a share of its height. */
export const AUTO_SCROLL_THRESHOLD = 0.15;
/** Auto-scroll speed at the very edge, in px per ms (dnd-kit: acceleration 10 per 5 ms). */
export const AUTO_SCROLL_MAX_SPEED = 2;

/**
 * Vertical auto-scroll speed (px per ms, negative = up) for a pointer at `clientY` in a visible scroll
 * area from `top` to `bottom`. Zero outside the edge bands; grows linearly towards the edge and is
 * capped there, so a pointer past the edge (e.g. over a sticky header) scrolls at full speed.
 */
export function edgeScrollSpeed(
  clientY: number,
  top: number,
  bottom: number,
  threshold = AUTO_SCROLL_THRESHOLD,
  maxSpeed = AUTO_SCROLL_MAX_SPEED,
): number {
  const band = (bottom - top) * threshold;
  if (band <= 0) return 0;
  if (clientY < top + band) return -maxSpeed * Math.min(1, (top + band - clientY) / band);
  if (clientY > bottom - band) return maxSpeed * Math.min(1, (clientY - (bottom - band)) / band);
  return 0;
}
