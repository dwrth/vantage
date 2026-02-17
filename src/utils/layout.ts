// Layout utility functions

import { LayoutRect, Breakpoint, ResponsiveRect } from "../core/types";

export const getCanvasWidth = (
  breakpoint: Breakpoint,
  breakpoints: Record<Breakpoint, number>,
): number => {
  return breakpoints[breakpoint];
};

export const scaleLayoutToBreakpoint = (
  sourceRect: LayoutRect,
  sourceBreakpoint: Breakpoint,
  targetBreakpoint: Breakpoint,
  breakpoints: Record<Breakpoint, number>,
): LayoutRect => {
  const sourceWidth = breakpoints[sourceBreakpoint];
  const targetWidth = breakpoints[targetBreakpoint];
  const scale = targetWidth / sourceWidth;

  return {
    x: sourceRect.x * scale,
    y: sourceRect.y * scale,
    w: sourceRect.w * scale,
    h: sourceRect.h * scale,
  };
};

// Convert pixel-based layout to responsive units
export const pixelsToResponsive = (
  rect: LayoutRect,
  canvasWidth: number,
  canvasHeight: number = 800,
): ResponsiveRect => {
  return {
    left: (rect.x / canvasWidth) * 100, // percentage of container width
    top: (rect.y / canvasHeight) * 100, // percentage of container height
    width: (rect.w / canvasWidth) * 100, // percentage of container width
    height: (rect.h / canvasHeight) * 100, // percentage of container height
  };
};

// Convert responsive units back to pixels (for editor display)
export const responsiveToPixels = (
  rect: ResponsiveRect,
  canvasWidth: number,
  canvasHeight: number = 800,
): LayoutRect => {
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
  gridSize: number,
): number => {
  return (containerSize % gridSize) / 2;
};

// Snap to centered grid (accounts for grid offset)
export const snapToCenteredGrid = (
  value: number,
  gridSize: number,
  containerSize: number,
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
