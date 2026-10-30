import type { DragEndEvent } from '@dnd-kit/core';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { resolveItem, resolveSection, sectionContentRows, sectionRows } from '../lib/breakpoint';
import { resolveItemVerticalAlign } from '../lib/contentAlign';
import { resolveEffectiveItemData } from '../lib/entities';
import { computeAlignment, type GuideRect } from '../lib/guides';
import {
  CELL_MAX_PX,
  ROW_MAX_PX,
  deltaToGrid,
  getCellHeight,
  getCellWidth,
  getGridContentOffset,
  getCellXStep,
  getFlexRowHeight,
  itemsAtPointer,
} from '../lib/grid';
import { gridCellAt } from '../lib/dropTargeting';
import { sortByReadingOrder } from '../lib/readingOrder';
import { closestRowForOffset, getRowStart } from '../lib/rowMetrics';
import { useBuilderActions } from '../hooks/useBuilderActions';
import { useBuilderContext } from '../context/BuilderContext';
import { useCanvasDnd, type SectionDropHandle } from '../context/CanvasDndContext';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { useResolveItemData } from '../hooks/useItemData';
import { parsePxToken } from '../theme/tokens';
import { useVantageTokens } from '../theme/useVantageTokens';
import { MIN_SECTION_ROWS, type BreakpointWidths, type GridItem, type Section } from '../types';
import builder from '../styles/builder.module.css';
import { AlignmentGuides } from './AlignmentGuides';
import { GridBlock } from './GridBlock';
import { SectionBackground } from './SectionBackground';
import { SectionActions } from './SectionActions';
import { SectionResizeHandle } from './SectionResizeHandle';

type SectionViewProps = {
  section: Section;
};

function parseGridRows(value: string): number[] {
  return Array.from(value.matchAll(/([\d.]+)px/g), (match) => Number(match[1])).filter((v) =>
    Number.isFinite(v),
  );
}

function getMeasuredItemBounds(
  item: GridItem,
  rowSteps: number[],
  fallbackStep: number,
  rowGap: number,
) {
  const top = getRowStart(item.y, rowSteps, fallbackStep);
  const bottom = getRowStart(item.y + item.h, rowSteps, fallbackStep);
  return { top, height: Math.max(0, bottom - top - rowGap) };
}

/** Free vertical space above the first row of a centered or end-aligned fill-screen grid. */
function alignOffsetFor(
  grid: HTMLElement,
  styles: CSSStyleDeclaration,
  tracks: number[],
  rowGap: number,
  align: 'center' | 'end',
): number {
  const padding = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
  const content =
    tracks.reduce((sum, track) => sum + track, 0) + Math.max(0, tracks.length - 1) * rowGap;
  const free = Math.max(0, grid.clientHeight - padding - content);
  return align === 'center' ? free / 2 : free;
}

const DROP_GHOST_ID = '\u0000drop-ghost';

function editorCanvasMaxWidth(
  breakpoint: ReturnType<typeof useBuilderContext>['activeBreakpoint'],
  previewWidths: BreakpointWidths,
) {
  if (breakpoint === 'desktop') return '100%';
  if (breakpoint === 'tablet' && previewWidths.tablet !== undefined) {
    return `${previewWidths.tablet}px`;
  }
  if (previewWidths.mobile !== undefined) return `${previewWidths.mobile}px`;
  return '100%';
}

