import type { FC } from 'react';

export type GridItem<TData = unknown> = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: string;
  label?: string;
  data?: TData;
  meta?: Record<string, unknown>;
};

export type SectionBackgroundImageSize = 'cover' | 'contain' | 'auto';

export type SectionBackgroundImageRepeat = 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export const BREAKPOINTS: Breakpoint[] = ['desktop', 'tablet', 'mobile'];
export const NON_DESKTOP_BREAKPOINTS: Exclude<Breakpoint, 'desktop'>[] = ['tablet', 'mobile'];

export const BREAKPOINT_MIN_WIDTH: Record<Breakpoint, number> = {
  desktop: 1024,
  tablet: 640,
  mobile: 0,
};

/** Max viewport width (px) at which a non-desktop breakpoint's overrides apply. */
export type BreakpointWidths = Partial<Record<Exclude<Breakpoint, 'desktop'>, number>>;

export const DEFAULT_BREAKPOINT_WIDTHS: Required<BreakpointWidths> = {
  mobile: 640,
  tablet: 1023,
};

/** Editor canvas frame width (px) used to simulate a breakpoint in the builder/preview. */
export const DEFAULT_BREAKPOINT_PREVIEW_WIDTHS: Required<BreakpointWidths> = {
  mobile: 390,
  tablet: 768,
};

export const DEFAULT_TABLET_COLUMNS_RATIO = 2 / 3;
export const DEFAULT_MOBILE_COLUMNS = 4;

export type ItemOverride = Partial<Pick<GridItem, 'x' | 'y' | 'w' | 'h'>> & {
  hidden?: boolean;
  data?: unknown;
};

export type SectionOverride = {
  columns?: number;
  colGap?: number;
  rowGap?: number;
  paddingTop?: number;
  paddingBottom?: number;
  items?: Record<string, ItemOverride>;
};

export type SectionBackground = {
  /** CSS color (any valid value: hex, rgb(a), hsl, named). */
  color?: string;
  /** Image URL. */
  image?: string;
  /** Maps to CSS background-size. Defaults to 'cover'. */
  imageSize?: SectionBackgroundImageSize;
  /** Maps to CSS background-position. Defaults to 'center'. */
  imagePosition?: string;
  /** Maps to CSS background-repeat. Defaults to 'no-repeat'. */
  imageRepeat?: SectionBackgroundImageRepeat;
  /** Focal point X (0–100). Used with object-fit placement when image is cover/contain. */
  objectPositionX?: number;
  /** Focal point Y (0–100). Used with object-fit placement when image is cover/contain. */
  objectPositionY?: number;
  /** Zoom factor for focal crop (0.4–1). */
  cropScale?: number;
  /** Blur radius in px applied to the background layer (color + image). 0..200. */
  blur?: number;
  /** Opacity of the background layer (0..1). Defaults to 1. */
  opacity?: number;
};

export type Section<TData = unknown> = {
  id: string;
  label?: string;
  columns: number;
  colGap: number;
  rowGap: number;
  /** Vertical padding above the grid content, in px. Defaults to 24. */
  paddingTop?: number;
  /** Vertical padding below the grid content, in px. Defaults to 24. */
  paddingBottom?: number;
  items: GridItem<TData>[];
  background?: SectionBackground;
  overrides?: Partial<Record<Exclude<Breakpoint, 'desktop'>, SectionOverride>>;
  meta?: Record<string, unknown>;
};

export type Layout<TData = unknown> = {
  sections: Section<TData>[];
  breakpoints: Breakpoint[];
  /** Activation cutoffs: a non-desktop breakpoint applies when viewport width is <= its value. */
  breakpointWidths: BreakpointWidths;
  /** Editor canvas frame widths used to simulate each breakpoint visually. */
  breakpointPreviewWidths: BreakpointWidths;
  meta?: Record<string, unknown>;
};

export type ItemRendererProps<TData = unknown> = {
  item: GridItem<TData>;
  mode: 'edit' | 'preview';
  interactive?: boolean;
};

export type KindDefaults<TData = unknown> = {
  w: number;
  h: number;
  label?: string;
  data?: TData;
};

export type InspectorScope = 'base' | 'active';

export type InspectorProps<TData = unknown> = {
  item: GridItem<TData>;
  resolvedData: TData;
  section: Section<TData>;
  activeBreakpoint: Breakpoint;
  onChange: (patch: Partial<TData>, opts?: { scope?: InspectorScope }) => void;
};

export type KindDescriptor<TData = unknown> = {
  component: FC<ItemRendererProps<TData>>;
  inspector?: FC<InspectorProps<TData>>;
  defaults: KindDefaults<TData>;
  displayName?: string;
  /** Applied to the edit-mode grid cell wrapper (e.g. transparent text blocks). */
  editWrapperClass?: string;
  /** Applied to the preview grid cell wrapper. */
  previewWrapperClass?: string;
};

// Per-kind data types differ inside a registry; `any` preserves each entry's component/data pairing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type KindEntry<TData = any> = KindDescriptor<TData> | FC<ItemRendererProps<TData>>;

export type ComponentRegistry = Record<string, KindEntry>;

export type ResolvedKindDescriptor<TData = unknown> = KindDescriptor<TData>;

export type ResolvedComponentRegistry = Record<string, ResolvedKindDescriptor>;

export const DEFAULT_SECTION_PADDING_Y = 24;

export const DEFAULT_SECTION: Omit<Section, 'id'> = {
  columns: 12,
  colGap: 8,
  rowGap: 8,
  paddingTop: DEFAULT_SECTION_PADDING_Y,
  paddingBottom: DEFAULT_SECTION_PADDING_Y,
  items: [],
};
