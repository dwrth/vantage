"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Rnd } from "react-rnd";
import type { RndDragEvent } from "react-rnd";
import type { VantageEditorInstance } from "../core/editor-instance";
import {
  getPageTotalHeight,
  getSectionRowCount,
  marqueePxToGridRange,
  gridPlacementOverlapsRange,
} from "../utils/layout";
import type { GridPlacement, PageElement, Breakpoint } from "../core/types";
import BreakpointSwitcher from "./BreakpointSwitcher";
import GridOverlay from "./GridOverlay";
import { LiveView } from "./LiveView";

// Keyboard shortcuts for undo/redo
const useKeyboardShortcuts = (undo: () => void, redo: () => void) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

interface PageEditorProps<T extends string = string> {
  editor: VantageEditorInstance<T>;
}

export function PageEditor<T extends string = string>({
  editor,
}: PageEditorProps<T>) {
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
    gridColumns,
    gridRowHeight,
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
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    () => sections[0]?.id ?? null
  );
  const [resizingSectionId, setResizingSectionId] = useState<string | null>(
    null
  );
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartHeight, setResizeStartHeight] = useState(0);
  // Marquee selection (client coords + container rect for drawing)
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    containerRect: { left: number; top: number };
    sectionId: string | null;
  } | null>(null);
  const marqueeContainerRef = useRef<HTMLDivElement | null>(null);
  const marqueeElementsRef = useRef<{ id: string; layout: GridPlacement }[]>(
    []
  );
  const marqueeValueRef = useRef<typeof marquee>(null);
  marqueeValueRef.current = marquee;
  // During group drag: show other selected elements offset by this delta (updated in onDrag)
  const [groupDrag, setGroupDrag] = useState<{
    draggedId: string;
    deltaX: number;
    deltaY: number;
  } | null>(null);
  const groupDragDraggedIdRef = useRef<string | null>(null);

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

  // Section height resize (mouse drag), snapped to grid row height
  useEffect(() => {
    if (!resizingSectionId) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientY - resizeStartY;
      const sec = sections.find(s => s.id === resizingSectionId);
      if (sec) {
        const rawHeight = resizeStartHeight + delta;
        const snappedHeight = Math.max(
          100,
          Math.round(rawHeight / gridRowHeight) * gridRowHeight
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
    gridRowHeight,
    updateSectionHeight,
  ]);

  const targetSectionId = selectedSectionId ?? sections[0]?.id;

  // Marquee: mousemove and mouseup to update/end selection
  useEffect(() => {
    if (!marquee) return;
    const onMove = (e: MouseEvent) => {
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
        const leftPx = Math.min(current.startX, current.endX) - rect.left;
        const rightPx = Math.max(current.startX, current.endX) - rect.left;
        const topPx = Math.min(current.startY, current.endY) - rect.top;
        const bottomPx = Math.max(current.startY, current.endY) - rect.top;
        const { minCol, maxCol, minRow, maxRow } = marqueePxToGridRange(
          leftPx,
          topPx,
          rightPx,
          bottomPx,
          rect.width,
          rect.height,
          gridColumns,
          gridRowHeight
        );
        const selected = elements.filter(el =>
          gridPlacementOverlapsRange(el.layout, minCol, maxCol, minRow, maxRow)
        );
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
  }, [marquee, selectElements, gridColumns, gridRowHeight]);

  const handleCanvasMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement>,
      sectionElements: PageElement<T>[],
      breakpointKey: Breakpoint,
      sectionId: string | null
    ) => {
      if (e.target !== e.currentTarget) return;
      const container = e.currentTarget as HTMLDivElement;
      const containerRect = container.getBoundingClientRect();
      marqueeContainerRef.current = container;
      marqueeElementsRef.current = sectionElements.map(el => ({
        id: el.id,
        layout: el.layout[breakpointKey] as GridPlacement,
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#f9fafb",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          gap: "16px",
        }}
      >
        <button
          type="button"
          onClick={() => setShowSidebar(s => !s)}
          style={{
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
          }}
          title={showSidebar ? "Hide elements panel" : "Show elements panel"}
        >
          <span style={{ fontSize: "16px" }}>☰</span>
          Elements
        </button>
        <BreakpointSwitcher
          currentBreakpoint={breakpoint}
          onBreakpointChange={setBreakpoint}
        />
      </div>

      {/* Main content: editor canvas or preview */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: !showPreview ? 0 : "32px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {showPreview ? (
          <div
            style={{
              width: "100%",
              maxWidth: "100%",
              background: "#f9fafb",
            }}
          >
            <div
              style={{
                marginBottom: "8px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#1f2937",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Preview —{" "}
              {breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1)}
            </div>
            <LiveView
              pageData={pageData}
              components={components}
              breakpoints={breakpoints}
              canvasHeight={gridHeight}
              currentBreakpoint={breakpoint}
              gridColumns={gridColumns}
              gridRowHeight={gridRowHeight}
            />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              minHeight: pageTotalHeight,
            }}
          >
            {sections.map(section => {
              const sectionElements = (pageData.elements || []).filter(
                (el: { sectionId?: string }) => el.sectionId === section.id
              );
              const isSelected = selectedSectionId === section.id;
              const sectionWidth = section.fullWidth
                ? undefined
                : (section.width ?? canvasWidth);
              const innerWidth = section.fullWidth
                ? canvasWidth
                : (section.width ?? canvasWidth);
              return (
                <div
                  key={section.id}
                  style={{
                    width: section.fullWidth ? "100%" : sectionWidth,
                    alignSelf: section.fullWidth ? "stretch" : "center",
                    minHeight: section.height,
                    marginBottom: "24px",
                    position: "relative",
                  }}
                  onMouseDown={() => setSelectedSectionId(section.id)}
                >
                  <div
                    style={{
                      width: innerWidth,
                      height: section.height,
                      margin: "0 auto",
                      boxSizing: "border-box",
                      position: "relative",
                    }}
                    onMouseDown={e => {
                      if (e.target === e.currentTarget) {
                        handleCanvasMouseDown(
                          e,
                          sectionElements,
                          breakpoint,
                          section.id
                        );
                      }
                    }}
                  >
                    {showGrid && (
                      <GridOverlay
                        width={innerWidth}
                        height={section.height}
                        gridColumns={gridColumns}
                        gridRowHeight={gridRowHeight}
                      />
                    )}
                    {marquee &&
                      marquee.sectionId === section.id &&
                      marquee.containerRect && (
                        <div
                          style={{
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
                          }}
                        />
                      )}
                    {sectionElements.map(element => {
                      const Component = components[element.type as T];
                      if (!Component) return null;

                      const placement = ensureBreakpointLayout(
                        element,
                        breakpoint
                      );
                      const rowCount = getSectionRowCount(
                        section.height,
                        gridRowHeight
                      );

                      return (
                        <Rnd
                          key={`${element.id}-${breakpoint}`}
                          gridConfig={{
                            columns: gridColumns,
                            rowHeight: gridRowHeight,
                          }}
                          positionUnit="grid"
                          sizeUnit="grid"
                          position={{
                            columnStart: placement.columnStart,
                            rowStart: placement.rowStart,
                          }}
                          size={{
                            columnSpan:
                              placement.columnEnd - placement.columnStart,
                            rowSpan: placement.rowEnd - placement.rowStart,
                          }}
                          onDragStart={() => {
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
                          }}
                          onDragStop={(e: RndDragEvent, d) => {
                            const newPlacement =
                              "gridPlacement" in d
                                ? (d.gridPlacement as GridPlacement | undefined)
                                : undefined;
                            if (!newPlacement) return;
                            if (groupDragDraggedIdRef.current === element.id) {
                              groupDragDraggedIdRef.current = null;
                              setGroupDrag(null);
                            }
                            if (
                              selectedIds.includes(element.id) &&
                              selectedIds.length > 1
                            ) {
                              const dCol =
                                newPlacement.columnStart -
                                placement.columnStart;
                              const dRow =
                                newPlacement.rowStart - placement.rowStart;
                              const others = (pageData.elements ?? []).filter(
                                (el: { id: string; sectionId?: string }) =>
                                  selectedIds.includes(el.id) &&
                                  el.id !== element.id &&
                                  el.sectionId === section.id
                              );
                              const updates: {
                                id: string;
                                placement: GridPlacement;
                              }[] = [
                                { id: element.id, placement: newPlacement },
                              ];
                              others.forEach((other: PageElement<T>) => {
                                const otherPlacement = ensureBreakpointLayout(
                                  other,
                                  breakpoint
                                );
                                const colSpan =
                                  otherPlacement.columnEnd -
                                  otherPlacement.columnStart;
                                const rowSpan =
                                  otherPlacement.rowEnd -
                                  otherPlacement.rowStart;
                                const newColStart = Math.max(
                                  0,
                                  Math.min(
                                    gridColumns - colSpan,
                                    otherPlacement.columnStart + dCol
                                  )
                                );
                                const newRowStart = Math.max(
                                  0,
                                  Math.min(
                                    rowCount - rowSpan,
                                    otherPlacement.rowStart + dRow
                                  )
                                );
                                updates.push({
                                  id: other.id,
                                  placement: {
                                    columnStart: newColStart,
                                    columnEnd: newColStart + colSpan,
                                    rowStart: newRowStart,
                                    rowEnd: newRowStart + rowSpan,
                                  },
                                });
                              });
                              updateLayoutBulk(updates);
                            } else {
                              updateLayout(element.id, newPlacement);
                            }
                          }}
                          onResizeStop={(
                            e,
                            direction,
                            elementRef,
                            delta,
                            position,
                            gridPlacement
                          ) => {
                            if (gridPlacement) {
                              updateLayout(element.id, gridPlacement);
                            }
                          }}
                          enableResizing={{
                            top: true,
                            right: true,
                            bottom: true,
                            left: true,
                            topRight: true,
                            bottomRight: true,
                            bottomLeft: true,
                            topLeft: true,
                          }}
                          bounds="parent"
                          resizeHandleStyles={
                            selectedIds.includes(element.id)
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
                              : {}
                          }
                          style={{ zIndex: element.zIndex }}
                          onMouseDown={e => {
                            e.stopPropagation();
                            const meta = e.metaKey || e.ctrlKey;
                            const nextIds = meta
                              ? selectedIds.includes(element.id)
                                ? selectedIds.filter(id => id !== element.id)
                                : [...selectedIds, element.id]
                              : selectedIds.includes(element.id)
                                ? selectedIds
                                : [element.id];
                            selectElements(nextIds);
                          }}
                        >
                          <div
                            data-vantage-cell
                            style={{
                              width: "100%",
                              height: "100%",
                            }}
                          >
                            <Component {...(element.content as any)} />
                          </div>
                        </Rnd>
                      );
                    })}
                    {/* Border as overlay so it doesn't affect layout or cause grid jump */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        border: `2px solid ${isSelected ? "#3b82f6" : "#e5e7eb"}`,
                        borderRadius: "inherit",
                        pointerEvents: "none",
                        zIndex: 1,
                      }}
                    />
                  </div>
                  {/* Section height resize handle */}
                  <div
                    role="button"
                    tabIndex={0}
                    style={{
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
                    }}
                    onMouseDown={e => {
                      e.preventDefault();
                      setResizingSectionId(section.id);
                      setResizeStartY(e.clientY);
                      setResizeStartHeight(section.height);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating editor / preview toggle */}
      <button
        type="button"
        onClick={() => setShowPreview(p => !p)}
        style={{
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
        }}
        title={showPreview ? "Switch to editor" : "Switch to preview"}
      >
        {showPreview ? (
          <>
            <span>✏️</span>
            Edit
          </>
        ) : (
          <>
            <span>👁</span>
            Preview
          </>
        )}
      </button>

      {/* Sidebar overlay */}
      {showSidebar && (
        <div
          style={{
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
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <h2 style={{ fontWeight: "bold", margin: 0, color: "#1f2937" }}>
              Elements
            </h2>
            <button
              type="button"
              onClick={() => setShowSidebar(false)}
              style={{
                padding: "4px 8px",
                background: "transparent",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "18px",
                lineHeight: 1,
                color: "#1f2937",
              }}
              title="Close panel"
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={showGrid}
                onChange={e => setShowGrid(e.target.checked)}
              />
              <span style={{ fontSize: "14px", color: "#1f2937" }}>
                Show Grid
              </span>
            </label>
          </div>

          {/* Undo/Redo Controls */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <button
              onClick={undo}
              disabled={!canUndo}
              style={{
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
              }}
              title="Undo (Ctrl+Z)"
            >
              ↶ Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              style={{
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
              }}
              title="Redo (Ctrl+Shift+Z)"
            >
              ↷ Redo
            </button>
          </div>

          {/* Section controls */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Sections
            </div>
            <button
              type="button"
              onClick={() => addSection(false)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
                color: "#1f2937",
              }}
            >
              + Content-width section
            </button>
            <button
              type="button"
              onClick={() => addSection(true)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
                color: "#1f2937",
              }}
            >
              + Full-width section
            </button>
            {targetSectionId && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const sec = sections.find(s => s.id === targetSectionId);
                    if (sec) {
                      updateSectionFullWidth(targetSectionId, !sec.fullWidth);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 12px",
                    background: "#e5e7eb",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#374151",
                  }}
                >
                  Toggle full-width
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (sections.length > 1) {
                      deleteSection(targetSectionId);
                      setSelectedSectionId(
                        sections.find(s => s.id !== targetSectionId)?.id ?? null
                      );
                    }
                  }}
                  disabled={sections.length <= 1}
                  style={{
                    width: "100%",
                    padding: "6px 12px",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    border: "1px solid #fecaca",
                    borderRadius: "4px",
                    cursor: sections.length <= 1 ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    opacity: sections.length <= 1 ? 0.6 : 1,
                  }}
                >
                  Delete section
                </button>
              </>
            )}
          </div>

          {/* Add element buttons */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            {Object.keys(components).map(type => (
              <button
                key={type}
                onClick={() =>
                  addElement(type as T, undefined, targetSectionId ?? undefined)
                }
                style={{
                  width: "100%",
                  padding: "8px 16px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "#1d4ed8";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "#2563eb";
                }}
              >
                Add {type}
              </button>
            ))}
          </div>

          {/* Selected element controls */}
          {selectedIds.length > 0 && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                background: "#f3f4f6",
                borderRadius: "4px",
              }}
            >
              <h3
                style={{
                  fontWeight: "600",
                  marginBottom: "8px",
                  color: "#1f2937",
                }}
              >
                {selectedIds.length === 1
                  ? "Selected Element"
                  : `Selected Elements (${selectedIds.length})`}
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#1f2937",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={(pageData.elements ?? [])
                      .filter(e => selectedIds.includes(e.id))
                      .every(el => el.snapToGrid !== false)}
                    onChange={e =>
                      selectedIds.forEach(id =>
                        updateElement(id, {
                          snapToGrid: e.target.checked,
                        })
                      )
                    }
                  />
                  <span>Snap to grid</span>
                </label>
                <button
                  onClick={() =>
                    selectedIds.forEach(id => updateZIndex(id, "up"))
                  }
                  style={{
                    width: "100%",
                    padding: "4px 12px",
                    background: "#e5e7eb",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#1f2937",
                  }}
                >
                  Bring to Front
                </button>
                <button
                  onClick={() =>
                    selectedIds.forEach(id => updateZIndex(id, "down"))
                  }
                  style={{
                    width: "100%",
                    padding: "4px 12px",
                    background: "#e5e7eb",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#1f2937",
                  }}
                >
                  Send to Back
                </button>
                <button
                  onClick={() => {
                    selectedIds.forEach(id => deleteElement(id));
                    selectElements([]);
                  }}
                  style={{
                    width: "100%",
                    padding: "4px 12px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
