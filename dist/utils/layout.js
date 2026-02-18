// Layout utility functions
export const getCanvasWidth = (breakpoint, breakpoints) => {
    return breakpoints[breakpoint];
};
// LayoutRect is percentage-based (0–100); same values work across breakpoints
export const scaleLayoutToBreakpoint = (sourceRect, _sourceBreakpoint, _targetBreakpoint, _breakpoints) => {
    return { ...sourceRect };
};
// LayoutRect is already in 0–100; map to ResponsiveRect (same units)
export const pixelsToResponsive = (rect, _canvasWidth, _canvasHeight) => {
    return {
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
    };
};
export const responsiveToPixels = (rect, canvasWidth, canvasHeight = 800) => {
    return {
        x: (rect.left / 100) * canvasWidth,
        y: (rect.top / 100) * canvasHeight,
        w: (rect.width / 100) * canvasWidth,
        h: (rect.height / 100) * canvasHeight,
    };
};
// Grid snapping utility
export const snapToGrid = (value, gridSize) => {
    return Math.round(value / gridSize) * gridSize;
};
// Calculate grid offset to center the grid (equal cutoff on both sides)
export const getGridOffset = (containerSize, gridSize) => {
    return (containerSize % gridSize) / 2;
};
// Snap to centered grid (accounts for grid offset)
export const snapToCenteredGrid = (value, gridSize, containerSize) => {
    const offset = getGridOffset(containerSize, gridSize);
    // Adjust value by offset, snap to grid, then adjust back
    const snapped = snapToGrid(value - offset, gridSize) + offset;
    // Ensure snapped value doesn't exceed container bounds
    return Math.max(offset, Math.min(snapped, containerSize - offset));
};
// Snap size to grid (ensures size is a multiple of gridSize)
export const snapSizeToGrid = (value, gridSize) => {
    // Round to nearest multiple of gridSize, with minimum of gridSize
    return Math.max(gridSize, Math.round(value / gridSize) * gridSize);
};
// --- Percentage-based (0–100) grid snapping for positionUnit: '%' ---
export const gridPercentX = (gridSize, canvasWidth) => canvasWidth ? (gridSize / canvasWidth) * 100 : 0;
export const gridPercentY = (gridSize, canvasHeight) => canvasHeight ? (gridSize / canvasHeight) * 100 : 0;
export const snapToGridPercent = (value, gridPercent) => gridPercent ? Math.round(value / gridPercent) * gridPercent : value;
export const snapToCenteredGridPercent = (value, gridPercent, containerPercent = 100) => {
    if (!gridPercent)
        return value;
    const offset = (containerPercent % gridPercent) / 2;
    const snapped = snapToGridPercent(value - offset, gridPercent) + offset;
    return Math.max(offset, Math.min(snapped, containerPercent - offset));
};
export const snapSizeToGridPercent = (value, gridPercent) => gridPercent
    ? Math.max(gridPercent, Math.round(value / gridPercent) * gridPercent)
    : value;
// --- Sections (page height = sum of section heights) ---
/** Total page height in px. If no sections, returns defaultSingleSectionHeight. */
export function getPageTotalHeight(sections, defaultSingleSectionHeight) {
    if (!sections?.length)
        return defaultSingleSectionHeight;
    return sections.reduce((sum, s) => sum + s.height, 0);
}
/** Migrate legacy pageData (no sections) to one section; assign sectionId to all elements. Idempotent if sections already present. */
export function normalizePageData(data, defaultSectionHeight) {
    if (data.sections?.length)
        return data;
    const sectionId = `sec-${Date.now()}`;
    const section = {
        id: sectionId,
        fullWidth: false,
        height: defaultSectionHeight,
    };
    const elements = (data.elements || []).map(el => ({
        ...el,
        sectionId,
    }));
    return {
        ...data,
        sections: [section],
        elements,
    };
}
