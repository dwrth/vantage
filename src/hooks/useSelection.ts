import { useBuilderContext } from '../context/BuilderContext';
import { resolveItemData } from '../lib/breakpoint';

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
  if (!selection) return null;
  const section = layout.sections.find((s) => s.id === selection.sectionId);
  if (!section) return null;
  const item = section.items.find((i) => i.id === selection.itemId);
  if (!item) return null;
  return {
    section,
    item,
    resolvedData: resolveItemData(item, section, activeBreakpoint, layout.breakpoints),
    descriptor: components[item.kind],
    activeBreakpoint,
  };
}
