// Main package exports
// Components
export { PageEditor } from "./components/PageEditor";
export { LiveView } from "./components/LiveView";
export { default as BreakpointSwitcher } from "./components/BreakpointSwitcher";
export { default as GridOverlay } from "./components/GridOverlay";
// Hooks
export { useVantageEditor, usePageEditor } from "./hooks/usePageEditor";
export { usePageData } from "./hooks/usePageData";
export { usePageActions } from "./hooks/usePageActions";
export { useHistory } from "./hooks/useHistory";
export { LocalStorageAdapter } from "./adapters/storage";
export { defaultComponents } from "./adapters/components";
// Utils (grid-based layout)
export {
  getCanvasWidth,
  getSectionRowCount,
  gridPlacementToCss,
  findNextGridPlacement,
  ensureBreakpointLayout,
  marqueePxToGridRange,
  gridPlacementOverlapsRange,
  getPageTotalHeight,
  normalizePageData,
} from "./utils";
