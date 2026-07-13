import type { SelectionRef } from '../context/BuilderContext';
import { resolveItemData } from './breakpoint';
import { resolveRegistry } from './registry';
import type {
  Breakpoint,
  ComponentRegistry,
  GridItem,
  Layout,
  ResolvedComponentRegistry,
  ResolvedKindDescriptor,
  Section,
} from '../types';

export type ResolvedSelection<TData = unknown> = {
  section: Section;
  item: GridItem<TData>;
  resolvedData: TData;
  descriptor: ResolvedKindDescriptor<TData> | undefined;
  activeBreakpoint: Breakpoint;
};

function isResolvedRegistry(
  components: ComponentRegistry | ResolvedComponentRegistry,
): components is ResolvedComponentRegistry {
  for (const entry of Object.values(components)) {
    if (typeof entry === 'function') return false;
  }
  return true;
}

/**
 * Pure resolver. Returns the section/item bundle for a selection ref, plus the
 * matching kind descriptor and breakpoint-resolved data. Returns null if the
 * selection no longer points at a real item.
 *
 * Use from any context — inside or outside the VantageBuilder subtree — when
 * the host already owns layout, selection, components, and active breakpoint.
 */
export function resolveSelectedItem<TData = unknown>(
  layout: Layout,
  selection: SelectionRef | null,
  components: ComponentRegistry | ResolvedComponentRegistry,
  activeBreakpoint: Breakpoint,
): ResolvedSelection<TData> | null {
  if (!selection) return null;
  const section = layout.sections.find((s) => s.id === selection.sectionId);
  if (!section) return null;
  const item = section.items.find((i) => i.id === selection.itemId) as GridItem<TData> | undefined;
  if (!item) return null;
  const resolved = isResolvedRegistry(components) ? components : resolveRegistry(components);
  return {
    section,
    item,
    resolvedData: resolveItemData(item, section, activeBreakpoint, layout.breakpoints) as TData,
    descriptor: resolved[item.kind] as ResolvedKindDescriptor<TData> | undefined,
    activeBreakpoint,
  };
}
