export type Breakpoint = "desktop" | "tablet" | "mobile";
export interface LayoutRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface ResponsiveRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface ElementLayout {
  desktop: LayoutRect;
  tablet: LayoutRect;
  mobile: LayoutRect;
  responsive?: ResponsiveRect;
}
export interface PageElement<T extends string = string> {
  id: string;
  type: T;
  content: Record<string, any>;
  layout: ElementLayout;
  zIndex: number;
  /** Section this element belongs to. */
  sectionId?: string;
  /** When false, this element does not snap to grid when dragging or resizing. Default true. */
  snapToGrid?: boolean;
}
/** A vertical section of the page. Page height = sum of section heights. */
export interface Section {
  id: string;
  /** If true, section spans 100%; otherwise uses width (px). */
  fullWidth: boolean;
  /** Height in px for this section. */
  height: number;
  /** Width in px when fullWidth is false. Omitted = use canvas/container width. */
  width?: number;
}
export interface PageData<T extends string = string> {
  pageId: string;
  elements: PageElement<T>[];
  /** Sections (stacked vertically). Page is always section-based. */
  sections?: Section[];
}
//# sourceMappingURL=types.d.ts.map
