import { useBuilderContext } from '../context/BuilderContext';
import { resolveEffectiveItemData } from '../lib/entities';
import { sameRef, toggleSelection } from '../lib/selection';
import type { SelectionRef } from '../context/BuilderContext';
import { useResolveItemData } from './useItemData';

export function useSelection() {
  const { selection, setSelection, selectedItems, setSelectedItems } = useBuilderContext();
  return {
    /** Primary selected block (the last one added). */
    selection,
    setSelection,
    clearSelection: () => setSelection(null),
    /** Whether the block is the primary selected block. */
    isSelected: (sectionId: string, itemId: string) =>
      selection?.sectionId === sectionId && selection?.itemId === itemId,
    /** Every selected block, all of one section; the primary one is last. */
    selectedItems,
    setSelectedItems,
    /** Adds the block to the selection or removes it (Shift-click). */
    toggleSelected: (ref: SelectionRef) => setSelectedItems(toggleSelection(selectedItems, ref)),
    /** Whether the block is part of the selection. */
    isInSelection: (sectionId: string, itemId: string) =>
      selectedItems.some((ref) => sameRef(ref, { sectionId, itemId })),
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
