"use client";
import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { Rnd } from "react-rnd";
import {
  snapToCenteredGridPercent,
  snapSizeToGridPercent,
  snapSizeToGrid,
  gridPercentX,
  gridPercentY,
  getPageTotalHeight,
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
export function PageEditor({ editor }) {
  const {
    pageData,
    breakpoint,
    selectedIds,
    showGrid,
    updateLayout,
    updateLayoutBulk,
    addElement,
    deleteElement,
    updateZIndex,
    ensureBreakpointLayout,
    setBreakpoint,
    setShowGrid,
    selectElements,
    undo,
    redo,
    canUndo,
    canRedo,
    gridSize,
    breakpoints,
    canvasHeight,
    defaultSectionHeight,
    addSection,
    deleteSection,
    updateSectionHeight,
    updateSectionFullWidth,
    updateElement,
    components,
  } = editor;
  const canvasWidth = breakpoints[breakpoint];
  const gridHeight = 600;
  const sections = pageData.sections ?? [];
  const pageTotalHeight = getPageTotalHeight(
    pageData.sections,
    defaultSectionHeight ?? 600
  );
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(
    () => sections[0]?.id ?? null
  );
  const [resizingSectionId, setResizingSectionId] = useState(null);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartHeight, setResizeStartHeight] = useState(0);
  // Marquee selection (client coords + container rect for drawing)
  const [marquee, setMarquee] = useState(null);
  const marqueeContainerRef = useRef(null);
  const marqueeElementsRef = useRef([]);
  const marqueeValueRef = useRef(null);
  marqueeValueRef.current = marquee;
  // During group drag: show other selected elements offset by this delta (updated in onDrag)
  const [groupDrag, setGroupDrag] = useState(null);
  const groupDragDraggedIdRef = useRef(null);
  // Keyboard shortcuts
  useKeyboardShortcuts(undo, redo);
  // Sync selected section when sections load or change
  useEffect(() => {
    if (sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
    }
    if (selectedSectionId && !sections.some(s => s.id === selectedSectionId)) {
      setSelectedSectionId(sections[0]?.id ?? null);
    }
  }, [sections, selectedSectionId]);
  // Section height resize (mouse drag), snapped to grid
  useEffect(() => {
    if (!resizingSectionId) return;
    const onMove = e => {
      const delta = e.clientY - resizeStartY;
      const sec = sections.find(s => s.id === resizingSectionId);
      if (sec) {
        const rawHeight = resizeStartHeight + delta;
        const snappedHeight = Math.max(
          100,
          snapSizeToGrid(rawHeight, gridSize)
        );
        updateSectionHeight(resizingSectionId, snappedHeight);
      }
    };
    const onUp = () => setResizingSectionId(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [
    resizingSectionId,
    resizeStartY,
    resizeStartHeight,
    sections,
    gridSize,
    updateSectionHeight,
  ]);
  const targetSectionId = selectedSectionId ?? sections[0]?.id;
  // Marquee: mousemove and mouseup to update/end selection
  useEffect(() => {
    if (!marquee) return;
    const onMove = e => {
      setMarquee(prev =>
        prev ? { ...prev, endX: e.clientX, endY: e.clientY } : null
      );
    };
    const onUp = () => {
      const current = marqueeValueRef.current;
      if (!current) return;
      const container = marqueeContainerRef.current;
      const elements = marqueeElementsRef.current;
      if (container && elements.length > 0) {
        const rect = container.getBoundingClientRect();
        const left = Math.min(current.startX, current.endX);
        const right = Math.max(current.startX, current.endX);
        const top = Math.min(current.startY, current.endY);
        const bottom = Math.max(current.startY, current.endY);
        const marqueeL = ((left - rect.left) / rect.width) * 100;
        const marqueeR = ((right - rect.left) / rect.width) * 100;
        const marqueeT = ((top - rect.top) / rect.height) * 100;
        const marqueeB = ((bottom - rect.top) / rect.height) * 100;
        const selected = elements.filter(el => {
          const l = el.layout.x;
          const r = el.layout.x + el.layout.w;
          const t = el.layout.y;
          const b = el.layout.y + el.layout.h;
          return !(
            marqueeR < l ||
            r < marqueeL ||
            marqueeB < t ||
            b < marqueeT
          );
        });
        selectElements(selected.map(el => el.id));
      }
      setMarquee(null);
      marqueeContainerRef.current = null;
      marqueeElementsRef.current = [];
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [marquee, selectElements]);
  const handleCanvasMouseDown = useCallback(
    (e, sectionElements, breakpointKey, sectionId) => {
      if (e.target !== e.currentTarget) return;
      const container = e.currentTarget;
      const containerRect = container.getBoundingClientRect();
      marqueeContainerRef.current = container;
      marqueeElementsRef.current = sectionElements.map(el => ({
        id: el.id,
        layout: el.layout[breakpointKey],
      }));
      setMarquee({
        startX: e.clientX,
        startY: e.clientY,
        endX: e.clientX,
        endY: e.clientY,
        containerRect: {
          left: containerRect.left,
          top: containerRect.top,
        },
        sectionId,
      });
    },
    []
  );
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
          padding: !showPreview ? 0 : "32px",
          display: "flex",
          justifyContent: "center",
        },
        children: showPreview
          ? _jsxs("div", {
              style: {
                width: "100%",
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
          : _jsx("div", {
              style: {
                display: "flex",
                flexDirection: "column",
                width: "100%",
                minHeight: pageTotalHeight,
              },
              children: sections.map(section => {
                const sectionElements = (pageData.elements || []).filter(
                  el => el.sectionId === section.id
                );
                const isSelected = selectedSectionId === section.id;
                const sectionWidth = section.fullWidth
                  ? undefined
                  : (section.width ?? canvasWidth);
                const innerWidth = section.fullWidth
                  ? canvasWidth
                  : (section.width ?? canvasWidth);
                return _jsxs(
                  "div",
                  {
                    style: {
                      width: section.fullWidth ? "100%" : sectionWidth,
                      alignSelf: section.fullWidth ? "stretch" : "center",
                      minHeight: section.height,
                      marginBottom: "24px",
                      position: "relative",
                    },
                    onMouseDown: () => setSelectedSectionId(section.id),
                    children: [
                      _jsxs("div", {
                        style: {
                          position: "relative",
                          width: innerWidth,
                          height: section.height,
                          margin: "0 auto",
                          boxSizing: "border-box",
                        },
                        onMouseDown: e => {
                          if (e.target === e.currentTarget) {
                            handleCanvasMouseDown(
                              e,
                              sectionElements,
                              breakpoint,
                              section.id
                            );
                          }
                        },
                        children: [
                          showGrid &&
                            _jsx(GridOverlay, {
                              width: innerWidth,
                              height: section.height,
                              gridSize: gridSize,
                            }),
                          marquee &&
                            marquee.sectionId === section.id &&
                            marquee.containerRect &&
                            _jsx("div", {
                              style: {
                                position: "absolute",
                                left:
                                  Math.min(marquee.startX, marquee.endX) -
                                  marquee.containerRect.left,
                                top:
                                  Math.min(marquee.startY, marquee.endY) -
                                  marquee.containerRect.top,
                                width: Math.abs(marquee.endX - marquee.startX),
                                height: Math.abs(marquee.endY - marquee.startY),
                                background: "rgba(59, 130, 246, 0.15)",
                                border: "1px solid #3b82f6",
                                pointerEvents: "none",
                                zIndex: 10000,
                              },
                            }),
                          sectionElements.map(element => {
                            const Component = components[element.type];
                            if (!Component) return null;
                            const layout = ensureBreakpointLayout(
                              element,
                              breakpoint
                            );
                            const gx = gridPercentX(gridSize, innerWidth);
                            const gy = gridPercentY(gridSize, section.height);
                            return _jsx(
                              Rnd,
                              {
                                positionUnit: "%",
                                size: {
                                  width: `${layout.w}%`,
                                  height: `${layout.h}%`,
                                },
                                position:
                                  groupDrag &&
                                  groupDrag.draggedId !== element.id &&
                                  selectedIds.includes(element.id)
                                    ? {
                                        x: Math.max(
                                          0,
                                          Math.min(
                                            100 - layout.w,
                                            layout.x + groupDrag.deltaX
                                          )
                                        ),
                                        y: Math.max(
                                          0,
                                          Math.min(
                                            100 - layout.h,
                                            layout.y + groupDrag.deltaY
                                          )
                                        ),
                                      }
                                    : { x: layout.x, y: layout.y },
                                onDragStart: () => {
                                  if (
                                    selectedIds.includes(element.id) &&
                                    selectedIds.length > 1
                                  ) {
                                    groupDragDraggedIdRef.current = element.id;
                                    setGroupDrag({
                                      draggedId: element.id,
                                      deltaX: 0,
                                      deltaY: 0,
                                    });
                                  }
                                },
                                onDrag: (e, d) => {
                                  if (
                                    groupDragDraggedIdRef.current === element.id
                                  ) {
                                    setGroupDrag(prev =>
                                      prev
                                        ? {
                                            ...prev,
                                            deltaX: d.x - layout.x,
                                            deltaY: d.y - layout.y,
                                          }
                                        : {
                                            draggedId: element.id,
                                            deltaX: d.x - layout.x,
                                            deltaY: d.y - layout.y,
                                          }
                                    );
                                  }
                                },
                                onDragStop: (e, d) => {
                                  if (
                                    groupDragDraggedIdRef.current === element.id
                                  ) {
                                    groupDragDraggedIdRef.current = null;
                                    setGroupDrag(null);
                                  }
                                  const snap = element.snapToGrid !== false;
                                  const finalX = snap
                                    ? snapToCenteredGridPercent(d.x, gx, 100)
                                    : Math.max(
                                        0,
                                        Math.min(100 - layout.w, d.x)
                                      );
                                  const finalY = snap
                                    ? snapToCenteredGridPercent(d.y, gy, 100)
                                    : Math.max(
                                        0,
                                        Math.min(100 - layout.h, d.y)
                                      );
                                  const deltaX = finalX - layout.x;
                                  const deltaY = finalY - layout.y;
                                  if (
                                    selectedIds.includes(element.id) &&
                                    selectedIds.length > 1
                                  ) {
                                    const others = (
                                      pageData.elements ?? []
                                    ).filter(
                                      el =>
                                        selectedIds.includes(el.id) &&
                                        el.id !== element.id &&
                                        el.sectionId === section.id
                                    );
                                    const updates = [
                                      {
                                        id: element.id,
                                        rect: {
                                          ...layout,
                                          x: finalX,
                                          y: finalY,
                                        },
                                      },
                                    ];
                                    others.forEach(other => {
                                      const otherLayout =
                                        ensureBreakpointLayout(
                                          other,
                                          breakpoint
                                        );
                                      updates.push({
                                        id: other.id,
                                        rect: {
                                          ...otherLayout,
                                          x: Math.max(
                                            0,
                                            Math.min(
                                              100 - otherLayout.w,
                                              otherLayout.x + deltaX
                                            )
                                          ),
                                          y: Math.max(
                                            0,
                                            Math.min(
                                              100 - otherLayout.h,
                                              otherLayout.y + deltaY
                                            )
                                          ),
                                        },
                                      });
                                    });
                                    updateLayoutBulk(updates);
                                  } else {
                                    updateLayout(element.id, {
                                      ...layout,
                                      x: finalX,
                                      y: finalY,
                                    });
                                  }
                                },
                                onResizeStop: (
                                  e,
                                  direction,
                                  ref,
                                  delta,
                                  position
                                ) => {
                                  const widthPercent =
                                    (ref.offsetWidth / innerWidth) * 100;
                                  const heightPercent =
                                    (ref.offsetHeight / section.height) * 100;
                                  const snap = element.snapToGrid !== false;
                                  const w = snap
                                    ? snapSizeToGridPercent(widthPercent, gx)
                                    : Math.max(
                                        0.1,
                                        Math.min(100, widthPercent)
                                      );
                                  const h = snap
                                    ? snapSizeToGridPercent(heightPercent, gy)
                                    : Math.max(
                                        0.1,
                                        Math.min(100, heightPercent)
                                      );
                                  const gridOffsetX = (100 % gx) / 2;
                                  const gridOffsetY = (100 % gy) / 2;
                                  const maxX = 100 - w - gridOffsetX;
                                  const maxY = 100 - h - gridOffsetY;
                                  const x = snap
                                    ? snapToCenteredGridPercent(
                                        position.x,
                                        gx,
                                        100
                                      )
                                    : position.x;
                                  const y = snap
                                    ? snapToCenteredGridPercent(
                                        position.y,
                                        gy,
                                        100
                                      )
                                    : position.y;
                                  const finalX = Math.max(
                                    gridOffsetX,
                                    Math.min(x, maxX)
                                  );
                                  const finalY = Math.max(
                                    gridOffsetY,
                                    Math.min(y, maxY)
                                  );
                                  updateLayout(element.id, {
                                    w,
                                    h,
                                    x: finalX,
                                    y: finalY,
                                  });
                                },
                                dragGrid:
                                  element.snapToGrid !== false
                                    ? [gx, gy]
                                    : [0.001, 0.001],
                                resizeGrid:
                                  element.snapToGrid !== false
                                    ? [gx, gy]
                                    : [0.001, 0.001],
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
                                resizeHandleStyles: selectedIds.includes(
                                  element.id
                                )
                                  ? {
                                      topRight: {
                                        width: "9px",
                                        backgroundColor: "#3b82f6",
                                        height: "9px",
                                        right: "-9px",
                                        top: "-9px",
                                        borderRadius: "25%",
                                      },
                                      bottomRight: {
                                        width: "9px",
                                        backgroundColor: "#3b82f6",
                                        height: "9px",
                                        right: "-9px",
                                        bottom: "-9px",
                                        borderRadius: "25%",
                                      },
                                      bottomLeft: {
                                        width: "9px",
                                        backgroundColor: "#3b82f6",
                                        height: "9px",
                                        left: "-9px",
                                        bottom: "-9px",
                                        borderRadius: "25%",
                                      },
                                      topLeft: {
                                        width: "9px",
                                        backgroundColor: "#3b82f6",
                                        height: "9px",
                                        left: "-9px",
                                        top: "-9px",
                                        borderRadius: "25%",
                                      },
                                      top: {
                                        backgroundColor: "#3b82f6",
                                        top: "-6px",
                                        height: "2px",
                                      },
                                      bottom: {
                                        backgroundColor: "#3b82f6",
                                        bottom: "-6px",
                                        height: "2px",
                                      },
                                      left: {
                                        backgroundColor: "#3b82f6",
                                        left: "-6px",
                                        width: "2px",
                                      },
                                      right: {
                                        backgroundColor: "#3b82f6",
                                        right: "-6px",
                                        width: "2px",
                                      },
                                    }
                                  : {},
                                style: { zIndex: element.zIndex },
                                onMouseDown: e => {
                                  e.stopPropagation();
                                  const meta = e.metaKey || e.ctrlKey;
                                  const nextIds = meta
                                    ? selectedIds.includes(element.id)
                                      ? selectedIds.filter(
                                          id => id !== element.id
                                        )
                                      : [...selectedIds, element.id]
                                    : selectedIds.includes(element.id)
                                      ? selectedIds
                                      : [element.id];
                                  selectElements(nextIds);
                                },
                                children: _jsx("div", {
                                  style: {
                                    width: "100%",
                                    height: "100%",
                                  },
                                  children: _jsx(Component, {
                                    ...element.content,
                                  }),
                                }),
                              },
                              `${element.id}-${breakpoint}`
                            );
                          }),
                          _jsx("div", {
                            style: {
                              position: "absolute",
                              inset: 0,
                              border: `2px solid ${isSelected ? "#3b82f6" : "#e5e7eb"}`,
                              borderRadius: "inherit",
                              pointerEvents: "none",
                              zIndex: 1,
                            },
                          }),
                        ],
                      }),
                      _jsx("div", {
                        role: "button",
                        tabIndex: 0,
                        style: {
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: "8px",
                          cursor: "ns-resize",
                          background:
                            resizingSectionId === section.id
                              ? "#3b82f6"
                              : "rgba(0,0,0,0.06)",
                        },
                        onMouseDown: e => {
                          e.preventDefault();
                          setResizingSectionId(section.id);
                          setResizeStartY(e.clientY);
                          setResizeStartHeight(section.height);
                        },
                      }),
                    ],
                  },
                  section.id
                );
              }),
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
            _jsxs("div", {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginBottom: "16px",
              },
              children: [
                _jsx("div", {
                  style: {
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  },
                  children: "Sections",
                }),
                _jsx("button", {
                  type: "button",
                  onClick: () => addSection(false),
                  style: {
                    width: "100%",
                    padding: "8px 12px",
                    background: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "#1f2937",
                  },
                  children: "+ Content-width section",
                }),
                _jsx("button", {
                  type: "button",
                  onClick: () => addSection(true),
                  style: {
                    width: "100%",
                    padding: "8px 12px",
                    background: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "#1f2937",
                  },
                  children: "+ Full-width section",
                }),
                targetSectionId &&
                  _jsxs(_Fragment, {
                    children: [
                      _jsx("button", {
                        type: "button",
                        onClick: () => {
                          const sec = sections.find(
                            s => s.id === targetSectionId
                          );
                          if (sec) {
                            updateSectionFullWidth(
                              targetSectionId,
                              !sec.fullWidth
                            );
                          }
                        },
                        style: {
                          width: "100%",
                          padding: "6px 12px",
                          background: "#e5e7eb",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                          color: "#374151",
                        },
                        children: "Toggle full-width",
                      }),
                      _jsx("button", {
                        type: "button",
                        onClick: () => {
                          if (sections.length > 1) {
                            deleteSection(targetSectionId);
                            setSelectedSectionId(
                              sections.find(s => s.id !== targetSectionId)
                                ?.id ?? null
                            );
                          }
                        },
                        disabled: sections.length <= 1,
                        style: {
                          width: "100%",
                          padding: "6px 12px",
                          background: "#fef2f2",
                          color: "#b91c1c",
                          border: "1px solid #fecaca",
                          borderRadius: "4px",
                          cursor:
                            sections.length <= 1 ? "not-allowed" : "pointer",
                          fontSize: "12px",
                          opacity: sections.length <= 1 ? 0.6 : 1,
                        },
                        children: "Delete section",
                      }),
                    ],
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
                    onClick: () =>
                      addElement(type, undefined, targetSectionId ?? undefined),
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
            selectedIds.length > 0 &&
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
                    children:
                      selectedIds.length === 1
                        ? "Selected Element"
                        : `Selected Elements (${selectedIds.length})`,
                  }),
                  _jsxs("div", {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    },
                    children: [
                      _jsxs("label", {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: "#1f2937",
                        },
                        children: [
                          _jsx("input", {
                            type: "checkbox",
                            checked: (pageData.elements ?? [])
                              .filter(e => selectedIds.includes(e.id))
                              .every(el => el.snapToGrid !== false),
                            onChange: e =>
                              selectedIds.forEach(id =>
                                updateElement(id, {
                                  snapToGrid: e.target.checked,
                                })
                              ),
                          }),
                          _jsx("span", { children: "Snap to grid" }),
                        ],
                      }),
                      _jsx("button", {
                        onClick: () =>
                          selectedIds.forEach(id => updateZIndex(id, "up")),
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
                        onClick: () =>
                          selectedIds.forEach(id => updateZIndex(id, "down")),
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
                        onClick: () => {
                          selectedIds.forEach(id => deleteElement(id));
                          selectElements([]);
                        },
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
