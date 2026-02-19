import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import React from "react";
import { PageData, PageElement } from "../core/types";
import { StorageAdapter, LocalStorageAdapter } from "../adapters/storage";
import {
  pixelsToResponsive,
  getCanvasWidth,
  normalizePageData,
} from "../utils/layout";
import { defaultConfig } from "../core/config";

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
export function usePageData<T extends string = string>(
  pageId: string,
  options?: UsePageDataOptions<T>
) {
  // Memoize storage to prevent recreating adapter on every render
  const storage: StorageAdapter = useMemo(
    () => options?.storage || new LocalStorageAdapter(),
    [options?.storage]
  );
  const autoSaveDelay = options?.autoSaveDelay ?? defaultConfig.autoSaveDelay;
  const onSaveRef = useRef(options?.onSave);
  const onSavedRef = useRef(options?.onSaved);

  useEffect(() => {
    onSaveRef.current = options?.onSave;
    onSavedRef.current = options?.onSaved;
  }, [options?.onSave, options?.onSaved]);

  const defaultSectionHeight = defaultConfig.defaultSectionHeight ?? 600;
  const [pageData, setPageData] = useState<PageData<T>>(() => {
    const initial = options?.initialData || { pageId, elements: [] };
    return normalizePageData(
      initial as PageData<T>,
      defaultSectionHeight
    ) as PageData<T>;
  });

  // Load initial data
  useEffect(() => {
    if (options?.initialData) {
      const normalized = normalizePageData(
        options.initialData as PageData<T>,
        defaultSectionHeight
      ) as PageData<T>;
      setPageData(normalized);
      onSavedRef.current?.(normalized);
      return;
    }

    const loadData = async () => {
      const loaded = await Promise.resolve(storage.load(pageId));
      if (loaded) {
        // Ensure responsive layouts and sections
        const withResponsive = {
          ...loaded,
          elements: (loaded.elements || []).map(el => {
            if (!el.layout.responsive) {
              return {
                ...el,
                layout: {
                  ...el.layout,
                  responsive: pixelsToResponsive(
                    el.layout.desktop,
                    getCanvasWidth("desktop", defaultConfig.breakpoints!),
                    defaultConfig.defaultCanvasHeight!
                  ),
                },
              } as PageElement<T>;
            }
            return el as PageElement<T>;
          }),
        } as PageData<T>;
        const defaultSectionHeight = defaultConfig.defaultSectionHeight ?? 600;
        const normalized = normalizePageData(
          withResponsive,
          defaultSectionHeight
        );
        setPageData(normalized);
        onSavedRef.current?.(normalized);
      }
    };
    loadData();
  }, [pageId, storage, options?.initialData]);

  // Normalize saved/loaded page data (responsive layouts + sections) for consistency with load()
  const applySavedResult = useCallback(
    (raw: PageData<T>) => {
      const withResponsive = {
        ...raw,
        elements: (raw.elements || []).map(el => {
          if (!el.layout.responsive) {
            return {
              ...el,
              layout: {
                ...el.layout,
                responsive: pixelsToResponsive(
                  el.layout.desktop,
                  getCanvasWidth("desktop", defaultConfig.breakpoints!),
                  defaultConfig.defaultCanvasHeight!
                ),
              },
            } as PageElement<T>;
          }
          return el as PageElement<T>;
        }),
      } as PageData<T>;
      const normalized = normalizePageData(
        withResponsive,
        defaultSectionHeight
      ) as PageData<T>;
      setPageData(normalized);
      onSavedRef.current?.(normalized);
    },
    [defaultSectionHeight]
  );

  // Manual save function (optimistic - updates UI immediately, syncs to server)
  const save = useCallback(
    async (data?: PageData<T>) => {
      const dataToSave = data || pageData;

      // Optimistic update - callback fires immediately
      onSaveRef.current?.(dataToSave);

      try {
        const result = await Promise.resolve(storage.save(pageId, dataToSave));
        if (result != null) {
          applySavedResult(result as PageData<T>);
        }
      } catch (error) {
        console.error("Failed to save to server:", error);
      }
    },
    [pageId, storage, pageData, applySavedResult]
  );

  // Auto-save effect (optimistic updates)
  useEffect(() => {
    if (autoSaveDelay <= 0) return; // Disable auto-save if delay is 0 or negative

    const timeoutId = setTimeout(async () => {
      // Optimistic: fire callback immediately
      onSaveRef.current?.(pageData);

      try {
        const result = await Promise.resolve(storage.save(pageId, pageData));
        if (result != null) {
          applySavedResult(result as PageData<T>);
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, autoSaveDelay);

    return () => clearTimeout(timeoutId);
  }, [pageData, pageId, storage, autoSaveDelay, applySavedResult]);

  return {
    pageData,
    setPageData,
    save,
  };
}
