// Core types - framework agnostic

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

// Editor uses pixels (for react-rnd compatibility)
export interface LayoutRect {
  x: number;
  y: number;
  w: number;
  h: number;
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
