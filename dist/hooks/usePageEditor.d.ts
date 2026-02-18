import { PageData, Breakpoint, LayoutRect } from "../core/types";
import { PageBuilderConfig } from "../core/config";
export declare function usePageEditor<T extends string = string>(
  pageId: string,
  config?: PageBuilderConfig<T>
): {
  pageData: PageData<T>;
  breakpoint: Breakpoint;
  selectedId: string | null;
  showGrid: boolean;
  setBreakpoint: import("react").Dispatch<
    import("react").SetStateAction<Breakpoint>
  >;
  setSelectedId: import("react").Dispatch<
    import("react").SetStateAction<string | null>
  >;
  setShowGrid: import("react").Dispatch<
    import("react").SetStateAction<boolean>
  >;
  setPageData: import("react").Dispatch<
    import("react").SetStateAction<PageData<T>>
  >;
  updateLayout: (id: string, newRect: LayoutRect) => void;
  addElement: (type: T, defaultContent?: Record<string, any>) => void;
  deleteElement: (id: string) => void;
  updateZIndex: (id: string, direction: "up" | "down") => void;
  ensureBreakpointLayout: (
    element: import("..").PageElement<T>,
    targetBreakpoint?: Breakpoint
  ) => LayoutRect;
  save: (data?: PageData<T> | undefined) => Promise<void>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyLoading: boolean;
  gridSize: number;
  breakpoints: Record<Breakpoint, number>;
  canvasHeight: number;
};
//# sourceMappingURL=usePageEditor.d.ts.map
