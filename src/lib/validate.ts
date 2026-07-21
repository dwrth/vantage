import {
  BREAKPOINTS,
  NON_DESKTOP_BREAKPOINTS,
  type Breakpoint,
  type BreakpointWidths,
  type GridItem,
  type ItemOverride,
  type Layout,
  type SectionOverride,
} from '../types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidMeta(raw: unknown): boolean {
  return raw === undefined || isPlainObject(raw);
}

function isValidItem(raw: unknown): raw is GridItem {
  if (!isPlainObject(raw)) return false;
  if (typeof raw.id !== 'string') return false;
  if (typeof raw.kind !== 'string' || raw.kind.length === 0) return false;
  if (
    !Number.isFinite(raw.x) ||
    !Number.isFinite(raw.y) ||
    !Number.isFinite(raw.w) ||
    !Number.isFinite(raw.h)
  ) {
    return false;
  }
  if (raw.label !== undefined && typeof raw.label !== 'string') return false;
  if (raw.data !== undefined && !isPlainObject(raw.data)) return false;
  if (!isValidMeta(raw.meta)) return false;
  return true;
}

const IMAGE_SIZES = new Set(['cover', 'contain', 'auto']);
const IMAGE_REPEATS = new Set(['no-repeat', 'repeat', 'repeat-x', 'repeat-y']);

function isValidItemOverride(raw: unknown): raw is ItemOverride {
  if (!isPlainObject(raw)) return false;
  if (raw.x !== undefined && !Number.isFinite(raw.x)) return false;
  if (raw.y !== undefined && !Number.isFinite(raw.y)) return false;
  if (raw.w !== undefined && (!Number.isFinite(raw.w) || (raw.w as number) < 1)) return false;
  if (raw.h !== undefined && (!Number.isFinite(raw.h) || (raw.h as number) < 1)) return false;
  if (raw.hidden !== undefined && typeof raw.hidden !== 'boolean') return false;
  if (raw.data !== undefined && !isPlainObject(raw.data)) return false;
  return true;
}

function isValidSectionOverride(raw: unknown): raw is SectionOverride {
  if (!isPlainObject(raw)) return false;
  if (raw.columns !== undefined && (!Number.isFinite(raw.columns) || (raw.columns as number) < 1)) {
    return false;
  }
  if (raw.colGap !== undefined && (!Number.isFinite(raw.colGap) || (raw.colGap as number) < 0)) {
    return false;
  }
  if (raw.rowGap !== undefined && (!Number.isFinite(raw.rowGap) || (raw.rowGap as number) < 0)) {
    return false;
  }
  if (
    raw.paddingTop !== undefined &&
    (!Number.isFinite(raw.paddingTop) || (raw.paddingTop as number) < 0)
  ) {
    return false;
  }
  if (
    raw.paddingBottom !== undefined &&
    (!Number.isFinite(raw.paddingBottom) || (raw.paddingBottom as number) < 0)
  ) {
    return false;
  }
  if (raw.items !== undefined) {
    if (!isPlainObject(raw.items)) return false;
    for (const value of Object.values(raw.items)) {
      if (!isValidItemOverride(value)) return false;
    }
  }
  return true;
}

function isValidOverrides(raw: unknown): boolean {
  if (raw === undefined) return true;
  if (!isPlainObject(raw)) return false;
  for (const key of Object.keys(raw)) {
    if (!NON_DESKTOP_BREAKPOINTS.includes(key as (typeof NON_DESKTOP_BREAKPOINTS)[number])) {
      return false;
    }
    if (!isValidSectionOverride(raw[key])) return false;
  }
  return true;
}

function isValidBackground(raw: unknown): boolean {
  if (raw === undefined) return true;
  if (!isPlainObject(raw)) return false;
  if (raw.color !== undefined && typeof raw.color !== 'string') return false;
  if (raw.image !== undefined && typeof raw.image !== 'string') return false;
  if (raw.imageSize !== undefined && !IMAGE_SIZES.has(raw.imageSize as string)) return false;
  if (raw.imagePosition !== undefined && typeof raw.imagePosition !== 'string') return false;
  if (raw.imageRepeat !== undefined && !IMAGE_REPEATS.has(raw.imageRepeat as string)) return false;
  if (
    raw.objectPositionX !== undefined &&
    (!Number.isFinite(raw.objectPositionX) ||
      (raw.objectPositionX as number) < 0 ||
      (raw.objectPositionX as number) > 100)
  ) {
    return false;
  }
  if (
    raw.objectPositionY !== undefined &&
    (!Number.isFinite(raw.objectPositionY) ||
      (raw.objectPositionY as number) < 0 ||
      (raw.objectPositionY as number) > 100)
  ) {
    return false;
  }
  if (
    raw.cropScale !== undefined &&
    (!Number.isFinite(raw.cropScale) ||
      (raw.cropScale as number) < 0.4 ||
      (raw.cropScale as number) > 1)
  ) {
    return false;
  }
  if (raw.blur !== undefined && (!Number.isFinite(raw.blur) || (raw.blur as number) < 0)) {
    return false;
  }
  if (
    raw.opacity !== undefined &&
    (!Number.isFinite(raw.opacity) || (raw.opacity as number) < 0 || (raw.opacity as number) > 1)
  ) {
    return false;
  }
  if (raw.parallax !== undefined && typeof raw.parallax !== 'boolean') {
    return false;
  }
  return true;
}

