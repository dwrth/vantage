import type { PlacementRect } from './grid';

/**
 * Alignment guides and size-match markers for a block being dragged or resized, in grid units.
 *
 * Placements already snap to whole cells, so "aligned" means equal grid values: no tolerance
 * and no extra snapping. Only like edges are compared (left with left, centre with centre,
 * right with right; same for top / middle / bottom). Touching edges (one block's right edge on
 * the next block's left edge) are neighbours, not alignment, and produce no guide.
 */

export type GuideEdge = 'start' | 'center' | 'end';

/** A rect taking part in guide computation. `fullBleed` rects span the section width. */
export type GuideRect = PlacementRect & { id: string; fullBleed?: boolean };

export type AlignmentGuide = {
  /** `vertical`: a line at a column position (x); `horizontal`: at a row position (y). */
  orientation: 'vertical' | 'horizontal';
  /** Which edge of the moving rect lines up (and of the matched rects). */
  edge: GuideEdge;
  /** Line position in grid units (columns or rows); centres can be half values. */
  position: number;
  /** Extent along the other axis, in grid units: from the topmost / leftmost rect to the farthest. */
  from: number;
  to: number;
  /** Ids of the other rects on this line; empty for a section-centre-only guide. */
  itemIds: string[];
  /** The line is the section's centre (the moving rect is centred in the section). */
  sectionCenter: boolean;
};

export type SizeMatch = {
  /** `w`: the moving rect's width equals theirs; `h`: its height. */
  dimension: 'w' | 'h';
  itemIds: string[];
};

export type AlignmentResult = {
  guides: AlignmentGuide[];
  sizeMatches: SizeMatch[];
};

export type AlignmentSection = {
  columns: number;
  rows: number;
};

type Axis = {
  orientation: AlignmentGuide['orientation'];
  start: (r: PlacementRect) => number;
  size: (r: PlacementRect) => number;
  /** Start and size on the other axis, for the guide's extent. */
  crossStart: (r: PlacementRect) => number;
  crossSize: (r: PlacementRect) => number;
  sectionSize: (s: AlignmentSection) => number;
};

const X_AXIS: Axis = {
  orientation: 'vertical',
  start: (r) => r.x,
  size: (r) => r.w,
  crossStart: (r) => r.y,
  crossSize: (r) => r.h,
  sectionSize: (s) => s.columns,
};

const Y_AXIS: Axis = {
  orientation: 'horizontal',
  start: (r) => r.y,
  size: (r) => r.h,
  crossStart: (r) => r.x,
  crossSize: (r) => r.w,
  sectionSize: (s) => s.rows,
};

const EDGES: GuideEdge[] = ['start', 'center', 'end'];

function edgeAt(axis: Axis, rect: PlacementRect, edge: GuideEdge): number {
  const start = axis.start(rect);
  if (edge === 'start') return start;
  if (edge === 'end') return start + axis.size(rect);
  return start + axis.size(rect) / 2;
}

/** A full-bleed rect spans the whole width, whatever its stored `x` / `w`. */
function effectiveRect(rect: GuideRect, columns: number): PlacementRect {
  return rect.fullBleed ? { x: 0, y: rect.y, w: columns, h: rect.h } : rect;
}

function guidesOnAxis(
  axis: Axis,
  moving: PlacementRect,
  others: { id: string; rect: PlacementRect }[],
  section: AlignmentSection,
): AlignmentGuide[] {
  const guides: AlignmentGuide[] = [];
  for (const edge of EDGES) {
    const position = edgeAt(axis, moving, edge);
    const matched = others.filter(({ rect }) => edgeAt(axis, rect, edge) === position);
    const sectionCenter = edge === 'center' && position === axis.sectionSize(section) / 2;
    if (matched.length === 0 && !sectionCenter) continue;
    let from = axis.crossStart(moving);
    let to = from + axis.crossSize(moving);
    for (const { rect } of matched) {
      from = Math.min(from, axis.crossStart(rect));
      to = Math.max(to, axis.crossStart(rect) + axis.crossSize(rect));
    }
    if (sectionCenter) {
      // The section centre line spans the whole section.
      from = 0;
      to = Math.max(to, axis.orientation === 'vertical' ? section.rows : section.columns);
    }
    guides.push({
      orientation: axis.orientation,
      edge,
      position,
      from,
      to,
      itemIds: matched.map(({ id }) => id),
      sectionCenter,
    });
  }
  return guides;
}

