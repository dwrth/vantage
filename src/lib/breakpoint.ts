import { clampItem } from './grid';
import {
  BREAKPOINTS,
  DEFAULT_BREAKPOINT_PREVIEW_WIDTHS,
  DEFAULT_BREAKPOINT_WIDTHS,
  DEFAULT_MOBILE_COLUMNS,
  DEFAULT_SECTION_PADDING_Y,
  DEFAULT_TABLET_COLUMNS_RATIO,
  NON_DESKTOP_BREAKPOINTS,
  type Breakpoint,
  type BreakpointWidths,
  type GridItem,
  type ItemOverride,
  type Layout,
  type Section,
  type SectionOverride,
} from '../types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export type ResolvedSectionLayout = {
  columns: number;
  colGap: number;
  rowGap: number;
  paddingTop: number;
  paddingBottom: number;
};

export type ResolvedItemLayout = Pick<GridItem, 'x' | 'y' | 'w' | 'h'> & {
  hidden: boolean;
};

export function getEnabledBreakpoints(layout: Pick<Layout, 'breakpoints'>): Breakpoint[] {
  const normalized = BREAKPOINTS.filter((bp) => layout.breakpoints.includes(bp));
  if (!normalized.includes('desktop')) return ['desktop'];
  return normalized;
}

export function isBreakpointEnabled(
  layout: Pick<Layout, 'breakpoints'>,
  breakpoint: Breakpoint,
): boolean {
  return getEnabledBreakpoints(layout).includes(breakpoint);
}

type LayoutBreakpointConfig = Pick<Layout, 'breakpoints' | 'breakpointWidths'>;
type LayoutPreviewConfig = Pick<Layout, 'breakpoints' | 'breakpointPreviewWidths'>;

export function getBreakpointWidths(layout: LayoutBreakpointConfig): BreakpointWidths {
  const enabled = getEnabledBreakpoints(layout);
  const widths: BreakpointWidths = {};
  if (enabled.includes('mobile')) {
    widths.mobile = layout.breakpointWidths?.mobile ?? DEFAULT_BREAKPOINT_WIDTHS.mobile;
  }
  if (enabled.includes('tablet')) {
    widths.tablet = layout.breakpointWidths?.tablet ?? DEFAULT_BREAKPOINT_WIDTHS.tablet;
  }
  return widths;
}

export function getBreakpointPreviewWidths(layout: LayoutPreviewConfig): BreakpointWidths {
  const enabled = getEnabledBreakpoints(layout);
  const widths: BreakpointWidths = {};
  if (enabled.includes('mobile')) {
    widths.mobile =
      layout.breakpointPreviewWidths?.mobile ?? DEFAULT_BREAKPOINT_PREVIEW_WIDTHS.mobile;
  }
  if (enabled.includes('tablet')) {
    widths.tablet =
      layout.breakpointPreviewWidths?.tablet ?? DEFAULT_BREAKPOINT_PREVIEW_WIDTHS.tablet;
  }
  return widths;
}

export function resolveBreakpointFromWidth(
  width: number,
  enabled: Breakpoint[] = BREAKPOINTS,
  widths: BreakpointWidths = DEFAULT_BREAKPOINT_WIDTHS,
): Breakpoint {
  const nonDesktop = NON_DESKTOP_BREAKPOINTS.filter((bp) => enabled.includes(bp)).sort(
    (a, b) => (widths[a] ?? Number.POSITIVE_INFINITY) - (widths[b] ?? Number.POSITIVE_INFINITY),
  );
  for (const bp of nonDesktop) {
    const cutoff = widths[bp];
    if (cutoff !== undefined && width <= cutoff) return bp;
  }
  return 'desktop';
}

export function resolveBreakpointFromLayout(
  width: number,
  layout: LayoutBreakpointConfig,
): Breakpoint {
  return resolveBreakpointFromWidth(
    width,
    getEnabledBreakpoints(layout),
    getBreakpointWidths(layout),
  );
}

