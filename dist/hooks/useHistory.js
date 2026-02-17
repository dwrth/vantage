import { useState, useCallback, useRef, useEffect } from 'react';
/**
 * Hook for managing undo/redo history
 */
export function useHistory(initialData, maxHistorySize = 50) {
    const [history, setHistory] = useState({
        past: [],
        present: initialData,
        future: [],
    });
    const canUndo = history.past.length > 0;
    const canRedo = history.future.length > 0;
    const updateHistory = useCallback((newPresent, addToHistory = true) => {
        if (addToHistory) {
            setHistory((prev) => {
                const newPast = [...prev.past, prev.present];
                // Limit history size
                const trimmedPast = newPast.length > maxHistorySize
                    ? newPast.slice(-maxHistorySize)
                    : newPast;
                return {
                    past: trimmedPast,
                    present: newPresent,
                    future: [], // Clear future when new action is performed
                };
            });
        }
        else {
            // Silent update (for undo/redo)
            setHistory((prev) => ({
                ...prev,
                present: newPresent,
            }));
        }
    }, [maxHistorySize]);
    const undo = useCallback(() => {
        if (!canUndo)
            return null;
        setHistory((prev) => {
            const previous = prev.past[prev.past.length - 1];
            const newPast = prev.past.slice(0, -1);
            return {
                past: newPast,
                present: previous,
                future: [prev.present, ...prev.future],
            };
        });
        return history.past[history.past.length - 1];
    }, [canUndo, history.past]);
    const redo = useCallback(() => {
        if (!canRedo)
            return null;
        setHistory((prev) => {
            const next = prev.future[0];
            const newFuture = prev.future.slice(1);
            return {
                past: [...prev.past, prev.present],
                present: next,
                future: newFuture,
            };
        });
        return history.future[0];
    }, [canRedo, history.future]);
    const clearHistory = useCallback(() => {
        setHistory({
            past: [],
            present: history.present,
            future: [],
        });
    }, [history.present]);
    // Initialize present with initialData only once
    const initializedRef = useRef(false);
    useEffect(() => {
        if (!initializedRef.current) {
            initializedRef.current = true;
            setHistory({
                past: [],
                present: initialData,
                future: [],
            });
        }
    }, []); // Only run once on mount
    return {
        present: history.present,
        canUndo,
        canRedo,
        updateHistory,
        undo,
        redo,
        clearHistory,
    };
}
