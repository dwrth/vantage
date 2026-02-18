// Main package exports

// Components
export { PageEditor } from "./components/PageEditor";
export { LiveView } from "./components/LiveView";
export { default as BreakpointSwitcher } from "./components/BreakpointSwitcher";
export { default as GridOverlay } from "./components/GridOverlay";

// Hooks
export { useVantageEditor, usePageEditor } from "./hooks/usePageEditor";
export type { UseVantageEditorOptions } from "./hooks/usePageEditor";
export { usePageData } from "./hooks/usePageData";
export { usePageActions } from "./hooks/usePageActions";
export { useHistory } from "./hooks/useHistory";

// Types
export type {
  PageData,
  PageElement,
  Section,
  LayoutRect,
  ResponsiveRect,
  ElementLayout,
  Breakpoint,
} from "./core/types";

export type { PageBuilderConfig } from "./core/config";
export type { VantageEditorInstance } from "./core/editor-instance";

// Adapters
export type { StorageAdapter, HistorySnapshot } from "./adapters/storage";
export type { ComponentRegistry } from "./adapters/components";
export { LocalStorageAdapter } from "./adapters/storage";
export { defaultComponents } from "./adapters/components";

// Utils
export {
  pixelsToResponsive,
  responsiveToPixels,
  scaleLayoutToBreakpoint,
  getCanvasWidth,
  getPageTotalHeight,
  normalizePageData,
  snapToGrid,
  snapToCenteredGrid,
  snapSizeToGrid,
  getGridOffset,
  gridPercentX,
  gridPercentY,
  snapToGridPercent,
  snapToCenteredGridPercent,
  snapSizeToGridPercent,
} from "./utils";
export type { PixelRect } from "./utils";
