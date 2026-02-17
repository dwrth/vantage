// Main package exports

// Components
export { PageEditor } from './components/PageEditor';
export { LiveView } from './components/LiveView';
export { default as BreakpointSwitcher } from './components/BreakpointSwitcher';
export { default as GridOverlay } from './components/GridOverlay';

// Hooks
export { usePageEditor } from './hooks/usePageEditor';
export { usePageData } from './hooks/usePageData';
export { usePageActions } from './hooks/usePageActions';
export { useHistory } from './hooks/useHistory';

// Types
export type {
  PageData,
  PageElement,
  LayoutRect,
  ResponsiveRect,
  ElementLayout,
  Breakpoint,
} from './core/types';

export type { PageBuilderConfig } from './core/config';

// Adapters
export type { StorageAdapter } from './adapters/storage';
export type { ComponentRegistry } from './adapters/components';
export { LocalStorageAdapter, ApiStorageAdapter } from './adapters/storage';
export { defaultComponents } from './adapters/components';

// Utils
export {
  pixelsToResponsive,
  responsiveToPixels,
  scaleLayoutToBreakpoint,
  getCanvasWidth,
  snapToGrid,
  snapToCenteredGrid,
  snapSizeToGrid,
  getGridOffset,
} from './utils';
