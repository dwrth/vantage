import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import {
  createContext,
  useContext,
  type MouseEvent,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import type { GridMinSize } from '../lib/grid';
import type { LayoutChangeOptions } from '../lib/diff';
import type { BlockAnnouncements, BlockLabels } from '../lib/keyboardLabels';
import type { SectionActionLabels } from '../lib/sectionActionLabels';
import type {
  Breakpoint,
  BreakpointWidths,
  GridItem,
  ItemMinSize,
  Layout,
  ResolvedComponentRegistry,
  Section,
} from '../types';

export type ItemContextMenuEvent = {
  sectionId: string;
  item: GridItem;
};

export type SelectionRef = {
  sectionId: string;
  itemId: string;
};

/** Size of a block being dragged in from outside the builder (e.g. a host component palette). */
export type ExternalDragItem = {
  w: number;
  h: number;
};

/** Where an external drag was dropped. `x` / `y` refer to `breakpoint`'s grid of that section. */
export type ExternalDropEvent = {
  sectionId: string;
  x: number;
  y: number;
  breakpoint: Breakpoint;
  dataTransfer: DataTransfer;
};

/** A block that overlaps other blocks without `allowOverlap`, for `renderOverlapWarning`. */
export type ItemOverlapContext = {
  sectionId: string;
  item: GridItem;
  isSelected: boolean;
  /** Ids of the blocks it overlaps at the active breakpoint. */
  overlapsWith: string[];
  /** Move the block to the first free rows below them (one undo step). */
  moveBelow: () => void;
  /** Keep the overlap as intended layering: sets `allowOverlap`, which hides the warning. */
  allowOverlap: () => void;
};

export type SectionChromeContext = {
  section: Section;
  activeBreakpoint: Breakpoint;
  /** The selected item lives in this section. */
  hasSelection: boolean;
  /** Something is being dragged over this section and would land here. */
  isDropTarget: boolean;
};

/**
 * Where `renderSectionHeader` goes. `section`: first child of the section, full section width.
 * `canvas`: inside the breakpoint-width canvas frame, flush above the grid.
 */
export type SectionHeaderPlacement = 'section' | 'canvas';

export type BuilderContextValue = {
  layout: Layout;
  enabledBreakpoints: Breakpoint[];
  breakpointWidths: BreakpointWidths;
  breakpointPreviewWidths: BreakpointWidths;
  onChange: (layout: Layout, options?: LayoutChangeOptions) => void;
  components: ResolvedComponentRegistry;
  isInteracting: boolean;
  setInteracting: (v: boolean) => void;
  /** Primary selected block: the only one, or the last one added to a multi-selection. */
  selection: SelectionRef | null;
  /** Replaces the selection with `next` (one block) or clears it. */
  setSelection: (next: SelectionRef | null) => void;
  /** Every selected block, all of one section; the primary block is last. Empty when none. */
  selectedItems: SelectionRef[];
  /** Replaces the whole selection. The last entry becomes the primary block. */
  setSelectedItems: (next: SelectionRef[]) => void;
  activeBreakpoint: Breakpoint;
  setActiveBreakpoint: (next: Breakpoint) => void;
  renderSectionHeader?: (ctx: SectionChromeContext) => ReactNode;
  sectionHeaderPlacement: SectionHeaderPlacement;
  renderSectionFooter?: (ctx: SectionChromeContext) => ReactNode;
  sectionResizeLabel?: (section: Section) => string;
  showSectionActions: boolean;
  showSectionToolbar: boolean;
  sectionActionLabels?: Partial<SectionActionLabels>;
  /** Defaults merged in. */
  blockLabels: BlockLabels;
  /** Defaults merged in. */
  announcements: BlockAnnouncements;
  /** Says `message` through the builder's polite live region. */
  announce: (message: string) => void;
  /** Built-in toolbar (align, delete) above a multi-selection. */
  showGroupToolbar: boolean;
  /** Id of the hidden keyboard help that every block references with `aria-describedby`. */
  blockInstructionsId: string;
  onDuplicateSection?: (sectionId: string) => void;
  onSaveSection?: (sectionId: string) => void;
  externalDrag?: ExternalDragItem | null;
  onExternalDrop?: (event: ExternalDropEvent) => void;
  renderEditButton?: (ctx: { sectionId: string; item: GridItem; isSelected: boolean }) => ReactNode;
  isItemRestricted?: (item: GridItem) => boolean;
  renderDragHandle?: (ctx: {
    sectionId: string;
    item: GridItem;
    isSelected: boolean;
    isDragging: boolean;
    listeners: DraggableSyntheticListeners | undefined;
    attributes: DraggableAttributes;
  }) => ReactNode;
  renderDeleteButton?: (ctx: {
    sectionId: string;
    item: GridItem;
    isSelected: boolean;
    onDelete: () => void;
  }) => ReactNode;
  onItemContextMenu?: (event: MouseEvent, ctx: ItemContextMenuEvent) => void;
  getItemMinSize?: (item: GridItem, breakpoint: Breakpoint) => ItemMinSize | null | undefined;
  /** Content minimum per mounted block (`sectionId:itemId`), in cells; read by the keyboard. */
  minSizesRef: MutableRefObject<Map<string, GridMinSize>>;
  showOverlapWarnings: boolean;
  renderOverlapWarning?: (ctx: ItemOverlapContext) => ReactNode;
};

export const BuilderContext = createContext<BuilderContextValue | null>(null);

export function useBuilderContext(): BuilderContextValue {
  const ctx = useContext(BuilderContext);
  if (!ctx) {
    throw new Error('useBuilderContext must be used within VantageBuilder');
  }
  return ctx;
}
