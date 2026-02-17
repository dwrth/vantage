import { PageData } from "../core/types";
import { StorageAdapter } from "../adapters/storage";
/**
 * Hook for managing undo/redo history with optional server-side persistence
 */
export declare function useHistory<T extends string = string>(initialData: PageData<T>, maxHistorySize?: number, options?: {
    storage?: StorageAdapter;
    pageId?: string;
    persistToServer?: boolean;
}): {
    present: PageData<T>;
    canUndo: boolean;
    canRedo: boolean;
    isLoading: boolean;
    updateHistory: (newPresent: PageData<T>, addToHistory?: boolean) => void;
    undo: () => PageData<T> | null;
    redo: () => PageData<T> | null;
    clearHistory: () => void;
};
//# sourceMappingURL=useHistory.d.ts.map