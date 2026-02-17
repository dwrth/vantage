import { useCallback, useMemo } from "react";
import React from "react";
import { PageData, PageElement, Breakpoint, LayoutRect } from "../core/types";
import {
  snapToGrid,
  snapToCenteredGrid,
  pixelsToResponsive,
  getCanvasWidth,
  scaleLayoutToBreakpoint,
} from "../utils/layout";
import { defaultConfig } from "../core/config";

/**
 * Headless hook for page element actions
 * Provides actions for manipulating page elements without UI
 */
export function usePageActions<T extends string = string>(
  pageData: PageData<T>,
  setPageData: React.Dispatch<React.SetStateAction<PageData<T>>>,
  options?: {
    gridSize?: number;
    breakpoints?: Record<Breakpoint, number>;
    canvasHeight?: number;
  },
) {
  // Memoize options to prevent unnecessary recreations
  const gridSize = options?.gridSize ?? defaultConfig.gridSize;
  const breakpoints = useMemo(
    () => options?.breakpoints ?? defaultConfig.breakpoints,
    [options?.breakpoints],
  );
  const canvasHeight =
    options?.canvasHeight ?? defaultConfig.defaultCanvasHeight;

  const ensureBreakpointLayout = useCallback(
    (element: PageElement<T>, targetBreakpoint?: Breakpoint): LayoutRect => {
      const bp: Breakpoint = targetBreakpoint || "desktop";
      if (element.layout[bp]) {
        return element.layout[bp];
      }
      return scaleLayoutToBreakpoint(
        element.layout.desktop,
        "desktop",
        bp,
        breakpoints,
      );
    },
    [breakpoints],
  );

  const findNonOverlappingPosition = useCallback(
    (
      breakpoint: Breakpoint,
      width: number,
      height: number,
      currentElements: PageElement<T>[],
    ): LayoutRect => {
      const existingRects = currentElements.map((el) => {
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
      // Start from first grid position accounting for centered grid
      const gridOffsetX = (canvasWidth % gridSize) / 2;
      const gridOffsetY = (canvasHeight % gridSize) / 2;

      let x = gridOffsetX + gridSize;
      let y = gridOffsetY + gridSize;

      for (let attempt = 0; attempt < 100; attempt++) {
        const overlaps = existingRects.some((rect) => {
          return !(
            x + width < rect.x ||
            x > rect.right ||
            y + height < rect.y ||
            y > rect.bottom
          );
        });

        if (!overlaps) {
          break;
        }

        x += gridSize;
        if (x + width > canvasWidth - gridOffsetX) {
          x = gridOffsetX + gridSize;
          y += gridSize;
        }
      }

      return {
        x: snapToCenteredGrid(x, gridSize, canvasWidth),
        y: snapToCenteredGrid(y, gridSize, canvasHeight),
        w: width,
        h: height,
      };
    },
    [ensureBreakpointLayout, gridSize, breakpoints, canvasHeight],
  );

  const addElement = useCallback(
    (type: T, defaultContent?: Record<string, any>) => {
      setPageData((prev) => {
        const defaultSize = {
          w: snapToGrid(200, gridSize),
          h: snapToGrid(100, gridSize),
        };

        const desktopPos = findNonOverlappingPosition(
          "desktop",
          defaultSize.w,
          defaultSize.h,
          prev.elements,
        );
        const tabletPos = findNonOverlappingPosition(
          "tablet",
          defaultSize.w,
          defaultSize.h,
          prev.elements,
        );
        const mobilePos = findNonOverlappingPosition(
          "mobile",
          defaultSize.w,
          defaultSize.h,
          prev.elements,
        );

        const newElement: PageElement<T> = {
          id: `el-${Date.now()}`,
          type,
          content: defaultContent || {},
          layout: {
            desktop: desktopPos,
            tablet: tabletPos,
            mobile: mobilePos,
            responsive: pixelsToResponsive(
              desktopPos,
              getCanvasWidth("desktop", breakpoints),
              canvasHeight,
            ),
          },
          zIndex: prev.elements.length,
        };

        return {
          ...prev,
          elements: [...prev.elements, newElement],
        };
      });
    },
    [findNonOverlappingPosition, gridSize, breakpoints, canvasHeight],
  );

  const updateLayout = useCallback(
    (id: string, breakpoint: Breakpoint, newRect: LayoutRect) => {
      setPageData((prev) => {
        const updated: PageData<T> = {
          ...prev,
          elements: prev.elements.map((el) => {
            if (el.id !== id) return el;

            const updatedLayout = { ...el.layout, [breakpoint]: newRect };

            if (breakpoint === "desktop") {
              updatedLayout.responsive = pixelsToResponsive(
                newRect,
                getCanvasWidth("desktop", breakpoints),
                canvasHeight,
              );
            } else if (!updatedLayout.responsive) {
              updatedLayout.responsive = pixelsToResponsive(
                el.layout.desktop,
                getCanvasWidth("desktop", breakpoints),
                canvasHeight,
              );
            }

            return { ...el, layout: updatedLayout };
          }),
        };

        return updated;
      });
    },
    [breakpoints, canvasHeight],
  );

  const updateElement = useCallback(
    (id: string, updates: Partial<PageElement<T>>) => {
      setPageData((prev) => ({
        ...prev,
        elements: prev.elements.map((el) =>
          el.id === id ? { ...el, ...updates } : el,
        ),
      }));
    },
    [],
  );

  const deleteElement = useCallback((id: string) => {
    setPageData((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== id),
    }));
  }, []);

  const updateZIndex = useCallback((id: string, direction: "up" | "down") => {
    setPageData((prev) => {
      const elements = [...prev.elements];
      const index = elements.findIndex((el) => el.id === id);
      if (index === -1) return prev;

      const maxZ = Math.max(...elements.map((el) => el.zIndex));
      const minZ = Math.min(...elements.map((el) => el.zIndex));

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
