// Layout utility functions

import {
  LayoutRect,
  Breakpoint,
  ResponsiveRect,
  PageData,
  Section,
} from "../core/types";

export const getCanvasWidth = (
  breakpoint: Breakpoint,
  breakpoints: Record<Breakpoint, number>
): number => {
  return breakpoints[breakpoint];
};

// LayoutRect is percentage-based (0–100); same values work across breakpoints
export const scaleLayoutToBreakpoint = (
  sourceRect: LayoutRect,
  _sourceBreakpoint: Breakpoint,
  _targetBreakpoint: Breakpoint,
  _breakpoints: Record<Breakpoint, number>
): LayoutRect => {
  return { ...sourceRect };
};

// LayoutRect is already in 0–100; map to ResponsiveRect (same units)
export const pixelsToResponsive = (
  rect: LayoutRect,
  _canvasWidth?: number,
  _canvasHeight?: number
): ResponsiveRect => {
  return {
    left: rect.x,
    top: rect.y,
    width: rect.w,
    height: rect.h,
  };
};

// Pixel dimensions for a given canvas (e.g. for measuring)
export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const responsiveToPixels = (
  rect: ResponsiveRect,
  canvasWidth: number,
  canvasHeight: number = 800
): PixelRect => {
  return {
    x: (rect.left / 100) * canvasWidth,
    y: (rect.top / 100) * canvasHeight,
    w: (rect.width / 100) * canvasWidth,
    h: (rect.height / 100) * canvasHeight,
  };
};

// Grid snapping utility
export const snapToGrid = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

// Calculate grid offset to center the grid (equal cutoff on both sides)
export const getGridOffset = (
  containerSize: number,
  gridSize: number
): number => {
  return (containerSize % gridSize) / 2;
};

// Snap to centered grid (accounts for grid offset)
export const snapToCenteredGrid = (
  value: number,
  gridSize: number,
  containerSize: number
): number => {
  const offset = getGridOffset(containerSize, gridSize);
  // Adjust value by offset, snap to grid, then adjust back
  const snapped = snapToGrid(value - offset, gridSize) + offset;
  // Ensure snapped value doesn't exceed container bounds
  return Math.max(offset, Math.min(snapped, containerSize - offset));
};

// Snap size to grid (ensures size is a multiple of gridSize)
export const snapSizeToGrid = (value: number, gridSize: number): number => {
  // Round to nearest multiple of gridSize, with minimum of gridSize
  return Math.max(gridSize, Math.round(value / gridSize) * gridSize);
};

// --- Percentage-based (0–100) grid snapping for positionUnit: '%' ---

export const gridPercentX = (gridSize: number, canvasWidth: number): number =>
  canvasWidth ? (gridSize / canvasWidth) * 100 : 0;

export const gridPercentY = (gridSize: number, canvasHeight: number): number =>
  canvasHeight ? (gridSize / canvasHeight) * 100 : 0;

export const snapToGridPercent = (
  value: number,
  gridPercent: number
): number =>
  gridPercent ? Math.round(value / gridPercent) * gridPercent : value;

export const snapToCenteredGridPercent = (
  value: number,
  gridPercent: number,
  containerPercent: number = 100
): number => {
  if (!gridPercent) return value;
  const offset = (containerPercent % gridPercent) / 2;
  const snapped = snapToGridPercent(value - offset, gridPercent) + offset;
  return Math.max(offset, Math.min(snapped, containerPercent - offset));
};

export const snapSizeToGridPercent = (
  value: number,
  gridPercent: number
): number =>
  gridPercent
    ? Math.max(gridPercent, Math.round(value / gridPercent) * gridPercent)
    : value;

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
