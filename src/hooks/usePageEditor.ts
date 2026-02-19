import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { PageData, Breakpoint, LayoutRect } from "../core/types";
import { PageBuilderConfig, defaultConfig } from "../core/config";
import type { VantageEditorInstance } from "../core/editor-instance";
import { ComponentRegistry, defaultComponents } from "../adapters/components";
import { usePageData } from "./usePageData";
import { usePageActions } from "./usePageActions";
import { useHistory } from "./useHistory";

export type UseVantageEditorOptions<T extends string = string> = {
  pageId: string;
} & PageBuilderConfig<T>;

export function useVantageEditor<T extends string = string>(
  options: UseVantageEditorOptions<T>
): VantageEditorInstance<T> {
  const { pageId, ...config } = options;
  return usePageEditor<T>(pageId, config);
}

export function usePageEditor<T extends string = string>(
  pageId: string,
  config?: PageBuilderConfig<T>
): VantageEditorInstance<T> {
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
  const canvasHeight =
    config?.defaultCanvasHeight ?? defaultConfig.defaultCanvasHeight;
  const defaultSectionHeight =
    config?.defaultSectionHeight ?? defaultConfig.defaultSectionHeight ?? 600;
  const maxSectionWidth =
    config?.maxSectionWidth ??
    defaultConfig.maxSectionWidth ??
    breakpoints?.desktop;

  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  const lastSavedDataRef = useRef<PageData<T> | undefined>(undefined);
  const onDirtyChangeRef = useRef(config?.onDirtyChange);
  useEffect(() => {
    onDirtyChangeRef.current = config?.onDirtyChange;
  }, [config?.onDirtyChange]);

  // Use headless page data hook
  const { pageData, setPageData, save } = usePageData<T>(pageId, {
    ...(config?.initialData !== undefined && {
      initialData: config.initialData,
    }),
    storage: config?.storage,
    autoSaveDelay: config?.autoSaveDelay,
    onSave: config?.onSave,
    onSaved: useCallback((data: PageData<T>) => {
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
  const prevPageDataRef = useRef<PageData<T>>(pageData);

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
  } = useHistory<T>(pageData, config?.maxHistorySize ?? 50, {
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
  const setPageDataWithHistory = useCallback(
    (updater: React.SetStateAction<PageData<T>>) => {
      setPageData(prev => {
        const next = typeof updater === "function" ? updater(prev) : updater;
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
      defaultSectionHeight,
      maxSectionWidth,
    }),
    [gridSize, breakpoints, canvasHeight, defaultSectionHeight, maxSectionWidth]
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

  const updateLayoutBulk = useCallback(
    (updates: { id: string; rect: LayoutRect }[]) => {
      updateLayoutBulkAction(updates, breakpoint);
      updates.forEach(({ id, rect }) => onElementUpdateRef.current?.(id, rect));
    },
    [breakpoint, updateLayoutBulkAction]
  );

  const addElement = useCallback(
    (
      type: T,
      defaultContent?: Record<string, any>,
      sectionId?: string,
      externalId?: string
    ) => {
      addElementAction(type, defaultContent, sectionId, externalId);
    },
    [addElementAction]
  );

  const updateElementContent = useCallback(
    (id: string, content: Record<string, unknown>) => {
      updateElementAction(id, { content });
    },
    [updateElementAction]
  );

  const updateZIndex = useCallback(
    (id: string, direction: "up" | "down") => {
      updateZIndexAction(id, direction);
    },
    [updateZIndexAction]
  );

  const deleteElement = useCallback(
    (id: string) => {
      deleteElementAction(id);
      setSelectedIds(prev => prev.filter(i => i !== id));
      onElementSelectRef.current?.(null);
    },
    [deleteElementAction]
  );

  const selectElements = useCallback((ids: string[] | null) => {
    setSelectedIds(ids ?? []);
    onElementSelectRef.current?.(ids?.[0] ?? null);
  }, []);

  const components: ComponentRegistry<T> = useMemo(
    () => (config?.components ?? defaultComponents) as ComponentRegistry<T>,
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
    gridSize,
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
