import { PageData } from '../core/types';
/**
 * Hook for managing undo/redo history
 */
export declare function useHistory<T extends string = string>(initialData: PageData<T>, maxHistorySize?: number): {
    present: PageData<T>;
    canUndo: boolean;
    canRedo: boolean;
    updateHistory: (newPresent: PageData<T>, addToHistory?: boolean) => void;
    undo: () => PageData<T> | null;
    redo: () => PageData<T> | null;
    clearHistory: () => void;
};
//# sourceMappingURL=useHistory.d.ts.map