// Core types - framework agnostic

export type Breakpoint = "desktop" | "tablet" | "mobile";

// Editor uses percentages (0–100) for react-rnd positionUnit: '%'
export interface LayoutRect {
  x: number; // 0–100
  y: number; // 0–100
  w: number; // 0–100
  h: number; // 0–100
}

// Responsive units for live rendering
export interface ResponsiveRect {
  left: number; // percentage
  top: number; // percentage
  width: number; // percentage
  height: number; // percentage
}

export interface ElementLayout {
  desktop: LayoutRect;
  tablet: LayoutRect;
  mobile: LayoutRect;
  // Responsive version (calculated from desktop)
  responsive?: ResponsiveRect;
}

// Generic element - type is configurable
export interface PageElement<T extends string = string> {
  id: string;
  type: T;
  content: Record<string, any>; // Flexible content structure
  layout: ElementLayout;
  zIndex: number;
}

export interface PageData<T extends string = string> {
  pageId: string;
  elements: PageElement<T>[];
}
