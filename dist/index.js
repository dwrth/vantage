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
