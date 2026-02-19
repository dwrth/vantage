import type { Dispatch, SetStateAction } from "react";
import type { Breakpoint, LayoutRect, PageData, PageElement } from "./types";
import type { ComponentRegistry } from "../adapters/components";
export interface VantageEditorInstance<T extends string = string> {
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
  setBreakpoint: (breakpoint: Breakpoint) => void;
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setShowGrid: (show: boolean) => void;
  setPageData: Dispatch<SetStateAction<PageData<T>>>;
  /** Set selected element ids and notify onElementSelect callback. */
  selectElements: (ids: string[] | null) => void;
  addElement: (
    type: T,
    defaultContent?: Record<string, unknown>,
    sectionId?: string
  ) => void;
  updateElement: (id: string, updates: Partial<PageElement<T>>) => void;
  updateLayout: (id: string, newRect: LayoutRect) => void;
  updateLayoutBulk: (
    updates: {
      id: string;
      rect: LayoutRect;
    }[]
  ) => void;
  deleteElement: (id: string) => void;
  updateZIndex: (id: string, direction: "up" | "down") => void;
  ensureBreakpointLayout: (
    element: PageElement<T>,
    targetBreakpoint?: Breakpoint
  ) => LayoutRect;
  addSection: (fullWidth?: boolean) => void;
  deleteSection: (sectionId: string) => void;
  updateSectionHeight: (sectionId: string, height: number) => void;
  updateSectionFullWidth: (sectionId: string, fullWidth: boolean) => void;
  undo: () => void;
  redo: () => void;
  save: () => void;
  components: ComponentRegistry<T>;
}
//# sourceMappingURL=editor-instance.d.ts.map