/**
 * Guides and size matches for `moving` against `others` (the moving rect itself is skipped by
 * id). Full-bleed rects take part only vertically: their left / right edges and width are the
 * section's, which would match every block at the section edge.
 */
export function computeAlignment(
  moving: GuideRect,
  others: GuideRect[],
  section: AlignmentSection,
): AlignmentResult {
  const rest = others.filter((rect) => rect.id !== moving.id);
  const movingRect = effectiveRect(moving, section.columns);
  const all = rest.map((rect) => ({ id: rect.id, rect: effectiveRect(rect, section.columns) }));
  const narrow = rest
    .filter((rect) => !rect.fullBleed)
    .map((rect) => ({ id: rect.id, rect: rect as PlacementRect }));

  const guides = [
    ...(moving.fullBleed ? [] : guidesOnAxis(X_AXIS, movingRect, narrow, section)),
    ...guidesOnAxis(Y_AXIS, movingRect, all, section),
  ];

  const sizeMatches: SizeMatch[] = [];
  const sameWidth = moving.fullBleed
    ? []
    : narrow.filter(({ rect }) => rect.w === movingRect.w).map(({ id }) => id);
  if (sameWidth.length > 0) sizeMatches.push({ dimension: 'w', itemIds: sameWidth });
  const sameHeight = all.filter(({ rect }) => rect.h === movingRect.h).map(({ id }) => id);
  if (sameHeight.length > 0) sizeMatches.push({ dimension: 'h', itemIds: sameHeight });

  return { guides, sizeMatches };
}

/** Grid geometry of a section in px, measured from the grid element's padding box. */
export type GuideGeometry = {
  /** Left edge of column 0. */
  contentOffsetX: number;
  /** Top edge of row 0 (section padding plus any fill-screen offset). */
  contentOffsetY: number;
  /** Column width plus column gap. */
  cellXStep: number;
  colGap: number;
  /** Measured row heights (track + row gap); `null` before the first measurement. */
  rowSteps: number[] | null;
  /** Row height plus row gap, for rows past the measured ones. */
  cellHeight: number;
  rowGap: number;
};

export type GuideBox = { left: number; top: number; width: number; height: number };

function rowStart(row: number, g: GuideGeometry): number {
  const whole = Math.floor(row);
  let y = 0;
  for (let i = 0; i < whole; i += 1) y += g.rowSteps?.[i] ?? g.cellHeight;
  // Half rows (centres of odd heights) sit halfway through the row.
  if (row > whole) y += (row - whole) * (g.rowSteps?.[whole] ?? g.cellHeight);
  return y;
}

/** Pixel offset of a line at grid position `position` on the edge `edge` of the blocks. */
function linePx(position: number, edge: GuideEdge, step: (p: number) => number, gap: number) {
  if (edge === 'start') return step(position);
  if (edge === 'end') return step(position) - gap;
  return step(position) - gap / 2;
}

/**
 * Where to draw `guide` (a 0-width / 0-height box on the line) inside the grid element.
 * Gaps are not part of a block, so a right / bottom edge line sits one gap before the next
 * cell, and a centre line half a gap before the cell position.
 */
export function guideBox(guide: AlignmentGuide, g: GuideGeometry): GuideBox {
  const colPx = (p: number) => g.contentOffsetX + p * g.cellXStep;
  const rowPx = (p: number) => g.contentOffsetY + rowStart(p, g);
  if (guide.orientation === 'vertical') {
    const top = rowPx(guide.from);
    return {
      left: linePx(guide.position, guide.edge, colPx, g.colGap),
      top,
      width: 0,
      height: Math.max(0, rowPx(guide.to) - g.rowGap - top),
    };
  }
  const left = colPx(guide.from);
  return {
    left,
    top: linePx(guide.position, guide.edge, rowPx, g.rowGap),
    width: Math.max(0, colPx(guide.to) - g.colGap - left),
    height: 0,
  };
}
