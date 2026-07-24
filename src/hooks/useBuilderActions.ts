import { useCallback, useMemo } from 'react';
import { resolveDescriptorForKind } from '../lib/registry';
import { useBuilderContext } from '../context/BuilderContext';
import * as mutations from '../mutations/layout';
import type { Breakpoint, Layout, Section, SectionOverride } from '../types';

export function useBuilderActions() {
  const { layout, onChange, components, activeBreakpoint } = useBuilderContext();

  const apply = useCallback(
    (next: Layout) => {
      onChange(next);
    },
    [onChange],
  );

  return useMemo(
    () => ({
      addSection: () => {
        const result = mutations.addSection(layout);
        apply(result.layout);
        return result.sectionId;
      },
      removeSection: (sectionId: string) => apply(mutations.removeSection(layout, sectionId)),
      updateSection: (sectionId: string, patch: Partial<Omit<Section, 'id' | 'items'>>) =>
        apply(mutations.updateSection(layout, sectionId, patch)),
      updateLayoutMeta: (patch: Record<string, unknown>) =>
        apply(mutations.updateLayoutMeta(layout, patch)),
      updateSectionMeta: (sectionId: string, patch: Record<string, unknown>) =>
        apply(mutations.updateSectionMeta(layout, sectionId, patch)),
      updateItemMeta: (sectionId: string, itemId: string, patch: Record<string, unknown>) =>
        apply(mutations.updateItemMeta(layout, sectionId, itemId, patch)),
      updateItemData: <TData = unknown>(
        sectionId: string,
        itemId: string,
        patch: Partial<TData>,
        breakpoint?: Breakpoint,
      ) =>
        apply(
          mutations.updateItemData<TData>(
            layout,
            sectionId,
            itemId,
            patch,
            breakpoint ?? activeBreakpoint,
          ),
        ),
      setLayoutBreakpoints: (next: Breakpoint[]) =>
        apply(mutations.setLayoutBreakpoints(layout, next)),
      setBreakpointWidth: (breakpoint: Exclude<Breakpoint, 'desktop'>, width: number) =>
        apply(mutations.setBreakpointWidth(layout, breakpoint, width)),
      setBreakpointPreviewWidth: (breakpoint: Exclude<Breakpoint, 'desktop'>, width: number) =>
        apply(mutations.setBreakpointPreviewWidth(layout, breakpoint, width)),
      setSectionOverride: (
        sectionId: string,
        breakpoint: Exclude<Breakpoint, 'desktop'>,
        patch: Omit<SectionOverride, 'items'>,
      ) => apply(mutations.setSectionOverride(layout, sectionId, breakpoint, patch)),
      clearSectionOverride: (sectionId: string, breakpoint: Exclude<Breakpoint, 'desktop'>) =>
        apply(mutations.clearSectionOverride(layout, sectionId, breakpoint)),
      clearItemOverride: (
        sectionId: string,
        breakpoint: Exclude<Breakpoint, 'desktop'>,
        itemId: string,
      ) => apply(mutations.clearItemOverride(layout, sectionId, breakpoint, itemId)),
      setItemHidden: (
        sectionId: string,
        itemId: string,
        hidden: boolean,
        breakpoint?: Breakpoint,
      ) =>
        apply(
          mutations.setItemHidden(
            layout,
            sectionId,
            itemId,
            breakpoint ?? activeBreakpoint,
            hidden,
          ),
        ),
      addItem: (sectionId: string, kind: string) => {
        const descriptor = resolveDescriptorForKind(components, kind);
        const defaults = descriptor?.defaults;
        apply(
          mutations.addItem(layout, sectionId, kind, {
            w: defaults?.w,
            h: defaults?.h,
            label: defaults?.label,
            data: defaults?.data,
          }),
        );
      },
      moveItem: (
        sectionId: string,
        itemId: string,
        x: number,
        y: number,
        breakpoint?: Breakpoint,
      ) =>
        apply(mutations.moveItem(layout, sectionId, itemId, x, y, breakpoint ?? activeBreakpoint)),
      resizeItem: (
        sectionId: string,
        itemId: string,
        w: number,
        h: number,
        breakpoint?: Breakpoint,
      ) =>
        apply(
          mutations.resizeItem(layout, sectionId, itemId, w, h, breakpoint ?? activeBreakpoint),
        ),
      removeItem: (sectionId: string, itemId: string) =>
        apply(mutations.removeItem(layout, sectionId, itemId)),
      bringItemForward: (sectionId: string, itemId: string) =>
        apply(mutations.bringItemForward(layout, sectionId, itemId)),
      sendItemBackward: (sectionId: string, itemId: string) =>
        apply(mutations.sendItemBackward(layout, sectionId, itemId)),
      bringItemToFront: (sectionId: string, itemId: string) =>
        apply(mutations.bringItemToFront(layout, sectionId, itemId)),
      sendItemToBack: (sectionId: string, itemId: string) =>
        apply(mutations.sendItemToBack(layout, sectionId, itemId)),
      importLayout: (data: Layout) => apply(mutations.importLayout(data, components)),
      clear: () => apply(mutations.clearLayout()),
    }),
    [layout, apply, components, activeBreakpoint],
  );
}
