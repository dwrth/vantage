import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LocalStorageAdapter } from '../adapters/storage';
import { pixelsToResponsive, getCanvasWidth } from '../utils/layout';
import { defaultConfig } from '../core/config';
/**
 * Headless hook for managing page data
 * Exposes pageData and save function for custom implementations
 */
export function usePageData(pageId, options) {
    // Memoize storage to prevent recreating adapter on every render
    const storage = useMemo(() => options?.storage || new LocalStorageAdapter(), [options?.storage]);
    const autoSaveDelay = options?.autoSaveDelay ?? defaultConfig.autoSaveDelay;
    const onSaveRef = useRef(options?.onSave);
    useEffect(() => {
        onSaveRef.current = options?.onSave;
    }, [options?.onSave]);
    const [pageData, setPageData] = useState(options?.initialData || { pageId, elements: [] });
    // Load initial data
    useEffect(() => {
        if (options?.initialData) {
            setPageData(options.initialData);
            return;
        }
        const loadData = async () => {
            const loaded = await Promise.resolve(storage.load(pageId));
            if (loaded) {
                // Ensure all elements have responsive layouts calculated
                const updated = {
                    ...loaded,
                    elements: loaded.elements.map((el) => {
                        if (!el.layout.responsive) {
                            return {
                                ...el,
                                layout: {
                                    ...el.layout,
                                    responsive: pixelsToResponsive(el.layout.desktop, getCanvasWidth('desktop', defaultConfig.breakpoints), defaultConfig.defaultCanvasHeight),
                                },
                            };
                        }
                        return el;
                    }),
                };
                setPageData(updated);
            }
        };
        loadData();
    }, [pageId, storage, options?.initialData]);
    // Manual save function
    const save = useCallback(async (data) => {
        const dataToSave = data || pageData;
        await Promise.resolve(storage.save(pageId, dataToSave));
        onSaveRef.current?.(dataToSave);
    }, [pageId, storage, pageData]);
    // Auto-save effect
    useEffect(() => {
        if (autoSaveDelay <= 0)
            return; // Disable auto-save if delay is 0 or negative
        const timeoutId = setTimeout(() => {
            storage.save(pageId, pageData);
            onSaveRef.current?.(pageData);
        }, autoSaveDelay);
        return () => clearTimeout(timeoutId);
    }, [pageData, pageId, storage, autoSaveDelay]);
    return {
        pageData,
        setPageData,
        save,
    };
}
