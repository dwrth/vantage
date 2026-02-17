import React from 'react';
import { PageData, PageElement, Breakpoint, LayoutRect } from '../core/types';
/**
 * Headless hook for page element actions
 * Provides actions for manipulating page elements without UI
 */
export declare function usePageActions<T extends string = string>(pageData: PageData<T>, setPageData: React.Dispatch<React.SetStateAction<PageData<T>>>, options?: {
    gridSize?: number;
    breakpoints?: Record<Breakpoint, number>;
    canvasHeight?: number;
}): {
    addElement: (type: T, defaultContent?: Record<string, any>) => void;
    updateLayout: (id: string, breakpoint: Breakpoint, newRect: LayoutRect) => void;
    updateElement: (id: string, updates: Partial<PageElement<T>>) => void;
    deleteElement: (id: string) => void;
    updateZIndex: (id: string, direction: "up" | "down") => void;
    ensureBreakpointLayout: (element: PageElement<T>, targetBreakpoint?: Breakpoint) => LayoutRect;
};
//# sourceMappingURL=usePageActions.d.ts.map