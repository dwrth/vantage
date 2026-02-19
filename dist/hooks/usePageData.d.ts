import React from "react";
import { PageData } from "../core/types";
import { StorageAdapter } from "../adapters/storage";
/**
 * Headless hook for managing page data
 * Exposes pageData and save function for custom implementations
 */
export declare function usePageData<T extends string = string>(
  pageId: string,
  options?: {
    storage?: StorageAdapter;
    autoSaveDelay?: number;
    onSave?: (data: PageData<T>) => void;
    initialData?: PageData<T>;
  }
): {
  pageData: PageData<T>;
  setPageData: React.Dispatch<React.SetStateAction<PageData<T>>>;
  save: (data?: PageData<T>) => Promise<void>;
};
//# sourceMappingURL=usePageData.d.ts.map
