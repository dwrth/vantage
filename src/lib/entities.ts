import type { Breakpoint, GridItem, Layout, Section } from '../types';
import { BREAKPOINTS } from '../types';
import { mergeBreakpointItemData } from './breakpoint';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Entity as base, layout/BP data wins on key conflict.
 * Non-objects: layout wins when present.
 */
export function mergeEntityAndLayoutData<TData = unknown>(
  entityData: unknown | undefined,
  layoutData: TData | undefined,
): TData | undefined {
  if (entityData === undefined) return layoutData;
  if (layoutData === undefined) return entityData as TData;
  if (isPlainObject(entityData) && isPlainObject(layoutData)) {
    return { ...entityData, ...layoutData } as TData;
  }
  return layoutData;
}

/** Effective item payload: entity (via ref) ∪ breakpoint-merged layout data. */
export function resolveEffectiveItemData<TData = unknown>(
  item: GridItem<TData>,
  section: Section,
  breakpoint: Breakpoint,
  enabled: Breakpoint[] = BREAKPOINTS,
  entityData?: unknown,
): TData | undefined {
  const layoutData = mergeBreakpointItemData(item, section, breakpoint, enabled);
  return mergeEntityAndLayoutData(entityData, layoutData);
}

function omitData<T extends { data?: unknown }>(value: T): Omit<T, 'data'> {
  const next = { ...value };
  delete next.data;
  return next;
}

/**
 * Drop payloads for items bound by `ref` (entity store owns them).
 * Inline-only items keep `data` — stripping those orphans content on reload.
 */
export function stripData(layout: Layout): Layout {
  return {
    ...layout,
    sections: layout.sections.map((section) => {
      const refIds = new Set(
        section.items.filter((item) => typeof item.ref === 'string' && item.ref.length > 0).map((i) => i.id),
      );
      return {
        ...section,
        items: section.items.map((item) => (refIds.has(item.id) ? omitData(item) : item)),
        overrides: section.overrides
          ? Object.fromEntries(
              Object.entries(section.overrides).map(([bp, ovr]) => [
                bp,
                {
                  ...ovr,
                  items: ovr.items
                    ? Object.fromEntries(
                        Object.entries(ovr.items).map(([id, itemOvr]) => [
                          id,
                          refIds.has(id) ? omitData(itemOvr) : itemOvr,
                        ]),
                      )
                    : ovr.items,
                },
              ]),
            )
          : section.overrides,
      };
    }),
  };
}

/**
 * Fill `data` from `entities[ref]` when `ref` is set and map hits.
 * Miss leaves existing `data` unchanged.
 */
export function hydrate(layout: Layout, entities: Record<string, unknown>): Layout {
  return {
    ...layout,
    sections: layout.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (!item.ref || !(item.ref in entities)) return item;
        return { ...item, data: entities[item.ref] };
      }),
    })),
  };
}
