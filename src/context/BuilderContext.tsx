import { createContext, useContext, type MouseEvent, type ReactNode } from 'react';
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

export type BuilderContextValue = {
  layout: Layout;
  enabledBreakpoints: Breakpoint[];
  breakpointWidths: BreakpointWidths;
  breakpointPreviewWidths: BreakpointWidths;
  onChange: (layout: Layout) => void;
  components: ResolvedComponentRegistry;
  isInteracting: boolean;
  setInteracting: (v: boolean) => void;
  selection: SelectionRef | null;
  setSelection: (next: SelectionRef | null) => void;
  activeBreakpoint: Breakpoint;
  setActiveBreakpoint: (next: Breakpoint) => void;
  renderSectionHeader?: (ctx: { section: Section; activeBreakpoint: Breakpoint }) => ReactNode;
  renderSectionFooter?: (ctx: { section: Section; activeBreakpoint: Breakpoint }) => ReactNode;
  renderEditButton?: (ctx: { sectionId: string; item: GridItem; isSelected: boolean }) => ReactNode;
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
