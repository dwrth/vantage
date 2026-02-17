'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { defaultComponents } from '../adapters/components';
import { usePageEditor } from '../hooks/usePageEditor';
import { snapToCenteredGrid, snapSizeToGrid } from '../utils/layout';
import BreakpointSwitcher from './BreakpointSwitcher';
import GridOverlay from './GridOverlay';
// Keyboard shortcuts for undo/redo
const useKeyboardShortcuts = (undo, redo) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);
};
export function PageEditor({ pageId, config, }) {
    const components = (config?.components ||
        defaultComponents);
    const { pageData, breakpoint, selectedId, showGrid, updateLayout, addElement, deleteElement, updateZIndex, ensureBreakpointLayout, setBreakpoint, setSelectedId, setShowGrid, undo, redo, canUndo, canRedo, gridSize, breakpoints, canvasHeight, } = usePageEditor(pageId, config);
    const canvasWidth = breakpoints[breakpoint];
    // Use canvasHeight from hook (defaults to 800, but GridOverlay uses 600)
    const gridHeight = 600; // Match GridOverlay height
    // Keyboard shortcuts
    useKeyboardShortcuts(undo, redo);
    return (_jsxs("div", { style: {
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            background: '#f9fafb',
        }, children: [_jsx(BreakpointSwitcher, { currentBreakpoint: breakpoint, onBreakpointChange: setBreakpoint }), _jsxs("div", { style: { display: 'flex', flex: 1 }, children: [_jsxs("div", { style: {
                            width: '256px',
                            background: 'white',
                            borderRight: '1px solid #e5e7eb',
                            padding: '16px',
                        }, children: [_jsx("h2", { style: { fontWeight: 'bold', marginBottom: '16px' }, children: "Elements" }), _jsx("div", { style: { marginBottom: '16px' }, children: _jsxs("label", { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                    }, children: [_jsx("input", { type: "checkbox", checked: showGrid, onChange: (e) => setShowGrid(e.target.checked) }), _jsx("span", { style: { fontSize: '14px' }, children: "Show Grid" })] }) }), _jsxs("div", { style: {
                                    display: 'flex',
                                    gap: '8px',
                                    marginBottom: '16px',
                                }, children: [_jsx("button", { onClick: undo, disabled: !canUndo, style: {
                                            flex: 1,
                                            padding: '8px 12px',
                                            background: canUndo ? '#6b7280' : '#d1d5db',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: canUndo ? 'pointer' : 'not-allowed',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            opacity: canUndo ? 1 : 0.5,
                                        }, title: "Undo (Ctrl+Z)", children: "\u21B6 Undo" }), _jsx("button", { onClick: redo, disabled: !canRedo, style: {
                                            flex: 1,
                                            padding: '8px 12px',
                                            background: canRedo ? '#6b7280' : '#d1d5db',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: canRedo ? 'pointer' : 'not-allowed',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            opacity: canRedo ? 1 : 0.5,
                                        }, title: "Redo (Ctrl+Shift+Z)", children: "\u21B7 Redo" })] }), _jsx("div", { style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    marginBottom: '16px',
                                }, children: Object.keys(components).map((type) => (_jsxs("button", { onClick: () => addElement(type), style: {
                                        width: '100%',
                                        padding: '8px 16px',
                                        background: '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                    }, onMouseEnter: (e) => {
                                        e.currentTarget.style.background = '#1d4ed8';
                                    }, onMouseLeave: (e) => {
                                        e.currentTarget.style.background = '#2563eb';
                                    }, children: ["Add ", type] }, type))) }), selectedId && (_jsxs("div", { style: {
                                    marginTop: '16px',
                                    padding: '12px',
                                    background: '#f3f4f6',
                                    borderRadius: '4px',
                                }, children: [_jsx("h3", { style: { fontWeight: '600', marginBottom: '8px' }, children: "Selected Element" }), _jsxs("div", { style: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                        }, children: [_jsx("button", { onClick: () => updateZIndex(selectedId, 'up'), style: {
                                                    width: '100%',
                                                    padding: '4px 12px',
                                                    background: '#e5e7eb',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                }, children: "Bring to Front" }), _jsx("button", { onClick: () => updateZIndex(selectedId, 'down'), style: {
                                                    width: '100%',
                                                    padding: '4px 12px',
                                                    background: '#e5e7eb',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                }, children: "Send to Back" }), _jsx("button", { onClick: () => deleteElement(selectedId), style: {
                                                    width: '100%',
                                                    padding: '4px 12px',
                                                    background: '#ef4444',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                }, children: "Delete" })] })] }))] }), _jsx("div", { style: {
                            flex: 1,
                            overflow: 'auto',
                            padding: '32px',
                            display: 'flex',
                            justifyContent: 'center',
                        }, children: _jsxs("div", { style: {
                                position: 'relative',
                                background: 'white',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                width: canvasWidth,
                                minHeight: '600px',
                            }, children: [showGrid && (_jsx(GridOverlay, { width: canvasWidth, height: gridHeight, gridSize: gridSize })), pageData.elements.map((element) => {
                                    const Component = components[element.type];
                                    if (!Component)
                                        return null;
                                    const layout = ensureBreakpointLayout(element, breakpoint);
                                    return (_jsx(Rnd, { size: { width: layout.w, height: layout.h }, position: { x: layout.x, y: layout.y }, onDragStop: (e, d) => {
                                            updateLayout(element.id, {
                                                ...layout,
                                                x: snapToCenteredGrid(d.x, gridSize, canvasWidth),
                                                y: snapToCenteredGrid(d.y, gridSize, gridHeight),
                                            });
                                        }, onResizeStop: (e, direction, ref, delta, position) => {
                                            // Get the actual rendered size
                                            const actualWidth = ref.offsetWidth;
                                            const actualHeight = ref.offsetHeight;
                                            // Snap sizes to grid (must be multiples of gridSize)
                                            const snappedWidth = snapSizeToGrid(actualWidth, gridSize);
                                            const snappedHeight = snapSizeToGrid(actualHeight, gridSize);
                                            // Snap position to centered grid
                                            const snappedX = snapToCenteredGrid(position.x, gridSize, canvasWidth);
                                            const snappedY = snapToCenteredGrid(position.y, gridSize, gridHeight);
                                            // Ensure element doesn't go outside canvas bounds
                                            const gridOffsetX = (canvasWidth % gridSize) / 2;
                                            const gridOffsetY = (gridHeight % gridSize) / 2;
                                            const maxX = canvasWidth - snappedWidth - gridOffsetX;
                                            const maxY = gridHeight - snappedHeight - gridOffsetY;
                                            const finalX = Math.max(gridOffsetX, Math.min(snappedX, maxX));
                                            const finalY = Math.max(gridOffsetY, Math.min(snappedY, maxY));
                                            updateLayout(element.id, {
                                                w: snappedWidth,
                                                h: snappedHeight,
                                                x: finalX,
                                                y: finalY,
                                            });
                                        }, dragGrid: [gridSize, gridSize], resizeGrid: [gridSize, gridSize], enableResizing: {
                                            top: true,
                                            right: true,
                                            bottom: true,
                                            left: true,
                                            topRight: true,
                                            bottomRight: true,
                                            bottomLeft: true,
                                            topLeft: true,
                                        }, bounds: "parent", style: { zIndex: element.zIndex }, onMouseDown: () => setSelectedId(element.id), children: _jsx("div", { style: {
                                                width: '100%',
                                                height: '100%',
                                                border: `2px solid ${selectedId === element.id ? '#3b82f6' : 'transparent'}`,
                                            }, children: _jsx(Component, { ...element.content }) }) }, `${element.id}-${breakpoint}`));
                                })] }) })] })] }));
}
