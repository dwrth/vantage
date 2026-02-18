import { Breakpoint } from "./types";
import { StorageAdapter } from "../adapters/storage";
import { ComponentRegistry } from "../adapters/components";
import { PageData } from "./types";
export interface PageBuilderConfig<T extends string = string> {
  gridSize?: number;
  breakpoints?: Record<Breakpoint, number>;
  defaultCanvasHeight?: number;
  storage?: StorageAdapter;
  components?: ComponentRegistry<T>;
  onSave?: (data: PageData<T>) => void;
  onElementSelect?: (elementId: string | null) => void;
  onElementUpdate?: (elementId: string, updates: any) => void;
  autoSaveDelay?: number;
  maxHistorySize?: number;
  persistHistory?: boolean;
}
export declare const defaultConfig: Required<
  Omit<
    PageBuilderConfig,
    "storage" | "components" | "onSave" | "onElementSelect" | "onElementUpdate"
  >
>;
//# sourceMappingURL=config.d.ts.map
