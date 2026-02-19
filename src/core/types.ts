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
  /** Section this element belongs to. */
  sectionId?: string;
  /** When false, this element does not snap to grid when dragging or resizing. Default true. */
  snapToGrid?: boolean;
  /**
   * When set, resizing is constrained to this aspect ratio (width / height).
   * Examples: 16/9 for landscape video, 1 for square, 9/16 for portrait.
   */
  aspectRatio?: number;
  /**
   * Optional user-defined id for linking this component to an external model.
   * Use this for headless workflows: store component-related data (e.g. CMS entry id,
   * A/B variant, analytics id) in your own backend and reference it via externalId.
   * The page builder uses `id` internally; externalId is never required by the editor.
   */
  externalId?: string;
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
