// VantageEditor instance type - the single source of truth for the page editor.
// Package users can wire this instance to their own UI (toolbar, sidebar, etc.).

import type { Dispatch, SetStateAction } from "react";
import type { Breakpoint, LayoutRect, PageData, PageElement } from "./types";
import type { ComponentRegistry } from "../adapters/components";

export interface VantageEditorInstance<T extends string = string> {
  // State
  pageData: PageData<T>;
  breakpoint: Breakpoint;
  selectedIds: string[];
  showGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
  historyLoading: boolean;
  gridSize: number;
  breakpoints: Record<Breakpoint, number>;
  canvasHeight: number;
  defaultSectionHeight: number;

  // Setters
  setBreakpoint: (breakpoint: Breakpoint) => void;
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setShowGrid: (show: boolean) => void;
  setPageData: Dispatch<SetStateAction<PageData<T>>>;

  /** Set selected element ids and notify onElementSelect callback. */
  selectElements: (ids: string[] | null) => void;

  // Element actions
  addElement: (
    type: T,
    defaultContent?: Record<string, unknown>,
    sectionId?: string,
    externalId?: string
  ) => void;
  updateElement: (id: string, updates: Partial<PageElement<T>>) => void;
  updateLayout: (id: string, newRect: LayoutRect) => void;
  updateLayoutBulk: (updates: { id: string; rect: LayoutRect }[]) => void;
  deleteElement: (id: string) => void;
  updateZIndex: (id: string, direction: "up" | "down") => void;
  ensureBreakpointLayout: (
    element: PageElement<T>,
    targetBreakpoint?: Breakpoint
  ) => LayoutRect;

  // Section actions
  addSection: (fullWidth?: boolean) => void;
  deleteSection: (sectionId: string) => void;
  updateSectionHeight: (sectionId: string, height: number) => void;
  updateSectionFullWidth: (sectionId: string, fullWidth: boolean) => void;

  // History
  undo: () => void;
  redo: () => void;
  save: () => void;

  // Config for rendering (e.g. LiveView or custom canvas)
  components: ComponentRegistry<T>;
}
