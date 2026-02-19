// Configuration interface

import { Breakpoint } from "./types";
import { StorageAdapter } from "../adapters/storage";
import { ComponentRegistry } from "../adapters/components";
import { PageData } from "./types";

export interface PageBuilderConfig<T extends string = string> {
  // Grid settings
  gridSize?: number;

  // Breakpoint widths
  breakpoints?: Record<Breakpoint, number>;

  // Canvas settings
  defaultCanvasHeight?: number;
  /** Default height (px) for a new section when using sections. */
  defaultSectionHeight?: number;
  /** Maximum width (px) for content-width sections. Defaults to desktop breakpoint. */
  maxSectionWidth?: number;

  // Storage adapter
  storage?: StorageAdapter;
  /** If you already have page data (e.g. from Redux), pass it so the first load uses it and the editor doesn't flash. */
  initialData?: PageData<T>;

  // Component registry
  components?: ComponentRegistry<T>;

  // Callbacks
  onSave?: (data: PageData<T>) => void;
  onElementSelect?: (elementId: string | null) => void;
  onElementUpdate?: (elementId: string, updates: any) => void;
  /** Called when dirty state changes (e.g. for external Save button visibility). */
  onDirtyChange?: (dirty: boolean) => void;

  // Auto-save settings
  autoSaveDelay?: number; // milliseconds

  // History settings
  maxHistorySize?: number; // Maximum number of undo/redo steps (default: 50)
  persistHistory?: boolean; // Persist history to server (default: false)
}

export const defaultConfig: Required<
  Omit<
    PageBuilderConfig,
    | "storage"
    | "components"
    | "onSave"
    | "onElementSelect"
    | "onElementUpdate"
    | "onDirtyChange"
    | "initialData"
  >
> = {
  gridSize: 50,
  breakpoints: {
    desktop: 1200,
    tablet: 768,
    mobile: 375,
  },
  defaultCanvasHeight: 800,
  defaultSectionHeight: 600,
  maxSectionWidth: 1200,
  autoSaveDelay: 3000,
  maxHistorySize: 50,
  persistHistory: false,
};
