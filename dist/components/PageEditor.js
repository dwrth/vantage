"use client";
import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Rnd } from "react-rnd";
import { defaultComponents } from "../adapters/components";
import { usePageEditor } from "../hooks/usePageEditor";
import {
  snapToCenteredGridPercent,
  snapSizeToGridPercent,
  gridPercentX,
  gridPercentY,
} from "../utils/layout";
import BreakpointSwitcher from "./BreakpointSwitcher";
import GridOverlay from "./GridOverlay";
import { LiveView } from "./LiveView";
// Keyboard shortcuts for undo/redo
const useKeyboardShortcuts = (undo, redo) => {
  useEffect(() => {
    const handleKeyDown = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);
};
export function PageEditor({ pageId, config }) {
  const components = config?.components || defaultComponents;
  const {
    pageData,
    breakpoint,
    selectedId,
    showGrid,
    updateLayout,
    addElement,
    deleteElement,
    updateZIndex,
    ensureBreakpointLayout,
    setBreakpoint,
    setSelectedId,
    setShowGrid,
    undo,
    redo,
    canUndo,
    canRedo,
    gridSize,
    breakpoints,
    canvasHeight,
  } = usePageEditor(pageId, config);
  const canvasWidth = breakpoints[breakpoint];
  // Use canvasHeight from hook (defaults to 800, but GridOverlay uses 600)
  const gridHeight = 600; // Match GridOverlay height
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  // Keyboard shortcuts
  useKeyboardShortcuts(undo, redo);
  return _jsxs("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      background: "#f9fafb",
    },
    children: [
      _jsxs("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          gap: "16px",
        },
        children: [
          _jsxs("button", {
            type: "button",
            onClick: () => setShowSidebar(s => !s),
            style: {
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
              background: showSidebar ? "#e5e7eb" : "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
              color: "#1f2937",
            },
            title: showSidebar ? "Hide elements panel" : "Show elements panel",
            children: [
              _jsx("span", { style: { fontSize: "16px" }, children: "\u2630" }),
              "Elements",
            ],
          }),
          _jsx(BreakpointSwitcher, {
            currentBreakpoint: breakpoint,
            onBreakpointChange: setBreakpoint,
          }),
        ],
      }),
      _jsx("div", {
        style: {
          flex: 1,
          overflow: "auto",
          padding: "32px",
          display: "flex",
          justifyContent: "center",
        },
        children: showPreview
          ? _jsxs("div", {
              style: {
                width: canvasWidth,
                maxWidth: "100%",
                background: "#f9fafb",
              },
              children: [
                _jsxs("div", {
                  style: {
                    marginBottom: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#1f2937",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  },
                  children: [
                    "Preview \u2014",
                    " ",
                    breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1),
                  ],
                }),
                _jsx(LiveView, {
                  pageData: pageData,
                  components: components,
                  breakpoints: breakpoints,
                  canvasHeight: gridHeight,
                  currentBreakpoint: breakpoint,
                }),
              ],
            })
          : _jsxs("div", {
              style: {
                position: "relative",
                background: "white",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                width: canvasWidth,
                height: gridHeight,
                minHeight: gridHeight,
              },
              children: [
                showGrid &&
                  _jsx(GridOverlay, {
                    width: canvasWidth,
                    height: gridHeight,
                    gridSize: gridSize,
                  }),
                pageData.elements.map(element => {
                  const Component = components[element.type];
                  if (!Component) return null;
                  const layout = ensureBreakpointLayout(element, breakpoint);
                  const gx = gridPercentX(gridSize, canvasWidth);
                  const gy = gridPercentY(gridSize, gridHeight);
                  return _jsx(
                    Rnd,
                    {
                      positionUnit: "%",
                      size: { width: `${layout.w}%`, height: `${layout.h}%` },
                      position: { x: layout.x, y: layout.y },
                      onDragStop: (e, d) => {
                        updateLayout(element.id, {
                          ...layout,
                          x: snapToCenteredGridPercent(d.x, gx, 100),
                          y: snapToCenteredGridPercent(d.y, gy, 100),
                        });
                      },
                      onResizeStop: (e, direction, ref, delta, position) => {
                        const widthPercent =
                          (ref.offsetWidth / canvasWidth) * 100;
                        const heightPercent =
                          (ref.offsetHeight / gridHeight) * 100;
                        const snappedW = snapSizeToGridPercent(
                          widthPercent,
                          gx
                        );
                        const snappedH = snapSizeToGridPercent(
                          heightPercent,
                          gy
                        );
                        const snappedX = snapToCenteredGridPercent(
                          position.x,
                          gx,
                          100
                        );
                        const snappedY = snapToCenteredGridPercent(
                          position.y,
                          gy,
                          100
                        );
                        const gridOffsetX = (100 % gx) / 2;
                        const gridOffsetY = (100 % gy) / 2;
                        const maxX = 100 - snappedW - gridOffsetX;
                        const maxY = 100 - snappedH - gridOffsetY;
                        const finalX = Math.max(
                          gridOffsetX,
                          Math.min(snappedX, maxX)
                        );
                        const finalY = Math.max(
                          gridOffsetY,
                          Math.min(snappedY, maxY)
                        );
                        updateLayout(element.id, {
                          w: snappedW,
                          h: snappedH,
                          x: finalX,
                          y: finalY,
                        });
                      },
                      dragGrid: [gx, gy],
                      resizeGrid: [gx, gy],
                      enableResizing: {
                        top: true,
                        right: true,
                        bottom: true,
                        left: true,
                        topRight: true,
                        bottomRight: true,
                        bottomLeft: true,
                        topLeft: true,
                      },
                      bounds: "parent",
                      style: { zIndex: element.zIndex },
                      onMouseDown: () => setSelectedId(element.id),
                      children: _jsx("div", {
                        style: {
                          width: "100%",
                          height: "100%",
                          border: `2px solid ${selectedId === element.id ? "#3b82f6" : "transparent"}`,
                        },
                        children: _jsx(Component, { ...element.content }),
                      }),
                    },
                    `${element.id}-${breakpoint}`
                  );
                }),
              ],
            }),
      }),
      _jsx("button", {
        type: "button",
        onClick: () => setShowPreview(p => !p),
        style: {
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 1001,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 20px",
          background: "white",
          color: "#1f2937",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
        },
        title: showPreview ? "Switch to editor" : "Switch to preview",
        children: showPreview
          ? _jsxs(_Fragment, {
              children: [_jsx("span", { children: "\u270F\uFE0F" }), "Edit"],
            })
          : _jsxs(_Fragment, {
              children: [_jsx("span", { children: "\uD83D\uDC41" }), "Preview"],
            }),
      }),
      showSidebar &&
        _jsxs("div", {
          style: {
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            width: "280px",
            maxWidth: "90vw",
            background: "white",
            boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
            padding: "16px",
            zIndex: 1000,
            overflowY: "auto",
          },
          children: [
            _jsxs("div", {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              },
              children: [
                _jsx("h2", {
                  style: { fontWeight: "bold", margin: 0, color: "#1f2937" },
                  children: "Elements",
                }),
                _jsx("button", {
                  type: "button",
                  onClick: () => setShowSidebar(false),
                  style: {
                    padding: "4px 8px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "18px",
                    lineHeight: 1,
                    color: "#1f2937",
                  },
                  title: "Close panel",
                  children: "\u00D7",
                }),
              ],
            }),
            _jsx("div", {
              style: { marginBottom: "16px" },
              children: _jsxs("label", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                },
                children: [
                  _jsx("input", {
                    type: "checkbox",
                    checked: showGrid,
                    onChange: e => setShowGrid(e.target.checked),
                  }),
                  _jsx("span", {
                    style: { fontSize: "14px", color: "#1f2937" },
                    children: "Show Grid",
                  }),
                ],
              }),
            }),
            _jsxs("div", {
              style: {
                display: "flex",
                gap: "8px",
                marginBottom: "16px",
              },
              children: [
                _jsx("button", {
                  onClick: undo,
                  disabled: !canUndo,
                  style: {
                    flex: 1,
                    padding: "8px 12px",
                    background: canUndo ? "#6b7280" : "#d1d5db",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: canUndo ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    fontWeight: 500,
                    opacity: canUndo ? 1 : 0.5,
                  },
                  title: "Undo (Ctrl+Z)",
                  children: "\u21B6 Undo",
                }),
                _jsx("button", {
                  onClick: redo,
                  disabled: !canRedo,
                  style: {
                    flex: 1,
                    padding: "8px 12px",
                    background: canRedo ? "#6b7280" : "#d1d5db",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: canRedo ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    fontWeight: 500,
                    opacity: canRedo ? 1 : 0.5,
                  },
                  title: "Redo (Ctrl+Shift+Z)",
                  children: "\u21B7 Redo",
                }),
              ],
            }),
            _jsx("div", {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginBottom: "16px",
              },
              children: Object.keys(components).map(type =>
                _jsxs(
                  "button",
                  {
                    onClick: () => addElement(type),
                    style: {
                      width: "100%",
                      padding: "8px 16px",
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: 500,
                    },
                    onMouseEnter: e => {
                      e.currentTarget.style.background = "#1d4ed8";
                    },
                    onMouseLeave: e => {
                      e.currentTarget.style.background = "#2563eb";
                    },
                    children: ["Add ", type],
                  },
                  type
                )
              ),
            }),
            selectedId &&
              _jsxs("div", {
                style: {
                  marginTop: "16px",
                  padding: "12px",
                  background: "#f3f4f6",
                  borderRadius: "4px",
                },
                children: [
                  _jsx("h3", {
                    style: {
                      fontWeight: "600",
                      marginBottom: "8px",
                      color: "#1f2937",
                    },
                    children: "Selected Element",
                  }),
                  _jsxs("div", {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    },
                    children: [
                      _jsx("button", {
                        onClick: () => updateZIndex(selectedId, "up"),
                        style: {
                          width: "100%",
                          padding: "4px 12px",
                          background: "#e5e7eb",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                          color: "#1f2937",
                        },
                        children: "Bring to Front",
                      }),
                      _jsx("button", {
                        onClick: () => updateZIndex(selectedId, "down"),
                        style: {
                          width: "100%",
                          padding: "4px 12px",
                          background: "#e5e7eb",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                          color: "#1f2937",
                        },
                        children: "Send to Back",
                      }),
                      _jsx("button", {
                        onClick: () => deleteElement(selectedId),
                        style: {
                          width: "100%",
                          padding: "4px 12px",
                          background: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                        },
                        children: "Delete",
                      }),
                    ],
                  }),
                ],
              }),
          ],
        }),
    ],
  });
}