export function SectionView({ section }: SectionViewProps) {
  const { id, items, background, fillScreen = false, verticalAlign = 'start' } = section;
  const {
    layout,
    isInteracting,
    selection,
    setSelection,
    activeBreakpoint,
    breakpointPreviewWidths,
    renderSectionHeader,
    sectionHeaderPlacement,
    renderSectionFooter,
    sectionResizeLabel,
    showSectionActions,
  } = useBuilderContext();
  const { registerSection, dropTarget, dragSourceSectionId } = useCanvasDnd();
  const { moveItem, resizeSection } = useBuilderActions();
  const resolveEntity = useResolveItemData();
  const enabledBreakpoints = layout.breakpoints;

  const resolved = useMemo(
    () => resolveSection(section, activeBreakpoint, enabledBreakpoints),
    [section, activeBreakpoint, enabledBreakpoints],
  );
  const { columns, colGap, rowGap, paddingTop, paddingBottom } = resolved;

  // DOM (and tab) order is reading order; `stackIndex` keeps the stacking order via z-index.
  const resolvedItems = useMemo(
    () =>
      sortByReadingOrder(
        items.map((item) => ({
          item: {
            ...item,
            data: resolveEffectiveItemData(
              item,
              section,
              activeBreakpoint,
              enabledBreakpoints,
              resolveEntity?.(item),
            ),
          },
          fullBleed: item.fullBleed,
          placement: resolveItem(item, section, activeBreakpoint, enabledBreakpoints),
          verticalAlign: resolveItemVerticalAlign(
            item,
            section,
            activeBreakpoint,
            enabledBreakpoints,
          ),
        })),
      ).filter(({ placement }) => !placement.hidden),
    [items, section, activeBreakpoint, enabledBreakpoints, resolveEntity],
  );

  const rows = useMemo(
    () => sectionRows(section, activeBreakpoint, enabledBreakpoints),
    [section, activeBreakpoint, enabledBreakpoints],
  );
  const minRows = useMemo(
    () =>
      Math.max(MIN_SECTION_ROWS, sectionContentRows(section, activeBreakpoint, enabledBreakpoints)),
    [section, activeBreakpoint, enabledBreakpoints],
  );
  const [draftRows, setDraftRows] = useState<number | null>(null);
  const displayedRows = draftRows ?? rows;
  const commitRows = useCallback(
    (next: number) => resizeSection(id, next, activeBreakpoint),
    [resizeSection, id, activeBreakpoint],
  );

  const { containerRef, containerWidth } = useContainerWidth<HTMLDivElement>();
  const [measuredRowSteps, setMeasuredRowSteps] = useState<number[]>([]);
  // Space a fill-screen section leaves above its first row (center/end alignment), in px.
  const [alignOffset, setAlignOffset] = useState(0);
  const tokens = useVantageTokens();
  const cellMaxPx = parsePxToken(tokens['--vantage-cell-max-px'], CELL_MAX_PX);
  const rowMaxPx = parsePxToken(tokens['--vantage-row-max-px'], ROW_MAX_PX);

  const cellWidth = getCellWidth(containerWidth, columns, colGap, cellMaxPx);
  const flexRowPx = getFlexRowHeight(containerWidth, columns, colGap, rowMaxPx, cellMaxPx);
  const cellHeight = getCellHeight(flexRowPx, rowGap);
  const cellXStep = getCellXStep(cellWidth, colGap);
  const contentOffsetX = getGridContentOffset(containerWidth, columns, colGap, cellMaxPx);
  const rowSteps = measuredRowSteps.length > 0 ? measuredRowSteps : null;

  useLayoutEffect(() => {
    const grid = containerRef.current;
    if (!grid) return;

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const styles = getComputedStyle(grid);
        const tracks = parseGridRows(styles.gridTemplateRows);
        setMeasuredRowSteps(tracks.map((track) => track + rowGap));
        setAlignOffset(
          fillScreen && verticalAlign !== 'start'
            ? alignOffsetFor(grid, styles, tracks, rowGap, verticalAlign)
            : 0,
        );
      });
    };

    const observer = new ResizeObserver(update);
    observer.observe(grid);
    for (const child of Array.from(grid.children)) {
      observer.observe(child);
    }
    update();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [
    containerRef,
    rowGap,
    resolvedItems,
    columns,
    paddingTop,
    paddingBottom,
    displayedRows,
    fillScreen,
    verticalAlign,
  ]);

  // Stacking order (bottom to top), which the Alt+click cycle relies on.
  const hitTestItems: GridItem[] = useMemo(
    () =>
      [...resolvedItems]
        .sort((a, b) => a.stackIndex - b.stackIndex)
        .map(({ item, placement }) => ({
          ...item,
          x: item.fullBleed ? 0 : placement.x,
          y: placement.y,
          w: item.fullBleed ? columns : placement.w,
          h: placement.h,
        })),
    [resolvedItems, columns],
  );

  // Block of this section being dragged or resized, at the cells it would land on.
  const [draft, setDraft] = useState<GuideRect | null>(null);
  const onDraftRect = useCallback((itemId: string, rect: GuideRect | null) => {
    setDraft((prev) => (rect ? rect : prev?.id === itemId ? null : prev));
  }, []);

  const guideRects = useMemo(
    () =>
      new Map<string, GuideRect>(
        resolvedItems.map(({ item, placement }) => [
          item.id,
          { id: item.id, ...placement, fullBleed: item.fullBleed },
        ]),
      ),
    [resolvedItems],
  );

  const dropWithin = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const dragged = (active.data.current as { item?: GridItem } | undefined)?.item;
      const entry = resolvedItems.find(({ item }) => item.id === dragged?.id);
      if (!entry || !delta) return;
      const { dx, dy } = deltaToGrid(delta.x, delta.y, cellXStep, cellHeight);
      const nextY = rowSteps
        ? closestRowForOffset(
            getRowStart(entry.placement.y, rowSteps, cellHeight) + delta.y,
            rowSteps,
            cellHeight,
          )
        : entry.placement.y + dy;
      // The section keeps its height: a block dropped past the bottom stops at the last row.
      const clampedY = Math.max(0, Math.min(nextY, rows - entry.placement.h));
      if (dx === 0 && clampedY === entry.placement.y) return;
      moveItem(id, entry.item.id, entry.placement.x + dx, clampedY, activeBreakpoint);
    },
    [resolvedItems, cellXStep, cellHeight, rowSteps, rows, moveItem, id, activeBreakpoint],
  );

  const cellAt = useCallback<SectionDropHandle['cellAt']>(
    (clientLeft, clientTop, w, h) =>
      gridCellAt(
        {
          // Read live: the grid moves while the page scrolls during a drag.
          rect: containerRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 },
          contentOffsetX,
          contentOffsetY: paddingTop + alignOffset,
          columns,
          rows,
          cellXStep,
          cellHeight,
          rowSteps,
        },
        clientLeft,
        clientTop,
        w,
        h,
      ),
    [
      containerRef,
      columns,
      rows,
      contentOffsetX,
      paddingTop,
      alignOffset,
      cellXStep,
      rowSteps,
      cellHeight,
    ],
  );

  const blockSize = useCallback<SectionDropHandle['blockSize']>(
    (w, h) => ({
      width: Math.min(w, columns) * cellWidth + Math.max(0, Math.min(w, columns) - 1) * colGap,
      height: h * cellHeight - rowGap,
    }),
    [columns, cellWidth, colGap, cellHeight, rowGap],
  );

  // Handle identity stays stable; the canvas reads the latest geometry through the ref.
  const handleRef = useRef({ cellAt, blockSize, dropWithin });
  useLayoutEffect(() => {
    handleRef.current = { cellAt, blockSize, dropWithin };
  });
  useEffect(
    () =>
      registerSection(id, {
        getElement: () => containerRef.current,
        cellAt: (...args) => handleRef.current.cellAt(...args),
        blockSize: (...args) => handleRef.current.blockSize(...args),
        dropWithin: (event) => handleRef.current.dropWithin(event),
      }),
    [registerSection, id, containerRef],
  );

  const onGridPointerDownCapture = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const grid = containerRef.current;
      if (!grid) return;

      if (e.altKey) {
        const rect = grid.getBoundingClientRect();
        const contentOffsetY = (parseFloat(getComputedStyle(grid).paddingTop) || 0) + alignOffset;
        const stack = rowSteps
          ? hitTestItems
              .filter((item) => {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top - contentOffsetY;
                const itemLeft = contentOffsetX + item.x * cellXStep;
                const itemWidth = item.w * cellWidth + Math.max(0, item.w - 1) * colGap;
                const bounds = getMeasuredItemBounds(item, rowSteps, cellHeight, rowGap);
                return (
                  x >= itemLeft &&
                  x < itemLeft + itemWidth &&
                  y >= bounds.top &&
                  y < bounds.top + bounds.height
                );
              })
              .reverse()
          : itemsAtPointer(
              e.clientX,
              e.clientY,
              rect,
              hitTestItems,
              cellWidth,
              cellXStep,
              colGap,
              flexRowPx,
              rowGap,
              contentOffsetX,
              contentOffsetY,
            );
        if (stack.length === 0) return;

        const currentIdx =
          selection?.sectionId === id ? stack.findIndex((i) => i.id === selection.itemId) : -1;
        const nextItem = currentIdx < 0 ? stack[0] : stack[(currentIdx + 1) % stack.length];

        setSelection({ sectionId: id, itemId: nextItem.id });
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.target === grid) {
        setSelection(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      hitTestItems,
      cellWidth,
      cellXStep,
      colGap,
      flexRowPx,
      rowGap,
      contentOffsetX,
      rowSteps,
      alignOffset,
      selection?.itemId,
      setSelection,
      id,
    ],
  );

  const canvasMaxWidth = editorCanvasMaxWidth(activeBreakpoint, breakpointPreviewWidths);

  const ghost = dropTarget?.sectionId === id ? dropTarget : null;
  // A block arriving from elsewhere (other section, palette) lines up via its drop ghost.
  const moving = useMemo<GuideRect | null>(
    () => (ghost ? { id: DROP_GHOST_ID, x: ghost.x, y: ghost.y, w: ghost.w, h: ghost.h } : draft),
    [ghost, draft],
  );
  const alignment = useMemo(
    () =>
      moving
        ? computeAlignment(moving, [...guideRects.values()], { columns, rows: displayedRows })
        : null,
    [moving, guideRects, columns, displayedRows],
  );
  const isDropTarget = ghost !== null;
  const hasSelection = selection?.sectionId === id;
  const chromeCtx = { section, activeBreakpoint, hasSelection, isDropTarget };
  const header = renderSectionHeader ? renderSectionHeader(chromeCtx) : null;
  const sectionClass = [
    builder.section,
    draftRows !== null ? builder['section--resizing'] : '',
    dragSourceSectionId === id ? builder['section--drag-source'] : '',
    isDropTarget ? builder['section--drop-target'] : '',
  ]
    .filter(Boolean)
    .join(' ');
  const gridClass = [
    builder['builder-grid'],
    fillScreen ? builder['builder-grid--fill'] : '',
    isInteracting || isDropTarget ? builder['builder-grid--active'] : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={sectionClass}
      data-vantage-section={id}
      data-vantage-section-selected={hasSelection ? '' : undefined}
      data-vantage-drop-target={isDropTarget ? '' : undefined}
    >
      {sectionHeaderPlacement === 'section' ? header : null}
      <div className={builder['canvas-frame']} style={{ maxWidth: canvasMaxWidth }}>
        {/* Outside canvas-wrap (the grid's container-query box) and the grid, so grid math ignores it. */}
        {sectionHeaderPlacement === 'canvas' ? header : null}
        <div className={builder['canvas-wrap']}>
          <div
            ref={containerRef}
            className={gridClass}
            data-vantage-section-frame={id}
            tabIndex={-1}
            onPointerDownCapture={onGridPointerDownCapture}
            style={
              {
                '--cols': columns,
                '--col-gap-px': `${colGap}px`,
                '--row-gap-px': `${rowGap}px`,
                '--row-ratio': cellMaxPx > 0 ? rowMaxPx / cellMaxPx : 1,
                '--section-pad-top-px': `${paddingTop}px`,
                '--section-pad-bottom-px': `${paddingBottom}px`,
                // Blocks stack at z-index 1..n (see GridBlock); overlay and chrome go above.
                '--vantage-z-top': items.length + 1,
                gridTemplateRows: `repeat(${displayedRows}, minmax(var(--row-px), auto))`,
                alignContent: fillScreen ? verticalAlign : undefined,
              } as React.CSSProperties
            }
          >
            <SectionBackground background={background} className={builder['section-bg']} />
            {rowSteps ? (
              <div
                className={builder['grid-overlay']}
                aria-hidden="true"
                style={
                  {
                    alignContent: fillScreen ? verticalAlign : undefined,
                    gridTemplateColumns: `repeat(${columns}, var(--cell-px))`,
                    gridTemplateRows: rowSteps
                      .map((step) => `${Math.max(0, step - rowGap)}px`)
                      .join(' '),
                  } as React.CSSProperties
                }
              >
                {rowSteps.flatMap((_, row) =>
                  Array.from({ length: columns }, (_, col) => (
                    <span key={`${row}-${col}`} className={builder['grid-overlay__cell']} />
                  )),
                )}
              </div>
            ) : null}
            {resolvedItems.map(({ item, placement, stackIndex, verticalAlign }) => (
              <GridBlock
                key={item.id}
                zIndex={stackIndex + 1}
                sectionId={id}
                item={item}
                placement={placement}
                cellWidth={cellWidth}
                cellHeight={cellHeight}
                colGap={colGap}
                columns={columns}
                breakpoint={activeBreakpoint}
                rowSteps={rowSteps}
                rows={displayedRows}
                verticalAlign={verticalAlign}
                onDraftRect={onDraftRect}
              />
            ))}
            {alignment && moving ? (
              <AlignmentGuides
                result={alignment}
                geometry={{
                  contentOffsetX,
                  contentOffsetY: paddingTop + alignOffset,
                  cellXStep,
                  colGap,
                  rowSteps,
                  cellHeight,
                  rowGap,
                }}
              />
            ) : null}
            {ghost ? (
              <div
                className={builder['drop-ghost']}
                aria-hidden="true"
                style={{
                  gridColumn: `${ghost.x + 2} / span ${ghost.w}`,
                  gridRow: `${ghost.y + 1} / span ${ghost.h}`,
                }}
              />
            ) : null}
            <SectionResizeHandle
              label={
                sectionResizeLabel
                  ? sectionResizeLabel(section)
                  : `Resize ${section.label ?? 'section'} height`
              }
              rows={rows}
              minRows={minRows}
              rowSteps={rowSteps}
              cellHeight={cellHeight}
              onDraft={setDraftRows}
              onCommit={commitRows}
            />
          </div>
        </div>
      </div>
      {showSectionActions ? <SectionActions section={section} /> : null}
      {renderSectionFooter ? renderSectionFooter(chromeCtx) : null}
    </section>
  );
}
