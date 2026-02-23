import type { Dispatch, SetStateAction } from "react";
import type { Breakpoint, GridPlacement, PageData, PageElement } from "./types";
import type { ComponentRegistry } from "../adapters/components";
export interface VantageEditorInstance<T extends string = string> {
  pageData: PageData<T>;
  breakpoint: Breakpoint;
  selectedIds: string[];
  showGrid: boolean;
  /** True when there are unsaved changes (compare to last saved or loaded state). */
  isDirty: boolean;
  /** Alias for isDirty. Use for external Save button visibility. */
  hasUnsavedChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  historyLoading: boolean;
  gridColumns: number;
  gridRowHeight: number;
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
    sectionId?: string,
    externalId?: string
  ) => void;
  updateElement: (id: string, updates: Partial<PageElement<T>>) => void;
  /** Update only the content of an element (e.g. from a sidebar). Same as updateElement(id, { content }). */
  updateElementContent: (id: string, content: Record<string, unknown>) => void;
  updateLayout: (id: string, newPlacement: GridPlacement) => void;
  updateLayoutBulk: (
    updates: {
      id: string;
      placement: GridPlacement;
    }[]
  ) => void;
  deleteElement: (id: string) => void;
  updateZIndex: (id: string, direction: "up" | "down") => void;
  ensureBreakpointLayout: (
    element: PageElement<T>,
    targetBreakpoint?: Breakpoint
  ) => GridPlacement;
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
