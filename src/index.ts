export { VantageBuilder } from './components/Builder';
export type {
  VantageBuilderProps,
  ItemChromeRenderProps,
  ItemEditButtonRenderProps,
  ItemDragHandleRenderProps,
  ItemDeleteButtonRenderProps,
  SectionChromeRenderProps,
  SectionHeaderRenderProps,
  SectionFooterRenderProps,
} from './components/Builder';
export { VantagePreview } from './components/VantagePreview';
export type { VantagePreviewProps } from './components/VantagePreview';
export { VantageInspector } from './components/VantageInspector';
export type { VantageInspectorProps } from './components/VantageInspector';

export type {
  Layout,
  Section,
  SectionBackground,
  SectionBackgroundImageRepeat,
  SectionBackgroundImageSize,
  SectionOverride,
  ItemOverride,
  Breakpoint,
  BreakpointWidths,
  GridItem,
  ComponentRegistry,
  PreviewRendererProps,
  EditRendererProps,
  KindDescriptor,
  KindDefaults,
  InspectorScope,
  InspectorChangeOpts,
  InspectorProps,
  ItemDataChangeEvent,
  ResolvedComponentRegistry,
  ResolvedKindDescriptor,
} from './types';

export {
  DEFAULT_SECTION,
  DEFAULT_SECTION_PADDING_Y,
  BREAKPOINTS,
  BREAKPOINT_MIN_WIDTH,
  NON_DESKTOP_BREAKPOINTS,
  DEFAULT_BREAKPOINT_WIDTHS,
  DEFAULT_BREAKPOINT_PREVIEW_WIDTHS,
  DEFAULT_TABLET_COLUMNS_RATIO,
  DEFAULT_MOBILE_COLUMNS,
} from './types';

export {
  defineKind,
  resolveRegistry,
  resolveRenderer,
  resolveDescriptorForKind,
} from './lib/registry';
export type { RenderSurface } from './lib/registry';

export {
  createEmptyLayout,
  exportLayout,
  addSection,
  removeSection,
  updateSection,
  updateLayoutMeta,
  updateSectionMeta,
  updateItemMeta,
  updateItemData,
  addItem,
  moveItem,
  resizeItem,
  removeItem,
  setSectionOverride,
  clearSectionOverride,
  clearItemOverride,
  setItemHidden,
  bringItemForward,
  sendItemBackward,
  bringItemToFront,
  sendItemToBack,
  reorderItemAtIndex,
  importLayout,
  clearLayout,
  setLayoutBreakpoints,
  setBreakpointWidth,
  setBreakpointPreviewWidth,
} from './mutations/layout';

export type { SelectionRef } from './context/BuilderContext';
export { useSelection, useSelectedItem } from './hooks/useSelection';

export type { AddItemDefaults } from './mutations/layout';

export { isValidLayout } from './lib/validate';

export {
  resolveSection,
  resolveItem,
  resolveItemData,
  resolveBreakpointFromWidth,
  resolveBreakpointFromLayout,
  defaultColumnsForBreakpoint,
  hasItemOverride,
  getEnabledBreakpoints,
  getBreakpointWidths,
  getBreakpointPreviewWidths,
  isBreakpointEnabled,
} from './lib/breakpoint';

export type { ResolvedSectionLayout, ResolvedItemLayout } from './lib/breakpoint';

export { resolveSelectedItem } from './lib/inspector';
export type { ResolvedSelection } from './lib/inspector';

export {
  diffLayouts,
  type LayoutChangeset,
  type ItemAddedEvent,
  type ItemRemovedEvent,
  type ItemUpdatedEvent,
  type ItemMovedEvent,
  type SectionAddedEvent,
  type SectionRemovedEvent,
} from './lib/diff';

export {
  clampItem,
  nextSlot,
  deltaToGrid,
  getCellWidth,
  getCellHeight,
  getCellXStep,
  getFlexRowHeight,
  getContentMaxWidth,
  pxToCell,
  overlaps,
  pointerHitsItem,
  itemsAtPointer,
  CELL_MAX_PX,
  ROW_MAX_PX,
  MOBILE_BREAKPOINT_PX,
} from './lib/grid';
