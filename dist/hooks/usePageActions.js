import { useCallback, useMemo } from "react";
import {
  snapToCenteredGridPercent,
  snapSizeToGridPercent,
  pixelsToResponsive,
  getCanvasWidth,
  scaleLayoutToBreakpoint,
  gridPercentX,
  gridPercentY,
} from "../utils/layout";
import { defaultConfig } from "../core/config";
/**
 * Headless hook for page element actions
 * Provides actions for manipulating page elements without UI
 */
export function usePageActions(pageData, setPageData, options) {
  // Memoize options to prevent unnecessary recreations
  const gridSize = options?.gridSize ?? defaultConfig.gridSize;
  const breakpoints = useMemo(
    () => options?.breakpoints ?? defaultConfig.breakpoints,
    [options?.breakpoints]
  );
  const canvasHeight =
    options?.canvasHeight ?? defaultConfig.defaultCanvasHeight;
  const ensureBreakpointLayout = useCallback(
    (element, targetBreakpoint) => {
      const bp = targetBreakpoint || "desktop";
      if (element.layout[bp]) {
        return element.layout[bp];
      }
      return scaleLayoutToBreakpoint(
        element.layout.desktop,
        "desktop",
        bp,
        breakpoints
      );
    },
    [breakpoints]
  );
  const findNonOverlappingPosition = useCallback(
    (breakpoint, widthPercent, heightPercent, currentElements) => {
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
      const gy = gridPercentY(gridSize, canvasHeight);
      const gridOffsetX = (100 % gx) / 2;
      const gridOffsetY = (100 % gy) / 2;
      let x = gridOffsetX + gx;
      let y = gridOffsetY + gy;
      for (let attempt = 0; attempt < 100; attempt++) {
        const overlaps = existingRects.some(rect => {
          return !(
            x + widthPercent < rect.x ||
            x > rect.right ||
            y + heightPercent < rect.y ||
            y > rect.bottom
          );
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
    },
    [ensureBreakpointLayout, gridSize, breakpoints, canvasHeight]
  );
  const addElement = useCallback(
    (type, defaultContent) => {
      setPageData(prev => {
        const desktopW = getCanvasWidth("desktop", breakpoints);
        const defaultWPercent = snapSizeToGridPercent(
          (200 / desktopW) * 100,
          gridPercentX(gridSize, desktopW)
        );
        const defaultHPercent = snapSizeToGridPercent(
          (100 / canvasHeight) * 100,
          gridPercentY(gridSize, canvasHeight)
        );
        const defaultSize = { w: defaultWPercent, h: defaultHPercent };
        const desktopPos = findNonOverlappingPosition(
          "desktop",
          defaultSize.w,
          defaultSize.h,
          prev.elements
        );
        const tabletPos = findNonOverlappingPosition(
          "tablet",
          defaultSize.w,
          defaultSize.h,
          prev.elements
        );
        const mobilePos = findNonOverlappingPosition(
          "mobile",
          defaultSize.w,
          defaultSize.h,
          prev.elements
        );
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
          zIndex: prev.elements.length,
        };
        return {
          ...prev,
          elements: [...prev.elements, newElement],
        };
      });
    },
    [findNonOverlappingPosition, gridSize, breakpoints, canvasHeight]
  );
  const updateLayout = useCallback(
    (id, breakpoint, newRect) => {
      setPageData(prev => {
        const updated = {
          ...prev,
          elements: prev.elements.map(el => {
            if (el.id !== id) return el;
            const updatedLayout = { ...el.layout, [breakpoint]: newRect };
            if (breakpoint === "desktop") {
              updatedLayout.responsive = pixelsToResponsive(newRect);
            } else if (!updatedLayout.responsive) {
              updatedLayout.responsive = pixelsToResponsive(el.layout.desktop);
            }
            return { ...el, layout: updatedLayout };
          }),
        };
        return updated;
      });
    },
    [breakpoints, canvasHeight]
  );
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
      const elements = [...prev.elements];
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
  return {
    addElement,
    updateLayout,
    updateElement,
    deleteElement,
    updateZIndex,
    ensureBreakpointLayout,
  };
}
