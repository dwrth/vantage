import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { createContext, useContext, type MouseEvent, type ReactNode } from 'react';
import type { LayoutChangeOptions } from '../lib/diff';
import type { BlockLabels } from '../lib/keyboardLabels';
import type { SectionActionLabels } from '../lib/sectionActionLabels';
import type {
  Breakpoint,
  BreakpointWidths,
  GridItem,
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

export type SectionChromeContext = {
  section: Section;
  activeBreakpoint: Breakpoint;
  /** The selected item lives in this section. */
  hasSelection: boolean;
  /** Something is being dragged over this section and would land here. */
  isDropTarget: boolean;
};

export type BuilderContextValue = {
  layout: Layout;
  enabledBreakpoints: Breakpoint[];
  breakpointWidths: BreakpointWidths;
  breakpointPreviewWidths: BreakpointWidths;
  onChange: (layout: Layout, options?: LayoutChangeOptions) => void;
  components: ResolvedComponentRegistry;
  isInteracting: boolean;
  setInteracting: (v: boolean) => void;
  selection: SelectionRef | null;
  setSelection: (next: SelectionRef | null) => void;
  activeBreakpoint: Breakpoint;
  setActiveBreakpoint: (next: Breakpoint) => void;
  renderSectionHeader?: (ctx: SectionChromeContext) => ReactNode;
  renderSectionFooter?: (ctx: SectionChromeContext) => ReactNode;
  sectionResizeLabel?: (section: Section) => string;
  showSectionActions: boolean;
  sectionActionLabels?: Partial<SectionActionLabels>;
  /** Defaults merged in. */
  blockLabels: BlockLabels;
  /** Id of the hidden keyboard help that every block references with `aria-describedby`. */
  blockInstructionsId: string;
  onDuplicateSection?: (sectionId: string) => void;
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
};

export const BuilderContext = createContext<BuilderContextValue | null>(null);

export function useBuilderContext(): BuilderContextValue {
  const ctx = useContext(BuilderContext);
  if (!ctx) {
    throw new Error('useBuilderContext must be used within VantageBuilder');
  }
  return ctx;
}
