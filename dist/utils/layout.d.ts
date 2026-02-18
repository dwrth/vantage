import { LayoutRect, Breakpoint, ResponsiveRect } from "../core/types";
export declare const getCanvasWidth: (
  breakpoint: Breakpoint,
  breakpoints: Record<Breakpoint, number>
) => number;
export declare const scaleLayoutToBreakpoint: (
  sourceRect: LayoutRect,
  _sourceBreakpoint: Breakpoint,
  _targetBreakpoint: Breakpoint,
  _breakpoints: Record<Breakpoint, number>
) => LayoutRect;
export declare const pixelsToResponsive: (
  rect: LayoutRect,
  _canvasWidth?: number,
  _canvasHeight?: number
) => ResponsiveRect;
export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export declare const responsiveToPixels: (
  rect: ResponsiveRect,
  canvasWidth: number,
  canvasHeight?: number
) => PixelRect;
export declare const snapToGrid: (value: number, gridSize: number) => number;
export declare const getGridOffset: (
  containerSize: number,
  gridSize: number
) => number;
export declare const snapToCenteredGrid: (
  value: number,
  gridSize: number,
  containerSize: number
) => number;
export declare const snapSizeToGrid: (
  value: number,
  gridSize: number
) => number;
export declare const gridPercentX: (
  gridSize: number,
  canvasWidth: number
) => number;
export declare const gridPercentY: (
  gridSize: number,
  canvasHeight: number
) => number;
export declare const snapToGridPercent: (
  value: number,
  gridPercent: number
) => number;
export declare const snapToCenteredGridPercent: (
  value: number,
  gridPercent: number,
  containerPercent?: number
) => number;
export declare const snapSizeToGridPercent: (
  value: number,
  gridPercent: number
) => number;
//# sourceMappingURL=layout.d.ts.map
