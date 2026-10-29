import {
  defaultColumnsForBreakpoint,
  resolveItem,
  resolveSection,
  sectionContentRows,
  sectionRows,
} from '../lib/breakpoint';
import { clampItem, nextSlot } from '../lib/grid';
import { createId } from '../lib/id';
import {
  BREAKPOINTS,
  DEFAULT_BREAKPOINT_PREVIEW_WIDTHS,
  DEFAULT_BREAKPOINT_WIDTHS,
  DEFAULT_SECTION,
  MIN_SECTION_ROWS,
  NON_DESKTOP_BREAKPOINTS,
  type Breakpoint,
  type BreakpointWidths,
  type ComponentRegistry,
  type GridItem,
  type ItemOverride,
  type KindDescriptor,
  type Layout,
  type Section,
  type SectionOverride,
} from '../types';

export type AddItemDefaults = {
  /** Optional external stable id (for example Mongo `_id.toString()`). */
  id?: string;
  /** External entity id for host-resolved payloads. */
  ref?: string;
  /** Desktop column to place the item at. Omitted: next free slot. */
  x?: number;
  /** Desktop row to place the item at. Omitted: next free slot. */
  y?: number;
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
      ovr.paddingBottom !== undefined ||
      ovr.rows !== undefined;
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
  rows?: number,
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
    rows,
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

/** Write a section's height at `breakpoint` into its rows field. */
function withSectionRows(section: Section, breakpoint: Breakpoint, rows: number): Section {
  if (breakpoint === 'desktop') return { ...section, rows };
  return withBreakpointOverride(section, breakpoint, { rows });
}

/**
 * Freeze the section height at `breakpoint` before an item moves in, out or within it, so a
 * drag can neither grow nor shrink the section. Returns the frozen row count to clamp against.
 */
function pinSectionRows(
  section: Section,
  breakpoint: Breakpoint,
): { section: Section; rows: number } {
  const rows = sectionRows(section, breakpoint);
  if (resolveSection(section, breakpoint).rows === rows) return { section, rows };
  return { section: withSectionRows(section, breakpoint, rows), rows };
}

function descriptorForKind(registry: ComponentRegistry, kind: string): KindDescriptor | undefined {
  return registry[kind];
}

function mapItemDataForExport(item: GridItem, registry: ComponentRegistry): GridItem {
  if (item.data === undefined) return item;
  const toPersisted = descriptorForKind(registry, item.kind)?.toPersistedData;
  if (!toPersisted) return item;
  return { ...item, data: toPersisted(item.data) };
}

function mapItemDataForImport(item: GridItem, registry: ComponentRegistry): GridItem {
  const descriptor = descriptorForKind(registry, item.kind);
  let data = item.data;
  if (data !== undefined && descriptor?.fromPersistedData) {
    data = descriptor.fromPersistedData(data);
  }
  if (data !== undefined && descriptor?.validate) {
    const errors = descriptor.validate(data);
    if (Array.isArray(errors) && errors.length > 0) {
      throw new Error(
        `[vantage] importLayout: kind "${item.kind}" item "${item.id}" invalid: ${errors.join('; ')}`,
      );
    }
  }
  return data === item.data ? item : { ...item, data };
}

function mapOverrideDataForExport(
  kind: string,
  data: unknown,
  registry: ComponentRegistry,
): unknown {
  const toPersisted = descriptorForKind(registry, kind)?.toPersistedData;
  if (!toPersisted || data === undefined) return data;
  return toPersisted(data);
}

function mapOverrideDataForImport(
  kind: string,
  data: unknown,
  registry: ComponentRegistry,
): unknown {
  const descriptor = descriptorForKind(registry, kind);
  let next = data;
  if (next !== undefined && descriptor?.fromPersistedData) {
    next = descriptor.fromPersistedData(next);
  }
  if (next !== undefined && descriptor?.validate) {
    const errors = descriptor.validate(next);
    if (Array.isArray(errors) && errors.length > 0) {
      throw new Error(
        `[vantage] importLayout: kind "${kind}" override invalid: ${errors.join('; ')}`,
      );
    }
  }
  return next;
}

function mapOverridesData(
  overrides: Section['overrides'],
  items: GridItem[],
  registry: ComponentRegistry,
  mode: 'export' | 'import',
): Section['overrides'] {
  if (!overrides) return overrides;
  const kindById = new Map(items.map((item) => [item.id, item.kind]));
  const next: NonNullable<Section['overrides']> = {};
  for (const [bp, ovr] of Object.entries(overrides)) {
    if (!ovr) continue;
    if (!ovr.items) {
      next[bp as keyof typeof next] = ovr;
      continue;
    }
    const mappedItems: Record<string, ItemOverride> = {};
    for (const [id, itemOvr] of Object.entries(ovr.items)) {
      const kind = kindById.get(id);
      if (itemOvr.data === undefined || !kind) {
        mappedItems[id] = itemOvr;
        continue;
      }
      const data =
        mode === 'export'
          ? mapOverrideDataForExport(kind, itemOvr.data, registry)
          : mapOverrideDataForImport(kind, itemOvr.data, registry);
      mappedItems[id] = data === itemOvr.data ? itemOvr : { ...itemOvr, data };
    }
    next[bp as keyof typeof next] = { ...ovr, items: mappedItems };
  }
  return next;
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

export function exportLayout(layout: Layout, registry: ComponentRegistry): Layout {
  const { breakpoints, breakpointWidths, breakpointPreviewWidths } =
    withNormalizedBreakpointConfig(layout);
  return {
    sections: layout.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => mapItemDataForExport(item, registry)),
      overrides: mapOverridesData(section.overrides, section.items, registry, 'export'),
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
  return insertSection(layout, layout.sections.length);
}

/** Insert an empty section at `index` (clamped), e.g. between two sections. */
export function insertSection(
  layout: Layout,
  index: number,
): { layout: Layout; sectionId: string } {
  const id = createId();
  const count = layout.sections.length + 1;
  const section: Section = {
    id,
    label: `Section ${count}`,
    ...DEFAULT_SECTION,
    items: [],
  };
  const at = Math.max(0, Math.min(Math.round(index), layout.sections.length));
  const sections = [...layout.sections];
  sections.splice(at, 0, section);
  return { layout: { ...layout, sections }, sectionId: id };
}

/** Move a section to `toIndex` (clamped); the other sections keep their order. */
export function moveSection(layout: Layout, sectionId: string, toIndex: number): Layout {
  const from = layout.sections.findIndex((s) => s.id === sectionId);
  if (from < 0) return layout;
  const to = Math.max(0, Math.min(Math.round(toIndex), layout.sections.length - 1));
  if (from === to) return layout;
  const sections = [...layout.sections];
  const [section] = sections.splice(from, 1);
  sections.splice(to, 0, section);
  return { ...layout, sections };
}

/** Move a section `delta` places (negative: up). */
export function moveSectionBy(layout: Layout, sectionId: string, delta: number): Layout {
  const from = layout.sections.findIndex((s) => s.id === sectionId);
  if (from < 0) return layout;
  return moveSection(layout, sectionId, from + delta);
}

/**
 * Identity of a copied item. Defaults: a fresh `createId()` and the source's `ref`. Hosts that keep
 * item data in external entities return the id/ref of the entity they cloned for it.
 */
export type CloneItemOptions = {
  cloneItem?: (source: GridItem) => Partial<Pick<GridItem, 'id' | 'ref'>>;
};

/** Result of a copy: the next layout plus source item id → new item id. */
export type CloneItemsResult = { layout: Layout; ids: Record<string, string> };

function cloneJson<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function cloneIdentity(
  source: GridItem,
  taken: Set<string>,
  options: CloneItemOptions,
): Pick<GridItem, 'id'> & Partial<Pick<GridItem, 'ref'>> {
  const identity = options.cloneItem?.(source) ?? {};
  let id = identity.id ?? createId();
  if (taken.has(id)) id = createId();
  taken.add(id);
  return identity.ref !== undefined ? { id, ref: identity.ref } : { id };
}

/**
 * Copy a section with all its items, breakpoint overrides and background, and insert it right
 * after the original. Items get new ids (see `CloneItemOptions`).
 */
export function duplicateSection(
  layout: Layout,
  sectionId: string,
  options: CloneItemOptions = {},
): CloneItemsResult & { sectionId: string | null } {
  const index = layout.sections.findIndex((s) => s.id === sectionId);
  if (index < 0) return { layout, ids: {}, sectionId: null };
  const source = layout.sections[index];
  const taken = new Set<string>();
  const ids: Record<string, string> = {};
  const items = source.items.map((item) => {
    const identity = cloneIdentity(item, taken, options);
    ids[item.id] = identity.id;
    return { ...cloneJson(item), ...identity };
  });
  let overrides: Section['overrides'];
  if (source.overrides) {
    overrides = {};
    for (const bp of NON_DESKTOP_BREAKPOINTS) {
      const ovr = source.overrides[bp];
      if (!ovr) continue;
      const { items: ovrItems, ...fields } = ovr;
      const next: SectionOverride = cloneJson(fields);
      if (ovrItems) {
        next.items = {};
        for (const [itemId, itemOvr] of Object.entries(ovrItems)) {
          if (ids[itemId]) next.items[ids[itemId]] = cloneJson(itemOvr);
        }
      }
      overrides[bp] = next;
    }
  }
  const fields: Partial<Section> = { ...source };
  delete fields.items;
  delete fields.overrides;
  const copy: Section = pruneSectionOverrides({
    ...cloneJson(fields),
    columns: source.columns,
    colGap: source.colGap,
    rowGap: source.rowGap,
    id: createId(),
    items,
    ...(overrides ? { overrides } : {}),
  });
  const sections = [...layout.sections];
  sections.splice(index + 1, 0, copy);
  return { layout: { ...layout, sections }, ids, sectionId: copy.id };
}

/**
 * Serialisable copy of some items of a section (e.g. for a clipboard): their desktop placement,
 * `data` / `meta`, and per-breakpoint overrides keyed by the source item ids. Paste with
 * `pasteItems`, which assigns new ids.
 */
export type ItemClipboard = {
  type: 'vantage/items';
  version: 1;
  /** Desktop column count of the source section. */
  columns: number;
  /** Copied items in stack order (back to front), with their source ids. */
  items: GridItem[];
  overrides: Partial<Record<NonDesktopBreakpoint, Record<string, ItemOverride>>>;
};

export function isItemClipboard(value: unknown): value is ItemClipboard {
  return (
    isPlainObject(value) &&
    value.type === 'vantage/items' &&
    value.version === 1 &&
    Array.isArray(value.items) &&
    isPlainObject(value.overrides)
  );
}

/** Copy `itemIds` of a section. Returns `null` when none of them exist. */
export function copyItems(
  layout: Layout,
  sectionId: string,
  itemIds: string[],
): ItemClipboard | null {
  const section = layout.sections.find((s) => s.id === sectionId);
  if (!section) return null;
  const wanted = new Set(itemIds);
  const items = section.items.filter((item) => wanted.has(item.id));
  if (items.length === 0) return null;
  const overrides: ItemClipboard['overrides'] = {};
  for (const bp of NON_DESKTOP_BREAKPOINTS) {
    const ovrItems = section.overrides?.[bp]?.items;
    if (!ovrItems) continue;
    const picked: Record<string, ItemOverride> = {};
    for (const item of items) {
      if (ovrItems[item.id]) picked[item.id] = ovrItems[item.id];
    }
    if (Object.keys(picked).length > 0) overrides[bp] = picked;
  }
  return cloneJson({
    type: 'vantage/items',
    version: 1,
    columns: section.columns,
    items,
    overrides,
  });
}

const PLACEMENT_KEYS = ['x', 'y', 'w', 'h'] as const;

/**
 * Paste copied items into a section, below its content: the copies keep their placement relative
 * to each other on every breakpoint, get new ids (see `CloneItemOptions`) and land on top of the
 * stack. Overrides for breakpoints the layout doesn't enable are dropped.
 */
export function pasteItems(
  layout: Layout,
  sectionId: string,
  clipboard: ItemClipboard,
  options: CloneItemOptions = {},
): CloneItemsResult {
  const target = layout.sections.find((s) => s.id === sectionId);
  if (!target || clipboard.items.length === 0) return { layout, ids: {} };

  const taken = new Set(target.items.map((item) => item.id));
  const ids: Record<string, string> = {};
  const top = Math.min(...clipboard.items.map((item) => item.y));
  const below = nextSlot(target.items).y;
  const copies: GridItem[] = clipboard.items.map((source) => {
    const identity = cloneIdentity(source, taken, options);
    ids[source.id] = identity.id;
    const placement = clampItem(
      { x: source.x, y: below + source.y - top, w: source.w, h: source.h },
      target.columns,
    );
    return { ...cloneJson(source), ...identity, ...placement };
  });

  let next: Section = { ...target, items: [...target.items, ...copies] };
  for (const bp of NON_DESKTOP_BREAKPOINTS) {
    const copied = clipboard.overrides[bp];
    if (!copied || !layout.breakpoints.includes(bp)) continue;
    const placed = Object.values(copied).filter((ovr) => ovr.y !== undefined);
    const bpTop = placed.length > 0 ? Math.min(...placed.map((ovr) => ovr.y!)) : 0;
    const bpBelow = sectionContentRows(target, bp, layout.breakpoints);
    const columns = resolveSection(target, bp, layout.breakpoints).columns;
    const items: Record<string, ItemOverride> = {};
    for (const [sourceId, ovr] of Object.entries(copied)) {
      const id = ids[sourceId];
      if (!id) continue;
      const patch: ItemOverride = cloneJson(ovr);
      if (PLACEMENT_KEYS.some((key) => ovr[key] !== undefined)) {
        const copy = copies.find((item) => item.id === id)!;
        const placement = clampItem(
          {
            x: ovr.x ?? copy.x,
            y: ovr.y !== undefined ? bpBelow + ovr.y - bpTop : copy.y,
            w: ovr.w ?? copy.w,
            h: ovr.h ?? copy.h,
          },
          columns,
        );
        Object.assign(patch, placement);
      }
      items[id] = patch;
    }
    next = withBreakpointOverride(next, bp, { items });
  }

  return {
    layout: { ...layout, sections: mapSection(layout.sections, sectionId, () => next) },
    ids,
  };
}

/** Duplicate items within their section (copy + paste below the content). */
export function duplicateItems(
  layout: Layout,
  sectionId: string,
  itemIds: string[],
  options: CloneItemOptions = {},
): CloneItemsResult {
  const clipboard = copyItems(layout, sectionId, itemIds);
  if (!clipboard) return { layout, ids: {} };
  return pasteItems(layout, sectionId, clipboard, options);
}

/** Duplicate one item; returns the copy's id (`null` when the item doesn't exist). */
export function duplicateItem(
  layout: Layout,
  sectionId: string,
  itemId: string,
  options: CloneItemOptions = {},
): { layout: Layout; itemId: string | null } {
  const result = duplicateItems(layout, sectionId, [itemId], options);
  return { layout: result.layout, itemId: result.ids[itemId] ?? null };
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
    sections: mapSection(layout.sections, sectionId, (current) => {
      // An explicit row (a drop) lands inside the section; the next free slot may extend it.
      const { section, rows } =
        defaults.y !== undefined
          ? pinSectionRows(current, 'desktop')
          : { section: current, rows: undefined };
      const slot = nextSlot(section.items);
      const placement = clampItem(
        { x: defaults.x ?? slot.x, y: defaults.y ?? slot.y, w, h },
        section.columns,
        rows,
      );
      const sameKindCount = section.items.filter((i) => i.kind === kind).length;
      const existingIds = new Set(section.items.map((item) => item.id));
      let nextId = defaults.id;
      if (nextId && existingIds.has(nextId)) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn(
            `[vantage] addItem: id "${nextId}" collides in section "${section.id}"; falling back to createId()`,
          );
        }
        nextId = undefined;
      }
      const newItem: GridItem = {
        id: nextId ?? createId(),
        ...placement,
        kind,
        label: `${baseLabel} ${sameKindCount + 1}`,
        ref: defaults.ref,
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
  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (current) => {
      const { section, rows } = pinSectionRows(current, breakpoint);
      if (breakpoint !== 'desktop') {
        return writeItemOverride(section, itemId, breakpoint, { x, y }, rows);
      }
      return {
        ...section,
        items: section.items.map((item) => {
          if (item.id !== itemId) return item;
          const clamped = clampItem({ ...item, x, y }, section.columns, rows);
          return { ...item, x: clamped.x, y: clamped.y, h: clamped.h };
        }),
      };
    }),
  };
}

export type MoveItemToSectionOptions = {
  /** Target column on `breakpoint`'s grid. Omitted: next free slot. */
  x?: number;
  /** Target row on `breakpoint`'s grid. Omitted: next free slot. */
  y?: number;
  /** Grid that `x` / `y` refer to. Defaults to `'desktop'`. */
  breakpoint?: Breakpoint;
};

/**
 * Move an item into another section. The item keeps its id, size, ref, data and meta and lands
 * on top of the target stack. Desktop placement goes to `x` / `y` (or the next free slot);
 * when `breakpoint` is not desktop, `x` / `y` become that breakpoint's override instead.
 * Per-breakpoint `hidden` / `data` overrides travel along; positions from the old grid do not.
 * Same-section calls behave like `moveItem`.
 */
export function moveItemToSection(
  layout: Layout,
  fromSectionId: string,
  itemId: string,
  toSectionId: string,
  options: MoveItemToSectionOptions = {},
): Layout {
  const breakpoint = options.breakpoint ?? 'desktop';
  const source = layout.sections.find((section) => section.id === fromSectionId);
  const item = source?.items.find((i) => i.id === itemId);
  const target = layout.sections.find((section) => section.id === toSectionId);
  if (!source || !item || !target) return layout;

  if (fromSectionId === toSectionId) {
    if (options.x === undefined && options.y === undefined) return layout;
    const current = resolveItem(item, source, breakpoint);
    return moveItem(
      layout,
      fromSectionId,
      itemId,
      options.x ?? current.x,
      options.y ?? current.y,
      breakpoint,
    );
  }

  const isDesktop = breakpoint === 'desktop';
  // Neither section changes height on the breakpoint being edited.
  const pinnedSource = pinSectionRows(source, breakpoint).section;
  const { section: pinnedTarget, rows: targetRows } = pinSectionRows(target, breakpoint);
  const slot = nextSlot(target.items);
  const placement = clampItem(
    {
      x: isDesktop ? (options.x ?? slot.x) : slot.x,
      y: isDesktop ? (options.y ?? slot.y) : slot.y,
      w: item.w,
      h: item.h,
    },
    target.columns,
    isDesktop ? targetRows : undefined,
  );
  const idTaken = target.items.some((i) => i.id === item.id);
  const moved: GridItem = { ...item, ...placement, id: idTaken ? createId() : item.id };

  let nextTarget: Section = { ...pinnedTarget, items: [...pinnedTarget.items, moved] };
  for (const bp of NON_DESKTOP_BREAKPOINTS) {
    const carried = source.overrides?.[bp]?.items?.[item.id];
    const patch: ItemOverride = {};
    if (carried?.hidden !== undefined) patch.hidden = carried.hidden;
    if (carried?.data !== undefined) patch.data = carried.data;
    if (Object.keys(patch).length > 0) {
      nextTarget = withBreakpointOverride(nextTarget, bp, { items: { [moved.id]: patch } });
    }
  }
  if (!isDesktop && (options.x !== undefined || options.y !== undefined)) {
    const current = resolveItem(moved, nextTarget, breakpoint);
    nextTarget = writeItemOverride(
      nextTarget,
      moved.id,
      breakpoint,
      { x: options.x ?? current.x, y: options.y ?? current.y },
      targetRows,
    );
  }

  const nextSource = stripItemFromOverrides(
    { ...pinnedSource, items: pinnedSource.items.filter((i) => i.id !== itemId) },
    itemId,
  );

  return {
    ...layout,
    sections: layout.sections.map((section) => {
      if (section.id === fromSectionId) return nextSource;
      if (section.id === toSectionId) return nextTarget;
      return section;
    }),
  };
}

export function resizeItem(
  layout: Layout,
  sectionId: string,
  itemId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  breakpoint: Breakpoint = 'desktop',
): Layout {
  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (current) => {
      const { section, rows } = pinSectionRows(current, breakpoint);
      if (breakpoint !== 'desktop') {
        return writeItemOverride(section, itemId, breakpoint, { x, y, w, h }, rows);
      }
      return {
        ...section,
        items: section.items.map((item) => {
          if (item.id !== itemId) return item;
          const clamped = clampItem({ ...item, x, y, w, h }, section.columns, rows);
          return { ...item, x: clamped.x, y: clamped.y, w: clamped.w, h: clamped.h };
        }),
      };
    }),
  };
}

