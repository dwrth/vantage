import { useBuilderContext } from '../context/BuilderContext';
import { resolveEffectiveItemData } from '../lib/entities';
import { useResolveItemData } from './useItemData';

export function useSelection() {
  const { selection, setSelection } = useBuilderContext();
  return {
    selection,
    setSelection,
    clearSelection: () => setSelection(null),
    isSelected: (sectionId: string, itemId: string) =>
      selection?.sectionId === sectionId && selection?.itemId === itemId,
  };
}

export function useSelectedItem() {
  const { selection, layout, components, activeBreakpoint } = useBuilderContext();
  const resolveEntity = useResolveItemData();
  if (!selection) return null;
  const section = layout.sections.find((s) => s.id === selection.sectionId);
  if (!section) return null;
  const item = section.items.find((i) => i.id === selection.itemId);
  if (!item) return null;
  return {
    section,
    item,
    resolvedData: resolveEffectiveItemData(
      item,
      section,
      activeBreakpoint,
      layout.breakpoints,
      resolveEntity?.(item),
    ),
    descriptor: components[item.kind],
    activeBreakpoint,
  };
}
