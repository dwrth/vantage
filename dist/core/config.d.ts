import { Breakpoint } from "./types";
import { StorageAdapter } from "../adapters/storage";
import { ComponentRegistry } from "../adapters/components";
import { PageData } from "./types";
export interface PageBuilderConfig<T extends string = string> {
  gridSize?: number;
  breakpoints?: Record<Breakpoint, number>;
  defaultCanvasHeight?: number;
  /** Default height (px) for a new section when using sections. */
  defaultSectionHeight?: number;
  /** Maximum width (px) for content-width sections. Defaults to desktop breakpoint. */
  maxSectionWidth?: number;
  storage?: StorageAdapter;
  /** If you already have page data (e.g. from Redux), pass it so the first load uses it and the editor doesn't flash. */
  initialData?: PageData<T>;
  components?: ComponentRegistry<T>;
  onSave?: (data: PageData<T>) => void;
  onElementSelect?: (elementId: string | null) => void;
  onElementUpdate?: (elementId: string, updates: any) => void;
  /** Called when dirty state changes (e.g. for external Save button visibility). */
  onDirtyChange?: (dirty: boolean) => void;
  autoSaveDelay?: number;
  maxHistorySize?: number;
  persistHistory?: boolean;
}
export declare const defaultConfig: Required<
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
>;
//# sourceMappingURL=config.d.ts.map
