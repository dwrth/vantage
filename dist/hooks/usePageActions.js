import { useCallback, useMemo } from "react";
import {
  getCanvasWidth,
  getSectionRowCount,
  findNextGridPlacement,
  ensureBreakpointLayout as ensureBreakpointLayoutFromLayout,
} from "../utils/layout";
import { defaultConfig } from "../core/config";
/**
 * Headless hook for page element actions
 * Provides actions for manipulating page elements without UI
 */
export function usePageActions(pageData, setPageData, options) {
  const gridColumns = options?.gridColumns ?? defaultConfig.gridColumns;
  const gridRowHeight = options?.gridRowHeight ?? defaultConfig.gridRowHeight;
  const breakpoints = useMemo(
    () => options?.breakpoints ?? defaultConfig.breakpoints,
    [options?.breakpoints]
  );
  const canvasHeight =
    options?.canvasHeight ?? defaultConfig.defaultCanvasHeight;
  const defaultSectionHeight =
    options?.defaultSectionHeight ?? defaultConfig.defaultSectionHeight ?? 600;
  const maxSectionWidth =
    options?.maxSectionWidth ??
    defaultConfig.maxSectionWidth ??
    getCanvasWidth("desktop", breakpoints ?? defaultConfig.breakpoints);
  const ensureBreakpointLayout = useCallback((element, targetBreakpoint) => {
    return ensureBreakpointLayoutFromLayout(
      element,
      targetBreakpoint ?? "desktop"
    );
  }, []);
  const addElement = useCallback(
    (type, defaultContent, sectionId, externalId) => {
      setPageData(prev => {
        const sections = prev.sections;
        const targetSectionId = sectionId ?? sections?.[0]?.id;
        const section = sections?.find(s => s.id === targetSectionId);
        const sectionHeight = section?.height ?? defaultSectionHeight;
        const rowCount = getSectionRowCount(sectionHeight, gridRowHeight);
        const elementsInSection = targetSectionId
          ? (prev.elements || []).filter(el => el.sectionId === targetSectionId)
          : prev.elements;
        const defaultColSpan = Math.max(
          1,
          Math.min(6, Math.floor(gridColumns / 4))
        );
        const defaultRowSpan = Math.max(
          1,
          Math.min(20, Math.floor(rowCount / 4))
        );
        const existingPlacements = elementsInSection.map(el =>
          ensureBreakpointLayoutFromLayout(el, "desktop")
        );
        const placement = findNextGridPlacement(
          gridColumns,
          rowCount,
          defaultColSpan,
          defaultRowSpan,
          existingPlacements
        );
        const newElement = {
          id: `el-${Date.now()}`,
          type,
          content: defaultContent || {},
          layout: {
            desktop: placement,
            tablet: placement,
            mobile: placement,
          },
          zIndex: prev.elements?.length ?? 0,
          ...(targetSectionId ? { sectionId: targetSectionId } : {}),
          ...(externalId !== undefined ? { externalId } : {}),
        };
        return {
          ...prev,
          elements: [...(prev.elements || []), newElement],
        };
      });
    },
    [gridColumns, gridRowHeight, defaultSectionHeight]
  );
  const updateLayout = useCallback((id, breakpoint, newPlacement) => {
    setPageData(prev => ({
      ...prev,
      elements: prev.elements.map(el => {
        if (el.id !== id) return el;
        return {
          ...el,
          layout: { ...el.layout, [breakpoint]: newPlacement },
        };
      }),
    }));
  }, []);
  const updateLayoutBulk = useCallback((updates, breakpoint) => {
    if (updates.length === 0) return;
    setPageData(prev => {
      const byId = new Map(updates.map(u => [u.id, u.placement]));
      const elements = prev.elements.map(el => {
        const placement = byId.get(el.id);
        if (placement == null) return el;
        return {
          ...el,
          layout: { ...el.layout, [breakpoint]: placement },
        };
      });
      return { ...prev, elements };
    });
  }, []);
  const updateElement = useCallback((id, updates) => {
    setPageData(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
  }, []);
  const deleteElement = useCallback(id => {
    setPageData(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id),
    }));
  }, []);
  const updateZIndex = useCallback((id, direction) => {
    setPageData(prev => {
      const elements = [...(prev.elements || [])];
      const index = elements.findIndex(el => el.id === id);
      if (index === -1) return prev;
      const maxZ = Math.max(...elements.map(el => el.zIndex));
      const minZ = Math.min(...elements.map(el => el.zIndex));
      if (direction === "up") {
        elements[index].zIndex = maxZ + 1;
      } else {
        elements[index].zIndex = minZ - 1;
      }
      return { ...prev, elements };
    });
  }, []);
  const addSection = useCallback(
    (fullWidth = false) => {
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
    },
    [defaultSectionHeight, breakpoints, maxSectionWidth]
  );
  const deleteSection = useCallback(sectionId => {
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
      sections: (prev.sections || []).map(s =>
        s.id === sectionId ? { ...s, height: Math.max(100, height) } : s
      ),
    }));
  }, []);
  const updateSectionFullWidth = useCallback(
    (sectionId, fullWidth) => {
      setPageData(prev => {
        const desktopWidth = getCanvasWidth("desktop", breakpoints);
        return {
          ...prev,
          sections: (prev.sections || []).map(s =>
            s.id === sectionId
              ? {
                  ...s,
                  fullWidth,
                  ...(fullWidth ? {} : { width: s.width ?? desktopWidth }),
                }
              : s
          ),
        };
      });
    },
    [breakpoints]
  );
  return {
    addElement,
    updateLayout,
    updateLayoutBulk,
    updateElement,
    deleteElement,
    updateZIndex,
    ensureBreakpointLayout,
    addSection,
    deleteSection,
    updateSectionHeight,
    updateSectionFullWidth,
  };
}