export function getSectionOverride(
  section: Section,
  breakpoint: Exclude<Breakpoint, 'desktop'>,
): SectionOverride | undefined {
  return section.overrides?.[breakpoint];
}

export function resolveSection(
  section: Section,
  breakpoint: Breakpoint,
  enabled: Breakpoint[] = BREAKPOINTS,
): ResolvedSectionLayout {
  const base = {
    columns: section.columns,
    colGap: section.colGap,
    rowGap: section.rowGap,
    paddingTop: section.paddingTop ?? DEFAULT_SECTION_PADDING_Y,
    paddingBottom: section.paddingBottom ?? DEFAULT_SECTION_PADDING_Y,
  };
  if (breakpoint === 'desktop' || !enabled.includes(breakpoint)) return base;
  const ovr = getSectionOverride(section, breakpoint);
  return {
    columns: ovr?.columns ?? base.columns,
    colGap: ovr?.colGap ?? base.colGap,
    rowGap: ovr?.rowGap ?? base.rowGap,
    paddingTop: ovr?.paddingTop ?? base.paddingTop,
    paddingBottom: ovr?.paddingBottom ?? base.paddingBottom,
  };
}

export function resolveItem(
  item: GridItem,
  section: Section,
  breakpoint: Breakpoint,
  enabled: Breakpoint[] = BREAKPOINTS,
): ResolvedItemLayout {
  const resolved = resolveSection(section, breakpoint, enabled);
  const placement: Pick<GridItem, 'x' | 'y' | 'w' | 'h'> = {
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
  };
  let hidden = false;
  if (breakpoint !== 'desktop' && enabled.includes(breakpoint)) {
    const ovr = getSectionOverride(section, breakpoint)?.items?.[item.id];
    if (ovr) {
      if (ovr.x !== undefined) placement.x = ovr.x;
      if (ovr.y !== undefined) placement.y = ovr.y;
      if (ovr.w !== undefined) placement.w = ovr.w;
      if (ovr.h !== undefined) placement.h = ovr.h;
      if (ovr.hidden === true) hidden = true;
    }
  }
  const clamped = clampItem(placement, resolved.columns);
  return { ...clamped, hidden };
}

/** Shallow-merge base `item.data` with breakpoint override `data`. Not entity resolve. */
export function mergeBreakpointItemData<TData = unknown>(
  item: GridItem<TData>,
  section: Section,
  breakpoint: Breakpoint,
  enabled: Breakpoint[] = BREAKPOINTS,
): TData | undefined {
  if (breakpoint === 'desktop' || !enabled.includes(breakpoint)) return item.data;
  const data = getSectionOverride(section, breakpoint)?.items?.[item.id]?.data;
  if (data === undefined) return item.data;
  if (isPlainObject(item.data) && isPlainObject(data)) {
    return { ...item.data, ...data } as TData;
  }
  return data as TData;
}

export function defaultColumnsForBreakpoint(
  desktopColumns: number,
  breakpoint: Exclude<Breakpoint, 'desktop'>,
): number {
  if (breakpoint === 'tablet') {
    return Math.max(1, Math.round(desktopColumns * DEFAULT_TABLET_COLUMNS_RATIO));
  }
  return DEFAULT_MOBILE_COLUMNS;
}

export function hasItemOverride(section: Section, breakpoint: Breakpoint, itemId: string): boolean {
  if (breakpoint === 'desktop') return false;
  const ovr = getSectionOverride(section, breakpoint)?.items?.[itemId];
  if (!ovr) return false;
  return (
    ovr.x !== undefined ||
    ovr.y !== undefined ||
    ovr.w !== undefined ||
    ovr.h !== undefined ||
    ovr.data !== undefined ||
    ovr.hidden === true
  );
}

export function mergeItemOverride(
  current: ItemOverride | undefined,
  patch: ItemOverride,
): ItemOverride {
  return { ...current, ...patch };
}
