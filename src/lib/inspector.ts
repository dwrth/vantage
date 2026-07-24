import type { SelectionRef } from '../context/BuilderContext';
import { resolveEffectiveItemData } from './entities';
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

/**
 * Pure resolver. Returns the section/item bundle for a selection ref, plus the
 * matching kind descriptor and effective data (entity ∪ breakpoint merge).
 * Pass `entityData` when resolving outside `ItemDataProvider`.
 */
export function resolveSelectedItem<TData = unknown>(
  layout: Layout,
  selection: SelectionRef | null,
  components: ComponentRegistry | ResolvedComponentRegistry,
  activeBreakpoint: Breakpoint,
  entityData?: unknown,
): ResolvedSelection<TData> | null {
  if (!selection) return null;
  const section = layout.sections.find((s) => s.id === selection.sectionId);
  if (!section) return null;
  const item = section.items.find((i) => i.id === selection.itemId) as GridItem<TData> | undefined;
  if (!item) return null;
  const resolved = resolveRegistry(components);
  return {
    section,
    item,
    resolvedData: resolveEffectiveItemData(
      item,
      section,
      activeBreakpoint,
      layout.breakpoints,
      entityData,
    ) as TData,
    descriptor: resolved[item.kind] as ResolvedKindDescriptor<TData> | undefined,
    activeBreakpoint,
  };
}