function isValidSection(raw: unknown): boolean {
  if (!isPlainObject(raw)) return false;
  if (typeof raw.id !== 'string') return false;
  const columns = raw.columns;
  const colGap = raw.colGap;
  const rowGap = raw.rowGap;
  const paddingTop = raw.paddingTop;
  const paddingBottom = raw.paddingBottom;
  if (!Number.isFinite(columns) || (columns as number) < 1) return false;
  if (!Number.isFinite(colGap) || (colGap as number) < 0) return false;
  if (!Number.isFinite(rowGap) || (rowGap as number) < 0) return false;
  if (paddingTop !== undefined && (!Number.isFinite(paddingTop) || (paddingTop as number) < 0)) {
    return false;
  }
  if (
    paddingBottom !== undefined &&
    (!Number.isFinite(paddingBottom) || (paddingBottom as number) < 0)
  ) {
    return false;
  }
  if (raw.label !== undefined && typeof raw.label !== 'string') return false;
  if (!isValidMeta(raw.meta)) return false;
  if (!isValidBackground(raw.background)) return false;
  if (!Array.isArray(raw.items)) return false;
  if (!raw.items.every(isValidItem)) return false;
  return isValidOverrides(raw.overrides);
}

function isValidBreakpoints(raw: unknown): boolean {
  if (!Array.isArray(raw)) return false;
  if (raw.length === 0) return false;
  if (!raw.every((bp) => typeof bp === 'string')) return false;
  const unique = new Set(raw);
  if (unique.size !== raw.length) return false;
  if (!unique.has('desktop')) return false;
  for (const bp of unique) {
    if (!BREAKPOINTS.includes(bp as (typeof BREAKPOINTS)[number])) return false;
  }
  return true;
}

function isValidBreakpointWidths(
  raw: unknown,
  breakpoints: Breakpoint[],
  enforceOrder: boolean,
): boolean {
  if (!isPlainObject(raw)) return false;
  const enabledNonDesktop = NON_DESKTOP_BREAKPOINTS.filter((bp) => breakpoints.includes(bp));
  const keys = Object.keys(raw);
  if (keys.length !== enabledNonDesktop.length) return false;
  for (const key of keys) {
    if (!enabledNonDesktop.includes(key as (typeof NON_DESKTOP_BREAKPOINTS)[number])) {
      return false;
    }
    const value = raw[key];
    if (!Number.isFinite(value) || (value as number) < 1 || !Number.isInteger(value)) {
      return false;
    }
  }
  if (enforceOrder) {
    const widths = raw as BreakpointWidths;
    if (
      widths.mobile !== undefined &&
      widths.tablet !== undefined &&
      widths.mobile >= widths.tablet
    ) {
      return false;
    }
  }
  return true;
}

function hasUniqueLayoutIds(sections: unknown[]): boolean {
  const sectionIds = new Set<string>();
  const itemIds = new Set<string>();

  for (const section of sections) {
    if (!isPlainObject(section) || typeof section.id !== 'string') return false;
    if (sectionIds.has(section.id)) return false;
    sectionIds.add(section.id);
    if (!Array.isArray(section.items)) return false;
    for (const item of section.items) {
      if (!isPlainObject(item) || typeof item.id !== 'string') return false;
      if (itemIds.has(item.id)) return false;
      itemIds.add(item.id);
    }
  }

  return true;
}

export function isValidLayout(data: unknown): data is Layout {
  if (!isPlainObject(data)) return false;
  if (!isValidMeta(data.meta)) return false;
  if (!isValidBreakpoints(data.breakpoints)) return false;
  const breakpoints = data.breakpoints as Breakpoint[];
  if (!isValidBreakpointWidths(data.breakpointWidths, breakpoints, true)) return false;
  if (!isValidBreakpointWidths(data.breakpointPreviewWidths, breakpoints, false)) return false;
  if (!Array.isArray(data.sections)) return false;
  if (!hasUniqueLayoutIds(data.sections)) return false;
  return data.sections.every(isValidSection);
}
