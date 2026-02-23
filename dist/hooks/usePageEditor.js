import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { defaultConfig } from "../core/config";
import { defaultComponents } from "../adapters/components";
import { usePageData } from "./usePageData";
import { usePageActions } from "./usePageActions";
import { useHistory } from "./useHistory";
export function useVantageEditor(options) {
  const { pageId, ...config } = options;
  return usePageEditor(pageId, config);
}
export function usePageEditor(pageId, config) {
  // Stabilize config callbacks to prevent infinite loops
  const onElementSelectRef = useRef(config?.onElementSelect);
  const onElementUpdateRef = useRef(config?.onElementUpdate);
  useEffect(() => {
    onElementSelectRef.current = config?.onElementSelect;
    onElementUpdateRef.current = config?.onElementUpdate;
  }, [config?.onElementSelect, config?.onElementUpdate]);
  const gridColumns = config?.gridColumns ?? defaultConfig.gridColumns;
  const gridRowHeight = config?.gridRowHeight ?? defaultConfig.gridRowHeight;
  // Memoize breakpoints to prevent recreating callbacks
  const breakpoints = useMemo(
    () => config?.breakpoints ?? defaultConfig.breakpoints,
    [config?.breakpoints]
  );
  const canvasHeight =
    config?.defaultCanvasHeight ?? defaultConfig.defaultCanvasHeight;
  const defaultSectionHeight =
    config?.defaultSectionHeight ?? defaultConfig.defaultSectionHeight ?? 600;
  const maxSectionWidth =
    config?.maxSectionWidth ??
    defaultConfig.maxSectionWidth ??
    breakpoints?.desktop;
  const [breakpoint, setBreakpoint] = useState("desktop");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showGrid, setShowGrid] = useState(true);
  const lastSavedDataRef = useRef(undefined);
  const onDirtyChangeRef = useRef(config?.onDirtyChange);
  useEffect(() => {
    onDirtyChangeRef.current = config?.onDirtyChange;
  }, [config?.onDirtyChange]);
  // Use headless page data hook
  const { pageData, setPageData, save } = usePageData(pageId, {
    ...(config?.initialData !== undefined && {
      initialData: config.initialData,
    }),
    storage: config?.storage,
    autoSaveDelay: config?.autoSaveDelay,
    onSave: config?.onSave,
    onSaved: useCallback(data => {
      lastSavedDataRef.current = data;
    }, []),
  });
  // Set baseline for dirty check on first paint (e.g. before load completes or when load returns null)
  useEffect(() => {
    if (lastSavedDataRef.current === undefined) {
      lastSavedDataRef.current = pageData;
    }
  }, []);
  // Track if we're updating from history (to avoid adding to history)
  const isHistoryUpdateRef = useRef(false);
  const prevPageDataRef = useRef(pageData);
  // History management for undo/redo with server persistence
  const persistHistory = config?.persistHistory ?? false;
  const {
    present: historyPresent,
    canUndo,
    canRedo,
    isLoading: historyLoading,
    updateHistory,
    undo: historyUndo,
    redo: historyRedo,
  } = useHistory(pageData, config?.maxHistorySize ?? 50, {
    storage: config?.storage,
    pageId,
    persistToServer: persistHistory,
  });
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
  // Dirty state: compare current pageData to last saved/loaded baseline
  const isDirty =
    lastSavedDataRef.current !== undefined &&
    JSON.stringify(pageData) !== JSON.stringify(lastSavedDataRef.current);
  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty);
  }, [isDirty]);
  // Wrapper for setPageData that updates history
  const setPageDataWithHistory = useCallback(updater => {
    setPageData(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
  }, []);
  // Memoize options to prevent usePageActions from recreating callbacks
  const actionsOptions = useMemo(
    () => ({
      gridColumns,
      gridRowHeight,
      breakpoints,
      canvasHeight,
      defaultSectionHeight,
      maxSectionWidth,
    }),
    [
      gridColumns,
      gridRowHeight,
      breakpoints,
      canvasHeight,
      defaultSectionHeight,
      maxSectionWidth,
    ]
  );
  // Use headless page actions hook (use history-aware setter)
  const {
    addElement: addElementAction,
    updateLayout: updateLayoutAction,
    updateLayoutBulk: updateLayoutBulkAction,
    updateElement: updateElementAction,
    deleteElement: deleteElementAction,
    updateZIndex: updateZIndexAction,
    ensureBreakpointLayout,
    addSection,
    deleteSection,
    updateSectionHeight,
    updateSectionFullWidth,
  } = usePageActions(pageData, setPageDataWithHistory, actionsOptions);
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
    (id, newPlacement) => {
      updateLayoutAction(id, breakpoint, newPlacement);
      onElementUpdateRef.current?.(id, newPlacement);
    },
    [breakpoint, updateLayoutAction]
  );
  const updateLayoutBulk = useCallback(
    updates => {
      updateLayoutBulkAction(updates, breakpoint);
      updates.forEach(({ id, placement }) =>
        onElementUpdateRef.current?.(id, placement)
      );
    },
    [breakpoint, updateLayoutBulkAction]
  );
  const addElement = useCallback(
    (type, defaultContent, sectionId, externalId) => {
      addElementAction(type, defaultContent, sectionId, externalId);
    },
    [addElementAction]
  );
  const updateElementContent = useCallback(
    (id, content) => {
      updateElementAction(id, { content });
    },
    [updateElementAction]
  );
  const updateZIndex = useCallback(
    (id, direction) => {
      updateZIndexAction(id, direction);
    },
    [updateZIndexAction]
  );
  const deleteElement = useCallback(
    id => {
      deleteElementAction(id);
      setSelectedIds(prev => prev.filter(i => i !== id));
      onElementSelectRef.current?.(null);
    },
    [deleteElementAction]
  );
  const selectElements = useCallback(ids => {
    setSelectedIds(ids ?? []);
    onElementSelectRef.current?.(ids?.[0] ?? null);
  }, []);
  const components = useMemo(
    () => config?.components ?? defaultComponents,
    [config?.components]
  );
  return {
    // State
    pageData,
    breakpoint,
    selectedIds,
    showGrid,
    isDirty,
    hasUnsavedChanges: isDirty,
    canUndo,
    canRedo,
    historyLoading,
    gridColumns,
    gridRowHeight,
    breakpoints,
    canvasHeight,
    defaultSectionHeight,
    // Setters
    setBreakpoint,
    setSelectedIds,
    setShowGrid,
    setPageData,
    selectElements,
    // Actions
    updateLayout,
    updateLayoutBulk,
    addElement,
    updateElement: updateElementAction,
    updateElementContent,
    deleteElement,
    updateZIndex,
    ensureBreakpointLayout,
    save,
    // History
    undo,
    redo,
    // Sections
    addSection,
    deleteSection,
    updateSectionHeight,
    updateSectionFullWidth,
    // Config for rendering
    components,
  };
}
