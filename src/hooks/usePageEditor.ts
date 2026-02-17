import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { PageData, Breakpoint, LayoutRect } from '../core/types';
import { PageBuilderConfig, defaultConfig } from '../core/config';
import { usePageData } from './usePageData';
import { usePageActions } from './usePageActions';
import { useHistory } from './useHistory';
import { snapToGrid } from '../utils/layout';

export function usePageEditor<T extends string = string>(
  pageId: string,
  config?: PageBuilderConfig<T>
) {
  // Stabilize config callbacks to prevent infinite loops
  const onElementSelectRef = useRef(config?.onElementSelect);
  const onElementUpdateRef = useRef(config?.onElementUpdate);
  
  useEffect(() => {
    onElementSelectRef.current = config?.onElementSelect;
    onElementUpdateRef.current = config?.onElementUpdate;
  }, [config?.onElementSelect, config?.onElementUpdate]);

  const gridSize = config?.gridSize ?? defaultConfig.gridSize;
  // Memoize breakpoints to prevent recreating callbacks
  const breakpoints = useMemo(
    () => config?.breakpoints ?? defaultConfig.breakpoints,
    [config?.breakpoints]
  );
  const canvasHeight = config?.defaultCanvasHeight ?? defaultConfig.defaultCanvasHeight;

  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Use headless page data hook
  const { pageData, setPageData, save } = usePageData<T>(pageId, {
    storage: config?.storage,
    autoSaveDelay: config?.autoSaveDelay,
    onSave: config?.onSave,
  });

  // Track if we're updating from history (to avoid adding to history)
  const isHistoryUpdateRef = useRef(false);
  const prevPageDataRef = useRef<PageData<T>>(pageData);

  // History management for undo/redo
  const {
    present: historyPresent,
    canUndo,
    canRedo,
    updateHistory,
    undo: historyUndo,
    redo: historyRedo,
  } = useHistory<T>(pageData, config?.maxHistorySize ?? 50);

  // Update history when pageData changes (but not from undo/redo)
  useEffect(() => {
    if (isHistoryUpdateRef.current) {
      isHistoryUpdateRef.current = false;
      return;
    }

    const prevStr = JSON.stringify(prevPageDataRef.current);
    const currentStr = JSON.stringify(pageData);
    
    if (prevStr !== currentStr) {
      updateHistory(pageData, true);
      prevPageDataRef.current = pageData;
    }
  }, [pageData, updateHistory]);

  // Wrapper for setPageData that updates history
  const setPageDataWithHistory = useCallback(
    (updater: React.SetStateAction<PageData<T>>) => {
      setPageData((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        return next;
      });
    },
    []
  );

  // Memoize options to prevent usePageActions from recreating callbacks
  const actionsOptions = useMemo(
    () => ({
      gridSize,
      breakpoints,
      canvasHeight,
    }),
    [gridSize, breakpoints, canvasHeight]
  );

  // Use headless page actions hook (use history-aware setter)
  const {
    addElement: addElementAction,
    updateLayout: updateLayoutAction,
    deleteElement: deleteElementAction,
    updateZIndex: updateZIndexAction,
    ensureBreakpointLayout,
  } = usePageActions<T>(pageData, setPageDataWithHistory, actionsOptions);

  // Undo/Redo handlers
  const undo = useCallback(() => {
    const previous = historyUndo();
    if (previous) {
      isHistoryUpdateRef.current = true;
      setPageData(previous);
      prevPageDataRef.current = previous;
    }
  }, [historyUndo, setPageData]);

  const redo = useCallback(() => {
    const next = historyRedo();
    if (next) {
      isHistoryUpdateRef.current = true;
      setPageData(next);
      prevPageDataRef.current = next;
    }
  }, [historyRedo, setPageData]);

  const updateLayout = useCallback(
    (id: string, newRect: LayoutRect) => {
      updateLayoutAction(id, breakpoint, newRect);
      onElementUpdateRef.current?.(id, newRect);
    },
    [breakpoint, updateLayoutAction]
  );

  const addElement = useCallback(
    (type: T, defaultContent?: Record<string, any>) => {
      addElementAction(type, defaultContent);
    },
    [addElementAction]
  );

  const updateZIndex = useCallback(
    (id: string, direction: 'up' | 'down') => {
      updateZIndexAction(id, direction);
    },
    [updateZIndexAction]
  );

  const deleteElement = useCallback(
    (id: string) => {
      deleteElementAction(id);
      if (selectedId === id) {
        setSelectedId(null);
        onElementSelectRef.current?.(null);
      }
    },
    [selectedId, deleteElementAction]
  );

  const handleElementSelect = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      onElementSelectRef.current?.(id);
    },
    []
  );

  return {
    // State
    pageData,
    breakpoint,
    selectedId,
    showGrid,

    // Setters
    setBreakpoint,
    setSelectedId,
    setShowGrid,
    setPageData, // Expose for manual updates

    // Actions
    updateLayout,
    addElement,
    deleteElement,
    updateZIndex,
    ensureBreakpointLayout,
    save, // Expose save function for manual saves

    // History
    undo,
    redo,
    canUndo,
    canRedo,

    // Config
    gridSize,
    breakpoints,
    canvasHeight,
  };
}
