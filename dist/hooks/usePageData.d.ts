import React from "react";
import { PageData } from "../core/types";
import { StorageAdapter } from "../adapters/storage";
/** Options for usePageData (storage, callbacks, initial data). */
export type UsePageDataOptions<T extends string = string> = {
  storage?: StorageAdapter;
  autoSaveDelay?: number;
  onSave?: (data: PageData<T>) => void;
  /** Called when data is saved or loaded (baseline for dirty comparison). */
  onSaved?: (data: PageData<T>) => void;
  initialData?: PageData<T>;
};
/**
 * Headless hook for managing page data
 * Exposes pageData and save function for custom implementations
 */
export declare function usePageData<T extends string = string>(
  pageId: string,
  options?: UsePageDataOptions<T>
): {
  pageData: PageData<T>;
  setPageData: React.Dispatch<React.SetStateAction<PageData<T>>>;
  save: (data?: PageData<T>) => Promise<void>;
};
//# sourceMappingURL=usePageData.d.ts.map
