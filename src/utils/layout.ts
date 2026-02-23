// Layout utility functions (grid-based)

import {
  GridPlacement,
  Breakpoint,
  PageData,
  Section,
  PageElement,
} from "../core/types";

export const getCanvasWidth = (
  breakpoint: Breakpoint,
  breakpoints: Record<Breakpoint, number>
): number => {
  return breakpoints[breakpoint];
};

/** Number of grid rows in a section given its height and row height. */
export function getSectionRowCount(
  sectionHeight: number,
  gridRowHeight: number
): number {
  return Math.ceil(sectionHeight / gridRowHeight);
}

/** Convert 0-based GridPlacement to 1-based CSS grid-column/grid-row strings. */
export function gridPlacementToCss(placement: GridPlacement): {
  gridColumn: string;
  gridRow: string;
} {
  return {
    gridColumn: `${placement.columnStart + 1} / ${placement.columnEnd + 1}`,
    gridRow: `${placement.rowStart + 1} / ${placement.rowEnd + 1}`,
  };
}

/** Find the next available grid placement (deterministic; overlap allowed). */
export function findNextGridPlacement(
  gridColumns: number,
  rowCount: number,
  defaultColSpan: number,
  defaultRowSpan: number,
  existingPlacements: GridPlacement[]
): GridPlacement {
  const colSpan = Math.min(defaultColSpan, gridColumns);
  const rowSpan = Math.min(defaultRowSpan, rowCount);

  for (let row = 0; row <= rowCount - rowSpan; row++) {
    for (let col = 0; col <= gridColumns - colSpan; col++) {
      const candidate: GridPlacement = {
        columnStart: col,
        columnEnd: col + colSpan,
        rowStart: row,
        rowEnd: row + rowSpan,
      };
      // Overlap allowed; we just pick first spot for predictability
      return candidate;
    }
  }
  // Fallback: place at 0,0 with requested span (clamped by caller if needed)
  return {
    columnStart: 0,
    columnEnd: colSpan,
    rowStart: 0,
    rowEnd: rowSpan,
  };
}

/** Return placement for the given breakpoint, falling back to desktop. */
export function ensureBreakpointLayout(
  element: PageElement,
  breakpoint: Breakpoint
): GridPlacement {
  const layout = element.layout[breakpoint];
  if (layout) return layout;
  return element.layout.desktop;
}

/** Convert a pixel rect (relative to container) to grid column/row range for marquee selection. */
export function marqueePxToGridRange(
  leftPx: number,
  topPx: number,
  rightPx: number,
  bottomPx: number,
  containerWidth: number,
  containerHeight: number,
  gridColumns: number,
  gridRowHeight: number
): { minCol: number; maxCol: number; minRow: number; maxRow: number } {
  const colWidth = containerWidth / gridColumns;
  const minCol = Math.max(0, Math.floor(leftPx / colWidth));
  const maxCol = Math.min(gridColumns, Math.ceil(rightPx / colWidth));
  const minRow = Math.max(0, Math.floor(topPx / gridRowHeight));
  const maxRow = Math.min(
    Math.ceil(containerHeight / gridRowHeight),
    Math.ceil(bottomPx / gridRowHeight)
  );
  return { minCol, maxCol, minRow, maxRow };
}

/** Check if a grid placement overlaps a grid range (e.g. from marquee). */
export function gridPlacementOverlapsRange(
  placement: GridPlacement,
  minCol: number,
  maxCol: number,
  minRow: number,
  maxRow: number
): boolean {
  return (
    placement.columnEnd > minCol &&
    placement.columnStart < maxCol &&
    placement.rowEnd > minRow &&
    placement.rowStart < maxRow
  );
}

// --- Sections (page height = sum of section heights) ---

/** Total page height in px. Uses defaultSingleSectionHeight when no sections. */
export function getPageTotalHeight(
  sections: Section[] | undefined,
  defaultSingleSectionHeight: number
): number {
  if (!sections?.length) return defaultSingleSectionHeight;
  return sections.reduce((sum, s) => sum + s.height, 0);
}

/** Ensure pageData has sections; if none, create one and assign sectionId to all elements. Idempotent when sections already present. */
export function normalizePageData<T extends string = string>(
  data: PageData<T>,
  defaultSectionHeight: number
): PageData<T> {
  if (data.sections?.length) return data;
  const sectionId = `sec-${Date.now()}`;
  const section: Section = {
    id: sectionId,
    fullWidth: false,
    height: defaultSectionHeight,
  };
  const elements = (data.elements || []).map(el => ({
    ...el,
    sectionId,
  }));
  return {
    ...data,
    sections: [section],
    elements,
  } as PageData<T>;
}
