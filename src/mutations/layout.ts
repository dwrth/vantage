import { resolveItem, resolveSection } from '../lib/breakpoint';
import { clampItem, nextSlot } from '../lib/grid';
import { createId } from '../lib/id';
import {
  BREAKPOINTS,
  DEFAULT_BREAKPOINT_PREVIEW_WIDTHS,
  DEFAULT_BREAKPOINT_WIDTHS,
  DEFAULT_SECTION,
  NON_DESKTOP_BREAKPOINTS,
  type Breakpoint,
  type BreakpointWidths,
  type GridItem,
  type ItemOverride,
  type Layout,
  type Section,
  type SectionOverride,
} from '../types';

export type AddItemDefaults = {
  /** Optional external stable id (for example Mongo `_id.toString()`). */
  id?: string;
  w?: number;
  h?: number;
  label?: string;
  data?: unknown;
  meta?: Record<string, unknown>;
};

type NonDesktopBreakpoint = Exclude<Breakpoint, 'desktop'>;

function normalizeLayoutBreakpoints(breakpoints: Breakpoint[]): Breakpoint[] {
  const deduped = BREAKPOINTS.filter((bp) => breakpoints.includes(bp));
  return deduped.includes('desktop') ? deduped : ['desktop'];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeBreakpointWidths(
  breakpoints: Breakpoint[],
  widths: BreakpointWidths | undefined,
): BreakpointWidths {
  const enabled = new Set(normalizeLayoutBreakpoints(breakpoints));
  const normalized: BreakpointWidths = {};
  if (enabled.has('mobile')) {
    normalized.mobile = Math.max(1, Math.round(widths?.mobile ?? DEFAULT_BREAKPOINT_WIDTHS.mobile));
  }
  if (enabled.has('tablet')) {
    const mobileWidth = normalized.mobile ?? DEFAULT_BREAKPOINT_WIDTHS.mobile;
    const tabletRaw = widths?.tablet ?? DEFAULT_BREAKPOINT_WIDTHS.tablet;
    normalized.tablet = Math.max(mobileWidth + 1, Math.round(tabletRaw));
  }
  return normalized;
}

function normalizeBreakpointPreviewWidths(
  breakpoints: Breakpoint[],
  widths: BreakpointWidths | undefined,
): BreakpointWidths {
  const enabled = new Set(normalizeLayoutBreakpoints(breakpoints));
  const normalized: BreakpointWidths = {};
  if (enabled.has('mobile')) {
    normalized.mobile = Math.max(
      1,
      Math.round(widths?.mobile ?? DEFAULT_BREAKPOINT_PREVIEW_WIDTHS.mobile),
    );
  }
  if (enabled.has('tablet')) {
    normalized.tablet = Math.max(
      1,
      Math.round(widths?.tablet ?? DEFAULT_BREAKPOINT_PREVIEW_WIDTHS.tablet),
    );
  }
  return normalized;
}

function withNormalizedBreakpointConfig(
  layout: Pick<Layout, 'breakpoints' | 'breakpointWidths' | 'breakpointPreviewWidths'>,
): {
  breakpoints: Breakpoint[];
  breakpointWidths: BreakpointWidths;
  breakpointPreviewWidths: BreakpointWidths;
} {
  const breakpoints = normalizeLayoutBreakpoints(layout.breakpoints);
  return {
    breakpoints,
    breakpointWidths: normalizeBreakpointWidths(breakpoints, layout.breakpointWidths),
    breakpointPreviewWidths: normalizeBreakpointPreviewWidths(
      breakpoints,
      layout.breakpointPreviewWidths,
    ),
  };
}

function mapSection(
  sections: Section[],
  sectionId: string,
  fn: (section: Section) => Section,
): Section[] {
  return sections.map((section) => (section.id === sectionId ? fn(section) : section));
}

function pruneSectionOverrides(section: Section): Section {
  if (!section.overrides) return section;
  const overrides = { ...section.overrides };
  for (const bp of NON_DESKTOP_BREAKPOINTS) {
    const ovr = overrides[bp];
    if (!ovr) continue;
    const hasSectionFields =
      ovr.columns !== undefined ||
      ovr.colGap !== undefined ||
      ovr.rowGap !== undefined ||
      ovr.paddingTop !== undefined ||
      ovr.paddingBottom !== undefined;
    const hasItems = ovr.items && Object.keys(ovr.items).length > 0;
    if (!hasSectionFields && !hasItems) {
      delete overrides[bp];
    }
  }
  if (Object.keys(overrides).length === 0) {
    const next: Section = { ...section };
    delete next.overrides;
    return next;
  }
  return { ...section, overrides };
}

function ensureBreakpointOverride(
  section: Section,
  breakpoint: NonDesktopBreakpoint,
): SectionOverride {
  return section.overrides?.[breakpoint] ?? {};
}

function withBreakpointOverride(
  section: Section,
  breakpoint: NonDesktopBreakpoint,
  patch: SectionOverride,
): Section {
  const current = ensureBreakpointOverride(section, breakpoint);
  const merged: SectionOverride = { ...current, ...patch };
  if (patch.items) {
    merged.items = { ...current.items, ...patch.items };
  }
  return pruneSectionOverrides({
    ...section,
    overrides: {
      ...section.overrides,
      [breakpoint]: merged,
    },
  });
}

function clearBreakpointOverride(section: Section, breakpoint: NonDesktopBreakpoint): Section {
  if (!section.overrides?.[breakpoint]) return section;
  const overrides = { ...section.overrides };
  delete overrides[breakpoint];
  return pruneSectionOverrides({ ...section, overrides });
}

function stripItemFromOverrides(section: Section, itemId: string): Section {
  if (!section.overrides) return section;
  let changed = false;
  const overrides = { ...section.overrides };
  for (const bp of NON_DESKTOP_BREAKPOINTS) {
    const ovr = overrides[bp];
    if (!ovr?.items?.[itemId]) continue;
    const items = { ...ovr.items };
    delete items[itemId];
    overrides[bp] = { ...ovr, items };
    changed = true;
  }
  if (!changed) return section;
  return pruneSectionOverrides({ ...section, overrides });
}

function writeItemOverride(
  section: Section,
  itemId: string,
  breakpoint: NonDesktopBreakpoint,
  patch: ItemOverride,
): Section {
  const item = section.items.find((i) => i.id === itemId);
  if (!item) return section;
  const resolved = resolveSection(section, breakpoint);
  const current = resolveItem(item, section, breakpoint);
  const merged = clampItem(
    {
      x: patch.x ?? current.x,
      y: patch.y ?? current.y,
      w: patch.w ?? current.w,
      h: patch.h ?? current.h,
    },
    resolved.columns,
  );
  const itemPatch: ItemOverride = { ...patch };
  if (
    patch.x !== undefined ||
    patch.y !== undefined ||
    patch.w !== undefined ||
    patch.h !== undefined
  ) {
    itemPatch.x = merged.x;
    itemPatch.y = merged.y;
    itemPatch.w = merged.w;
    itemPatch.h = merged.h;
  }
  const existing = ensureBreakpointOverride(section, breakpoint).items?.[itemId] ?? {};
  return withBreakpointOverride(section, breakpoint, {
    items: { [itemId]: { ...existing, ...itemPatch } },
  });
}

export function createEmptyLayout(): Layout {
  const breakpoints: Breakpoint[] = ['desktop', 'mobile'];
  return {
    sections: [],
    breakpoints,
    breakpointWidths: normalizeBreakpointWidths(breakpoints, undefined),
    breakpointPreviewWidths: normalizeBreakpointPreviewWidths(breakpoints, undefined),
  };
}

export function exportLayout(layout: Layout): Layout {
  const { breakpoints, breakpointWidths, breakpointPreviewWidths } =
    withNormalizedBreakpointConfig(layout);
  return {
    sections: layout.sections.map((section) => ({
      ...section,
      meta: section.meta,
    })),
    breakpoints,
    breakpointWidths,
    breakpointPreviewWidths,
    meta: layout.meta,
  };
}

export function updateLayoutMeta(layout: Layout, patch: Record<string, unknown>): Layout {
  return {
    ...layout,
    meta: { ...(layout.meta ?? {}), ...patch },
  };
}

export function updateSectionMeta(
  layout: Layout,
  sectionId: string,
  patch: Record<string, unknown>,
): Layout {
  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (section) => ({
      ...section,
      meta: { ...(section.meta ?? {}), ...patch },
    })),
  };
}

