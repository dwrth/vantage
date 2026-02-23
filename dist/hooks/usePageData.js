import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { LocalStorageAdapter } from "../adapters/storage";
import { normalizePageData } from "../utils/layout";
import { defaultConfig } from "../core/config";
/**
 * Headless hook for managing page data
 * Exposes pageData and save function for custom implementations
 */
export function usePageData(pageId, options) {
  // Memoize storage to prevent recreating adapter on every render
  const storage = useMemo(
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
  const [pageData, setPageData] = useState(() => {
    const initial = options?.initialData || { pageId, elements: [] };
    return normalizePageData(initial, defaultSectionHeight);
  });
  // Load initial data
  useEffect(() => {
    if (options?.initialData) {
      const normalized = normalizePageData(
        options.initialData,
        defaultSectionHeight
      );
      setPageData(normalized);
      onSavedRef.current?.(normalized);
      return;
    }
    const loadData = async () => {
      const loaded = await Promise.resolve(storage.load(pageId));
      if (loaded) {
        const normalized = normalizePageData(loaded, defaultSectionHeight);
        setPageData(normalized);
        onSavedRef.current?.(normalized);
      }
    };
    loadData();
  }, [pageId, storage, options?.initialData]);
  const applySavedResult = useCallback(
    raw => {
      const normalized = normalizePageData(raw, defaultSectionHeight);
      setPageData(normalized);
      onSavedRef.current?.(normalized);
    },
    [defaultSectionHeight]
  );
  // Manual save function (optimistic - updates UI immediately, syncs to server)
  const save = useCallback(
    async data => {
      const dataToSave = data || pageData;
      // Optimistic update - callback fires immediately
      onSaveRef.current?.(dataToSave);
      try {
        const result = await Promise.resolve(storage.save(pageId, dataToSave));
        if (result != null) {
          applySavedResult(result);
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
          applySavedResult(result);
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
