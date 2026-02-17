import { LayoutRect, Breakpoint, ResponsiveRect } from '../core/types';
export declare const getCanvasWidth: (breakpoint: Breakpoint, breakpoints: Record<Breakpoint, number>) => number;
export declare const scaleLayoutToBreakpoint: (sourceRect: LayoutRect, sourceBreakpoint: Breakpoint, targetBreakpoint: Breakpoint, breakpoints: Record<Breakpoint, number>) => LayoutRect;
export declare const pixelsToResponsive: (rect: LayoutRect, canvasWidth: number, canvasHeight?: number) => ResponsiveRect;
export declare const responsiveToPixels: (rect: ResponsiveRect, canvasWidth: number, canvasHeight?: number) => LayoutRect;
export declare const snapToGrid: (value: number, gridSize: number) => number;
export declare const getGridOffset: (containerSize: number, gridSize: number) => number;
export declare const snapToCenteredGrid: (value: number, gridSize: number, containerSize: number) => number;
export declare const snapSizeToGrid: (value: number, gridSize: number) => number;
//# sourceMappingURL=layout.d.ts.map