export function updateItemMeta(
  layout: Layout,
  sectionId: string,
  itemId: string,
  patch: Record<string, unknown>,
): Layout {
  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (section) => ({
      ...section,
      items: section.items.map((item) =>
        item.id !== itemId ? item : { ...item, meta: { ...(item.meta ?? {}), ...patch } },
      ),
    })),
  };
}

export function addSection(layout: Layout): { layout: Layout; sectionId: string } {
  const id = createId();
  const count = layout.sections.length + 1;
  const section: Section = {
    id,
    label: `Section ${count}`,
    ...DEFAULT_SECTION,
    items: [],
  };
  return {
    layout: { ...layout, sections: [...layout.sections, section] },
    sectionId: id,
  };
}

export function removeSection(layout: Layout, sectionId: string): Layout {
  return {
    ...layout,
    sections: layout.sections.filter((s) => s.id !== sectionId),
  };
}

export function updateSection(
  layout: Layout,
  sectionId: string,
  patch: Partial<Omit<Section, 'id' | 'items'>>,
): Layout {
  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (s) => ({ ...s, ...patch })),
  };
}

/**
 * Shallow-merge a patch into a grid item's `data`. Non-matching sections/items keep
 * their references. For nested fields, read the item and pass a full replacement.
 */
export function updateItemData<TData = unknown>(
  layout: Layout,
  sectionId: string,
  itemId: string,
  patch: Partial<TData>,
  breakpoint: Breakpoint = 'desktop',
): Layout {
  if (breakpoint !== 'desktop') {
    return {
      ...layout,
      sections: mapSection(layout.sections, sectionId, (section) => {
        const existing = ensureBreakpointOverride(section, breakpoint).items?.[itemId]?.data;
        const data = {
          ...(isPlainObject(existing) ? existing : {}),
          ...(patch as object),
        };
        return writeItemOverride(section, itemId, breakpoint, { data });
      }),
    };
  }

  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (section) => ({
      ...section,
      items: section.items.map((item) =>
        item.id !== itemId
          ? item
          : { ...item, data: { ...((item.data as object) ?? {}), ...patch } as TData },
      ),
    })),
  };
}

