import { useState, useCallback, useRef, useEffect } from "react";
import { PageData } from "../core/types";
import { StorageAdapter, HistorySnapshot } from "../adapters/storage";

interface HistoryState<T extends string = string> {
  past: PageData<T>[];
  present: PageData<T>;
  future: PageData<T>[];
}

/**
 * Hook for managing undo/redo history with optional server-side persistence
 */
export function useHistory<T extends string = string>(
  initialData: PageData<T>,
  maxHistorySize: number = 50,
  options?: {
    storage?: StorageAdapter;
    pageId?: string;
    persistToServer?: boolean;
  }
) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialData,
    future: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const persistToServer = options?.persistToServer ?? false;
  const storage = options?.storage;
  const pageId = options?.pageId;

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Load history from server on mount
  useEffect(() => {
    if (!persistToServer || !storage?.loadHistory || !pageId) {
      setIsLoading(false);
      return;
    }

    const loadHistory = async () => {
      try {
        if (!storage.loadHistory) return;
        const loaded = await Promise.resolve(storage.loadHistory(pageId));
        if (loaded && loaded.length > 0) {
          // Restore history from server
          const past = loaded.slice(0, -1).map(snap => snap.data);
          const present = loaded[loaded.length - 1].data;

          setHistory({
            past: past as PageData<T>[],
            present: present as PageData<T>,
            future: [],
          });
        }
      } catch (error) {
        console.error("Failed to load history from server:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [persistToServer, storage, pageId]);

  // Persist history to server (debounced)
  const persistHistoryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistHistory = useCallback(() => {
    if (!persistToServer || !storage?.saveHistory || !pageId) return;

    // Debounce persistence
    if (persistHistoryRef.current) {
      clearTimeout(persistHistoryRef.current);
    }

    persistHistoryRef.current = setTimeout(() => {
      // Get current history state
      setHistory(current => {
        const snapshots: HistorySnapshot[] = [
          ...current.past.map(data => ({ data, timestamp: Date.now() })),
          { data: current.present, timestamp: Date.now() },
        ];

        // Only persist recent history (last maxHistorySize)
        const recentSnapshots = snapshots.slice(-maxHistorySize);

        if (storage.saveHistory) {
          Promise.resolve(storage.saveHistory(pageId, recentSnapshots)).catch(
            error => {
              console.error("Failed to persist history to server:", error);
            }
          );
        }

        return current; // Don't modify state
      });
    }, 250); // 250ms debounce
  }, [persistToServer, storage, pageId, maxHistorySize]);

  const updateHistory = useCallback(
    (newPresent: PageData<T>, addToHistory: boolean = true) => {
      if (addToHistory) {
        setHistory(prev => {
          const newPast = [...prev.past, prev.present];
          // Limit history size
          const trimmedPast =
            newPast.length > maxHistorySize
              ? newPast.slice(-maxHistorySize)
              : newPast;

          const newState = {
            past: trimmedPast,
            present: newPresent,
            future: [], // Clear future when new action is performed
          };

          // Persist to server after state update
          setTimeout(() => {
            persistHistory();
          }, 0);

          return newState;
        });
      } else {
        // Silent update (for undo/redo - handled separately)
        setHistory(prev => ({
          ...prev,
          present: newPresent,
        }));
      }
    },
    [maxHistorySize, persistHistory]
  );

  const undo = useCallback((): PageData<T> | null => {
    if (!canUndo) return null;

    let previousState: PageData<T> | null = null;
    setHistory(prev => {
      const previous = prev.past[prev.past.length - 1];
      previousState = previous;
      const newPast = prev.past.slice(0, -1);

      const newState = {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };

      // Persist undo to server
      setTimeout(() => {
        persistHistory();
      }, 0);

      return newState;
    });

    return previousState;
  }, [canUndo, persistHistory]);

  const redo = useCallback((): PageData<T> | null => {
    if (!canRedo) return null;

    let nextState: PageData<T> | null = null;
    setHistory(prev => {
      const next = prev.future[0];
      nextState = next;
      const newFuture = prev.future.slice(1);

      const newState = {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };

      // Persist redo to server
      setTimeout(() => {
        persistHistory();
      }, 0);

      return newState;
    });

    return nextState;
  }, [canRedo, persistHistory]);

  // Initialize present with initialData only once (but after server load if enabled)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && !isLoading) {
      initializedRef.current = true;
      // Only initialize if history wasn't loaded from server
      if (!persistToServer || !storage?.loadHistory) {
        setHistory({
          past: [],
          present: initialData,
          future: [],
        });
      }
    }
  }, [isLoading, persistToServer, storage, initialData]);

  const clearHistory = useCallback(() => {
    setHistory({
      past: [],
      present: history.present,
      future: [],
    });

    // Clear server history
    if (persistToServer && storage?.clearHistory && pageId) {
      Promise.resolve(storage.clearHistory(pageId)).catch(error => {
        console.error("Failed to clear history on server:", error);
      });
    }
  }, [history.present, persistToServer, storage, pageId]);

  return {
    present: history.present,
    canUndo,
    canRedo,
    isLoading,
    updateHistory,
    undo,
    redo,
    clearHistory,
  };
}
