import {
  GridPlacement,
  Breakpoint,
  PageData,
  Section,
  PageElement,
} from "../core/types";
export declare const getCanvasWidth: (
  breakpoint: Breakpoint,
  breakpoints: Record<Breakpoint, number>
) => number;
/** Number of grid rows in a section given its height and row height. */
export declare function getSectionRowCount(
  sectionHeight: number,
  gridRowHeight: number
): number;
/** Convert 0-based GridPlacement to 1-based CSS grid-column/grid-row strings. */
export declare function gridPlacementToCss(placement: GridPlacement): {
  gridColumn: string;
  gridRow: string;
};
/** Find the next available grid placement (deterministic; overlap allowed). */
export declare function findNextGridPlacement(
  gridColumns: number,
  rowCount: number,
  defaultColSpan: number,
  defaultRowSpan: number,
  existingPlacements: GridPlacement[]
): GridPlacement;
/** Return placement for the given breakpoint, falling back to desktop. */
export declare function ensureBreakpointLayout(
  element: PageElement,
  breakpoint: Breakpoint
): GridPlacement;
/** Convert a pixel rect (relative to container) to grid column/row range for marquee selection. */
export declare function marqueePxToGridRange(
  leftPx: number,
  topPx: number,
  rightPx: number,
  bottomPx: number,
  containerWidth: number,
  containerHeight: number,
  gridColumns: number,
  gridRowHeight: number
): {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
};
/** Check if a grid placement overlaps a grid range (e.g. from marquee). */
export declare function gridPlacementOverlapsRange(
  placement: GridPlacement,
  minCol: number,
  maxCol: number,
  minRow: number,
  maxRow: number
): boolean;
/** Total page height in px. Uses defaultSingleSectionHeight when no sections. */
export declare function getPageTotalHeight(
  sections: Section[] | undefined,
  defaultSingleSectionHeight: number
): number;
/** Ensure pageData has sections; if none, create one and assign sectionId to all elements. Idempotent when sections already present. */
export declare function normalizePageData<T extends string = string>(
  data: PageData<T>,
  defaultSectionHeight: number
): PageData<T>;
//# sourceMappingURL=layout.d.ts.map