export function setSectionOverride(
  layout: Layout,
  sectionId: string,
  breakpoint: NonDesktopBreakpoint,
  patch: Omit<SectionOverride, 'items'>,
): Layout {
  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (section) =>
      withBreakpointOverride(section, breakpoint, patch),
    ),
  };
}

export function clearSectionOverride(
  layout: Layout,
  sectionId: string,
  breakpoint: NonDesktopBreakpoint,
): Layout {
  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (section) => {
      if (!section.overrides?.[breakpoint]) return section;
      const overrides = { ...section.overrides };
      delete overrides[breakpoint];
      if (Object.keys(overrides).length === 0) {
        const next: Section = { ...section };
        delete next.overrides;
        return next;
      }
      return { ...section, overrides };
    }),
  };
}

export function clearItemOverride(
  layout: Layout,
  sectionId: string,
  breakpoint: NonDesktopBreakpoint,
  itemId: string,
): Layout {
  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (section) => {
      const ovr = section.overrides?.[breakpoint];
      if (!ovr?.items?.[itemId]) return section;
      const items = { ...ovr.items };
      delete items[itemId];
      const nextOvr: SectionOverride = { ...ovr };
      if (Object.keys(items).length === 0) {
        delete nextOvr.items;
      } else {
        nextOvr.items = items;
      }
      return pruneSectionOverrides({
        ...section,
        overrides: { ...section.overrides, [breakpoint]: nextOvr },
      });
    }),
  };
}

export function setItemHidden(
  layout: Layout,
  sectionId: string,
  itemId: string,
  breakpoint: Breakpoint,
  hidden: boolean,
): Layout {
  if (breakpoint === 'desktop') return layout;
  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (section) =>
      writeItemOverride(section, itemId, breakpoint, { hidden }),
    ),
  };
}

export function addItem(
  layout: Layout,
  sectionId: string,
  kind: string,
  defaults: AddItemDefaults = {},
): Layout {
  const w = defaults.w ?? 3;
  const h = defaults.h ?? 2;
  const baseLabel = defaults.label ?? kind.charAt(0).toUpperCase() + kind.slice(1);

  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (section) => {
      const { x, y } = nextSlot(section.items);
      const sameKindCount = section.items.filter((i) => i.kind === kind).length;
      const existingIds = new Set(section.items.map((item) => item.id));
      let nextId = defaults.id;
      if (nextId && existingIds.has(nextId)) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn(
            `[mango] addItem: id "${nextId}" collides in section "${section.id}"; falling back to createId()`,
          );
        }
        nextId = undefined;
      }
      const newItem: GridItem = {
        id: nextId ?? createId(),
        x,
        y,
        w,
        h,
        kind,
        label: `${baseLabel} ${sameKindCount + 1}`,
        data: defaults.data,
        meta: defaults.meta,
      };
      return { ...section, items: [...section.items, newItem] };
    }),
  };
}

