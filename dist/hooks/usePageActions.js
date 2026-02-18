import { useCallback, useMemo } from "react";
import { snapToCenteredGridPercent, snapSizeToGridPercent, snapSizeToGrid, pixelsToResponsive, getCanvasWidth, scaleLayoutToBreakpoint, gridPercentX, gridPercentY, } from "../utils/layout";
import { defaultConfig } from "../core/config";
/**
 * Headless hook for page element actions
 * Provides actions for manipulating page elements without UI
 */
export function usePageActions(pageData, setPageData, options) {
    // Memoize options to prevent unnecessary recreations
    const gridSize = options?.gridSize ?? defaultConfig.gridSize;
    const breakpoints = useMemo(() => options?.breakpoints ?? defaultConfig.breakpoints, [options?.breakpoints]);
    const canvasHeight = options?.canvasHeight ?? defaultConfig.defaultCanvasHeight;
    const defaultSectionHeight = options?.defaultSectionHeight ?? defaultConfig.defaultSectionHeight ?? 600;
    const maxSectionWidth = options?.maxSectionWidth ??
        defaultConfig.maxSectionWidth ??
        getCanvasWidth("desktop", breakpoints ?? defaultConfig.breakpoints);
    const ensureBreakpointLayout = useCallback((element, targetBreakpoint) => {
        const bp = targetBreakpoint || "desktop";
        if (element.layout[bp]) {
            return element.layout[bp];
        }
        return scaleLayoutToBreakpoint(element.layout.desktop, "desktop", bp, breakpoints);
    }, [breakpoints]);
    const findNonOverlappingPosition = useCallback((breakpoint, widthPercent, heightPercent, currentElements, containerHeight = canvasHeight) => {
        const existingRects = currentElements.map(el => {
            const layout = ensureBreakpointLayout(el, breakpoint);
            return {
                x: layout.x,
                y: layout.y,
                w: layout.w,
                h: layout.h,
                right: layout.x + layout.w,
                bottom: layout.y + layout.h,
            };
        });
        const canvasWidth = getCanvasWidth(breakpoint, breakpoints);
        const gx = gridPercentX(gridSize, canvasWidth);
        const gy = gridPercentY(gridSize, containerHeight);
        const gridOffsetX = (100 % gx) / 2;
        const gridOffsetY = (100 % gy) / 2;
        let x = gridOffsetX + gx;
        let y = gridOffsetY + gy;
        for (let attempt = 0; attempt < 100; attempt++) {
            const overlaps = existingRects.some(rect => {
                return !(x + widthPercent < rect.x ||
                    x > rect.right ||
                    y + heightPercent < rect.y ||
                    y > rect.bottom);
            });
            if (!overlaps) {
                break;
            }
            x += gx;
            if (x + widthPercent > 100 - gridOffsetX) {
                x = gridOffsetX + gx;
                y += gy;
            }
        }
        return {
            x: snapToCenteredGridPercent(x, gx, 100),
            y: snapToCenteredGridPercent(y, gy, 100),
            w: widthPercent,
            h: heightPercent,
        };
    }, [ensureBreakpointLayout, gridSize, breakpoints, canvasHeight]);
    const addElement = useCallback((type, defaultContent, sectionId) => {
        setPageData(prev => {
            const sections = prev.sections;
            const targetSectionId = sectionId ?? sections?.[0]?.id;
            const section = sections?.find(s => s.id === targetSectionId);
            const sectionHeight = section?.height ?? canvasHeight;
            const elementsInSection = targetSectionId
                ? (prev.elements || []).filter(el => el.sectionId === targetSectionId)
                : prev.elements;
            const desktopW = getCanvasWidth("desktop", breakpoints);
            const defaultWPercent = snapSizeToGridPercent((200 / desktopW) * 100, gridPercentX(gridSize, desktopW));
            const defaultHPercent = snapSizeToGridPercent((100 / sectionHeight) * 100, gridPercentY(gridSize, sectionHeight));
            const defaultSize = { w: defaultWPercent, h: defaultHPercent };
            const desktopPos = findNonOverlappingPosition("desktop", defaultSize.w, defaultSize.h, elementsInSection, sectionHeight);
            const tabletPos = findNonOverlappingPosition("tablet", defaultSize.w, defaultSize.h, elementsInSection, sectionHeight);
            const mobilePos = findNonOverlappingPosition("mobile", defaultSize.w, defaultSize.h, elementsInSection, sectionHeight);
            const newElement = {
                id: `el-${Date.now()}`,
                type,
                content: defaultContent || {},
                layout: {
                    desktop: desktopPos,
                    tablet: tabletPos,
                    mobile: mobilePos,
                    responsive: pixelsToResponsive(desktopPos),
                },
                zIndex: (prev.elements?.length ?? 0),
                ...(targetSectionId ? { sectionId: targetSectionId } : {}),
            };
            return {
                ...prev,
                elements: [...(prev.elements || []), newElement],
            };
        });
    }, [findNonOverlappingPosition, gridSize, breakpoints, canvasHeight]);
    const updateLayout = useCallback((id, breakpoint, newRect) => {
        setPageData(prev => {
            const updated = {
                ...prev,
                elements: prev.elements.map(el => {
                    if (el.id !== id)
                        return el;
                    const updatedLayout = { ...el.layout, [breakpoint]: newRect };
                    if (breakpoint === "desktop") {
                        updatedLayout.responsive = pixelsToResponsive(newRect);
                    }
                    else if (!updatedLayout.responsive) {
                        updatedLayout.responsive = pixelsToResponsive(el.layout.desktop);
                    }
                    return { ...el, layout: updatedLayout };
                }),
            };
            return updated;
        });
    }, [breakpoints, canvasHeight]);
    const updateElement = useCallback((id, updates) => {
        setPageData(prev => ({
            ...prev,
            elements: prev.elements.map(el => el.id === id ? { ...el, ...updates } : el),
        }));
    }, []);
    const deleteElement = useCallback((id) => {
        setPageData(prev => ({
            ...prev,
            elements: prev.elements.filter(el => el.id !== id),
        }));
    }, []);
    const updateZIndex = useCallback((id, direction) => {
        setPageData(prev => {
            const elements = [...(prev.elements || [])];
            const index = elements.findIndex(el => el.id === id);
            if (index === -1)
                return prev;
            const maxZ = Math.max(...elements.map(el => el.zIndex));
            const minZ = Math.min(...elements.map(el => el.zIndex));
            if (direction === "up") {
                elements[index].zIndex = maxZ + 1;
            }
            else {
                elements[index].zIndex = minZ - 1;
            }
            return { ...prev, elements };
        });
    }, []);
    const addSection = useCallback((fullWidth = false) => {
        setPageData(prev => {
            const sections = [...(prev.sections || [])];
            const desktopWidth = getCanvasWidth("desktop", breakpoints);
            const initialWidth = Math.min(desktopWidth, maxSectionWidth);
            sections.push({
                id: `sec-${Date.now()}`,
                fullWidth,
                height: defaultSectionHeight,
                ...(fullWidth ? {} : { width: initialWidth }),
            });
            return { ...prev, sections };
        });
    }, [defaultSectionHeight, breakpoints, maxSectionWidth]);
    const deleteSection = useCallback((sectionId) => {
        setPageData(prev => {
            const sections = (prev.sections || []).filter(s => s.id !== sectionId);
            const elements = (prev.elements || []).map(el => {
                const pe = el;
                if (pe.sectionId === sectionId) {
                    const { sectionId: _, ...rest } = pe;
                    return { ...rest, sectionId: sections[0]?.id };
                }
                return el;
            });
            return { ...prev, sections, elements };
        });
    }, []);
    const updateSectionHeight = useCallback((sectionId, height) => {
        setPageData(prev => ({
            ...prev,
            sections: (prev.sections || []).map(s => s.id === sectionId ? { ...s, height: Math.max(100, height) } : s),
        }));
    }, []);
    const updateSectionFullWidth = useCallback((sectionId, fullWidth) => {
        setPageData(prev => {
            const desktopWidth = getCanvasWidth("desktop", breakpoints);
            return {
                ...prev,
                sections: (prev.sections || []).map(s => s.id === sectionId
                    ? {
                        ...s,
                        fullWidth,
                        ...(fullWidth ? {} : { width: s.width ?? desktopWidth }),
                    }
                    : s),
            };
        });
    }, [breakpoints]);
    const updateSectionWidth = useCallback((sectionId, width) => {
        const gridSize = options?.gridSize ?? defaultConfig.gridSize;
        const minWidth = Math.max(200, gridSize * 4);
        setPageData(prev => {
            const section = prev.sections?.find(s => s.id === sectionId);
            const cap = section?.maxWidth ?? maxSectionWidth;
            const clamped = Math.max(minWidth, Math.min(cap, width));
            const snapped = snapSizeToGrid(clamped, gridSize);
            return {
                ...prev,
                sections: (prev.sections || []).map(s => s.id === sectionId ? { ...s, width: snapped } : s),
            };
        });
    }, [maxSectionWidth]);
    const updateSectionMaxWidth = useCallback((sectionId, maxWidth) => {
        setPageData(prev => ({
            ...prev,
            sections: (prev.sections || []).map(s => {
                if (s.id !== sectionId)
                    return s;
                const next = { ...s, maxWidth };
                if (maxWidth != null &&
                    s.width != null &&
                    s.width > maxWidth) {
                    next.width = maxWidth;
                }
                return next;
            }),
        }));
    }, []);
    return {
        addElement,
        updateLayout,
        updateElement,
        deleteElement,
        updateZIndex,
        ensureBreakpointLayout,
        addSection,
        deleteSection,
        updateSectionHeight,
        updateSectionFullWidth,
        updateSectionWidth,
        updateSectionMaxWidth,
    };
}