/**
 * Set a section's height in rows (the editor's resize edge). Writes `section.rows` on desktop
 * and that breakpoint's override otherwise. Never goes below the content at that breakpoint
 * or `MIN_SECTION_ROWS`.
 */
export function resizeSection(
  layout: Layout,
  sectionId: string,
  rows: number,
  breakpoint: Breakpoint = 'desktop',
): Layout {
  return {
    ...layout,
    sections: mapSection(layout.sections, sectionId, (section) => {
      const minRows = Math.max(MIN_SECTION_ROWS, sectionContentRows(section, breakpoint));
      const next = Math.max(minRows, Math.round(rows));
      if (resolveSection(section, breakpoint).rows === next) return section;
      return withSectionRows(section, breakpoint, next);
    }),
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

export function importLayout(data: Layout, registry: ComponentRegistry): Layout {
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
        items: section.items.map((item) => {
          const mapped = mapItemDataForImport(item, registry);
          return {
            ...mapped,
            ...clampItem(mapped, section.columns),
          };
        }),
        overrides: mapOverridesData(section.overrides, section.items, registry, 'import'),
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

type Placement = Pick<GridItem, 'x' | 'y' | 'w' | 'h'>;

function placementsOverlap(a: Placement, b: Placement): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Map a horizontal span from `fromColumns` onto `toColumns`, keeping relative edges. */
function scaleSpan(x: number, w: number, fromColumns: number, toColumns: number) {
  const left = Math.round((x * toColumns) / fromColumns);
  const right = Math.round(((x + w) * toColumns) / fromColumns);
  return { x: left, w: Math.max(1, right - left) };
}

/** Transitive overlap groups, e.g. text layered on top of an image. */
function overlapGroups(items: GridItem[]): GridItem[][] {
  let groups: GridItem[][] = [];
  for (const item of items) {
    const hits = groups.filter((group) => group.some((other) => placementsOverlap(other, item)));
    groups = [...groups.filter((group) => !hits.includes(group)), [...hits.flat(), item]];
  }
  return groups;
}

function scalePlacements(items: GridItem[], fromColumns: number, toColumns: number) {
  const placements: Record<string, Placement> = {};
  for (const item of items) {
    const span = scaleSpan(item.x, item.w, fromColumns, toColumns);
    placements[item.id] = clampItem({ ...span, y: item.y, h: item.h }, toColumns);
  }
  return placements;
}

/** Stack overlap groups top-to-bottom at full width; layering inside a group is kept. */
function stackPlacements(items: GridItem[], toColumns: number) {
  const groups = overlapGroups(items)
    .map((group) => ({
      items: group,
      top: Math.min(...group.map((i) => i.y)),
      bottom: Math.max(...group.map((i) => i.y + i.h)),
      left: Math.min(...group.map((i) => i.x)),
      right: Math.max(...group.map((i) => i.x + i.w)),
    }))
    .sort((a, b) => a.top - b.top || a.left - b.left);

  const placements: Record<string, Placement> = {};
  let cursor = 0;
  for (const group of groups) {
    for (const item of group.items) {
      const span = scaleSpan(item.x - group.left, item.w, group.right - group.left, toColumns);
      placements[item.id] = clampItem(
        { ...span, y: cursor + item.y - group.top, h: item.h },
        toColumns,
      );
    }
    cursor += group.bottom - group.top;
  }
  return placements;
}

/**
 * Generate a starting layout for a non-desktop breakpoint from the desktop placement.
 * Tablet scales items onto fewer columns; mobile stacks items (overlap groups stay together)
 * at full width. Overwrites `columns` and item `x/y/w/h` overrides for that breakpoint; keeps
 * gaps, paddings, `hidden` flags and `data` patches. Pass `sectionId` to arrange one section.
 */
export function autoArrangeBreakpoint(
  layout: Layout,
  breakpoint: NonDesktopBreakpoint,
  sectionId?: string,
): Layout {
  if (!layout.breakpoints.includes(breakpoint)) return layout;
  return {
    ...layout,
    sections: layout.sections.map((section) => {
      if (sectionId !== undefined && section.id !== sectionId) return section;
      const current = section.overrides?.[breakpoint];
      const columns = defaultColumnsForBreakpoint(section.columns, breakpoint);
      const visible = section.items.filter((item) => current?.items?.[item.id]?.hidden !== true);
      const placements =
        breakpoint === 'tablet'
          ? scalePlacements(visible, section.columns, columns)
          : stackPlacements(visible, columns);
      const items: Record<string, ItemOverride> = {};
      for (const item of section.items) {
        const next = { ...current?.items?.[item.id], ...placements[item.id] };
        if (Object.keys(next).length > 0) items[item.id] = next;
      }
      return pruneSectionOverrides({
        ...section,
        overrides: { ...section.overrides, [breakpoint]: { ...current, columns, items } },
      });
    }),
  };
}

export function clearLayout(): Layout {
  return createEmptyLayout();
}