export function moveItem(
  layout: Layout,
  sectionId: string,
  itemId: string,
  x: number,
  y: number,
  breakpoint: Breakpoint = 'desktop',
): Layout {
  if (breakpoint === 'desktop') {
    return {
      ...layout,
      sections: mapSection(layout.sections, sectionId, (section) => ({
        ...section,
        items: section.items.map((item) => {
          if (item.id !== itemId) return item;
          const clamped = clampItem({ ...item, x, y }, section.columns);
          return { ...item, x: clamped.x, y: clamped.y };
        }),
      })),
    };
  }
  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (section) =>
      writeItemOverride(section, itemId, breakpoint, { x, y }),
    ),
  };
}

export function resizeItem(
  layout: Layout,
  sectionId: string,
  itemId: string,
  w: number,
  h: number,
  breakpoint: Breakpoint = 'desktop',
): Layout {
  if (breakpoint === 'desktop') {
    return {
      ...layout,
      sections: mapSection(layout.sections, sectionId, (section) => ({
        ...section,
        items: section.items.map((item) => {
          if (item.id !== itemId) return item;
          const clamped = clampItem({ ...item, w, h }, section.columns);
          return { ...item, w: clamped.w, h: clamped.h };
        }),
      })),
    };
  }
  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (section) =>
      writeItemOverride(section, itemId, breakpoint, { w, h }),
    ),
  };
}

export function removeItem(layout: Layout, sectionId: string, itemId: string): Layout {
  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (section) =>
      stripItemFromOverrides(
        {
          ...section,
          items: section.items.filter((item) => item.id !== itemId),
        },
        itemId,
      ),
    ),
  };
}

function reorderSectionItems(
  items: GridItem[],
  itemId: string,
  reorder: (items: GridItem[], index: number) => GridItem[],
): GridItem[] {
  const index = items.findIndex((item) => item.id === itemId);
  if (index < 0) return items;
  return reorder(items, index);
}

function reorderItem(
  layout: Layout,
  sectionId: string,
  itemId: string,
  reorder: (items: GridItem[], index: number) => GridItem[],
): Layout {
  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (section) => ({
      ...section,
      items: reorderSectionItems(section.items, itemId, reorder),
    })),
  };
}

/** Move one step toward the front (later in `items`, drawn on top). */
export function bringItemForward(layout: Layout, sectionId: string, itemId: string): Layout {
  return reorderItem(layout, sectionId, itemId, (items, index) => {
    if (index >= items.length - 1) return items;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    return next;
  });
}

/** Move one step toward the back (earlier in `items`, drawn underneath). */
export function sendItemBackward(layout: Layout, sectionId: string, itemId: string): Layout {
  return reorderItem(layout, sectionId, itemId, (items, index) => {
    if (index <= 0) return items;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    return next;
  });
}

/** Move to the front of the stack (end of `items`). */
export function bringItemToFront(layout: Layout, sectionId: string, itemId: string): Layout {
  return reorderItem(layout, sectionId, itemId, (items, index) => {
    if (index < 0 || index >= items.length - 1) return items;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.push(item);
    return next;
  });
}

/** Move to the back of the stack (start of `items`). */
export function sendItemToBack(layout: Layout, sectionId: string, itemId: string): Layout {
  return reorderItem(layout, sectionId, itemId, (items, index) => {
    if (index <= 0) return items;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    return next;
  });
}

/** Reorder by array index within a section (for layers panel drag-and-drop). */
export function reorderItemAtIndex(
  layout: Layout,
  sectionId: string,
  fromIndex: number,
  toIndex: number,
): Layout {
  if (fromIndex === toIndex) return layout;
  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (section) => {
      const { items } = section;
      if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
        return section;
      }
      const next = [...items];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return { ...section, items: next };
    }),
  };
}

export function importLayout(data: Layout): Layout {
  const { breakpoints, breakpointWidths, breakpointPreviewWidths } = withNormalizedBreakpointConfig(
    {
      breakpoints: data.breakpoints ?? ['desktop'],
      breakpointWidths: data.breakpointWidths,
      breakpointPreviewWidths: data.breakpointPreviewWidths,
    },
  );
  const enabled = new Set(breakpoints);
  return {
    breakpoints,
    breakpointWidths,
    breakpointPreviewWidths,
    meta: data.meta,
    sections: data.sections.map((section) => {
      let next: Section = {
        ...section,
        items: section.items.map((item) => ({
          ...item,
          ...clampItem(item, section.columns),
        })),
      };
      for (const bp of NON_DESKTOP_BREAKPOINTS) {
        if (!enabled.has(bp)) {
          next = clearBreakpointOverride(next, bp);
          continue;
        }
        const ovr = next.overrides?.[bp];
        if (!ovr?.items) continue;
        const columns = resolveSection(next, bp, breakpoints).columns;
        const items: Record<string, ItemOverride> = {};
        for (const [id, itemOvr] of Object.entries(ovr.items)) {
          const base = next.items.find((i) => i.id === id);
          if (!base) continue;
          const placement = resolveItem(base, next, bp, breakpoints);
          items[id] = {
            ...itemOvr,
            ...clampItem(placement, columns),
          };
        }
        next = withBreakpointOverride(next, bp, { items });
      }
      return next;
    }),
  };
}

export function setLayoutBreakpoints(layout: Layout, next: Breakpoint[]): Layout {
  const breakpoints = normalizeLayoutBreakpoints(next);
  const enabled = new Set(breakpoints);
  const widths: BreakpointWidths = { ...layout.breakpointWidths };
  const previewWidths: BreakpointWidths = { ...layout.breakpointPreviewWidths };
  for (const bp of NON_DESKTOP_BREAKPOINTS) {
    if (!enabled.has(bp)) {
      delete widths[bp];
      delete previewWidths[bp];
      continue;
    }
    if (widths[bp] === undefined) widths[bp] = DEFAULT_BREAKPOINT_WIDTHS[bp];
    if (previewWidths[bp] === undefined) previewWidths[bp] = DEFAULT_BREAKPOINT_PREVIEW_WIDTHS[bp];
  }
  const sections = layout.sections.map((section) => {
    if (!section.overrides) return section;
    const overrides = { ...section.overrides };
    for (const bp of NON_DESKTOP_BREAKPOINTS) {
      if (!enabled.has(bp)) delete overrides[bp];
    }
    if (Object.keys(overrides).length === 0) {
      const cleaned: Section = { ...section };
      delete cleaned.overrides;
      return cleaned;
    }
    return pruneSectionOverrides({ ...section, overrides });
  });
  return {
    ...layout,
    breakpoints,
    breakpointWidths: normalizeBreakpointWidths(breakpoints, widths),
    breakpointPreviewWidths: normalizeBreakpointPreviewWidths(breakpoints, previewWidths),
    sections,
  };
}

export function setBreakpointWidth(
  layout: Layout,
  breakpoint: NonDesktopBreakpoint,
  width: number,
): Layout {
  if (!layout.breakpoints.includes(breakpoint)) return layout;
  const nextWidths: BreakpointWidths = {
    ...layout.breakpointWidths,
    [breakpoint]: Math.max(1, Math.round(width)),
  };
  if (
    breakpoint === 'mobile' &&
    layout.breakpoints.includes('tablet') &&
    nextWidths.tablet !== undefined &&
    nextWidths.tablet <= (nextWidths.mobile ?? 0)
  ) {
    nextWidths.tablet = (nextWidths.mobile ?? DEFAULT_BREAKPOINT_WIDTHS.mobile) + 1;
  }
  if (breakpoint === 'tablet' && nextWidths.mobile !== undefined) {
    const tabletWidth = nextWidths.tablet ?? DEFAULT_BREAKPOINT_WIDTHS.tablet;
    if (tabletWidth <= nextWidths.mobile) {
      nextWidths.tablet = nextWidths.mobile + 1;
    }
  }
  return {
    ...layout,
    breakpointWidths: normalizeBreakpointWidths(layout.breakpoints, nextWidths),
  };
}

export function setBreakpointPreviewWidth(
  layout: Layout,
  breakpoint: NonDesktopBreakpoint,
  width: number,
): Layout {
  if (!layout.breakpoints.includes(breakpoint)) return layout;
  const nextWidths: BreakpointWidths = {
    ...layout.breakpointPreviewWidths,
    [breakpoint]: Math.max(1, Math.round(width)),
  };
  return {
    ...layout,
    breakpointPreviewWidths: normalizeBreakpointPreviewWidths(layout.breakpoints, nextWidths),
  };
}

export function clearLayout(): Layout {
  return createEmptyLayout();
}
