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
  resolveMinSize,
} from '../lib/grid';
import { overlappingItems } from '../lib/overlap';
import { trackPointerDrag } from '../lib/pointerDrag';
import { marqueeHits, mergeSelection, rectFromPoints, sameSelection } from '../lib/selection';
import { groupBounds, groupMoveRange } from '../mutations/group';
import type { SelectionRef } from '../context/BuilderContext';
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
import { GroupToolbar } from './GroupToolbar';
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
    selectedItems,
    setSelectedItems,
    setInteracting,
    announce,
    announcements,
    showGroupToolbar,
    activeBreakpoint,
    breakpointPreviewWidths,
    renderSectionHeader,
    sectionHeaderPlacement,
    renderSectionFooter,
    sectionResizeLabel,
    showSectionActions,
    getItemMinSize,
    showOverlapWarnings,
  } = useBuilderContext();
  const { registerSection, dropTarget, dragSourceSectionId } = useCanvasDnd();
  const { moveItem, moveItems, resizeSection } = useBuilderActions();
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

  // Unintended overlaps at this breakpoint, by block id.
  const overlaps = useMemo(
    () =>
      showOverlapWarnings
        ? overlappingItems(section, activeBreakpoint, enabledBreakpoints)
        : new Map<string, string[]>(),
    [showOverlapWarnings, section, activeBreakpoint, enabledBreakpoints],
  );

  const rows = useMemo(
    () => sectionRows(section, activeBreakpoint, enabledBreakpoints),
    [section, activeBreakpoint, enabledBreakpoints],
  );
  // Multi-selection in this section (two or more blocks): moves as a unit.
  const groupIds = useMemo(
    () =>
      selectedItems.length > 1 && selectedItems[0]!.sectionId === id
        ? selectedItems.map((ref) => ref.itemId)
        : null,
    [selectedItems, id],
  );
  const groupRange = useMemo(
    () =>
      groupIds ? groupMoveRange(section, groupIds, activeBreakpoint, enabledBreakpoints) : null,
    [groupIds, section, activeBreakpoint, enabledBreakpoints],
  );
  const groupBox = useMemo(
    () => (groupIds ? groupBounds(section, groupIds, activeBreakpoint, enabledBreakpoints) : null),
    [groupIds, section, activeBreakpoint, enabledBreakpoints],
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
  const [draft, setDraft] = useState<(GuideRect & { mode: 'move' | 'resize' }) | null>(null);
  const onDraftRect = useCallback(
    (itemId: string, rect: GuideRect | null, mode: 'move' | 'resize') => {
      setDraft((prev) => (rect ? { ...rect, mode } : prev?.id === itemId ? null : prev));
    },
    [],
  );

  // Cells the rest of the group follows the dragged block by.
  const groupDrag = useMemo(() => {
    if (!draft || draft.mode !== 'move' || !groupIds?.includes(draft.id)) return null;
    const entry = resolvedItems.find(({ item }) => item.id === draft.id);
    if (!entry) return null;
    return {
      draggedId: draft.id,
      offset: { dx: draft.x - entry.placement.x, dy: draft.y - entry.placement.y },
    };
  }, [draft, groupIds, resolvedItems]);

  const guideRects = useMemo(
    () =>
      new Map<string, GuideRect>(
        resolvedItems
          // The group moves together, so its blocks are no guide targets for each other.
          .filter(({ item }) => !groupDrag || !groupIds?.includes(item.id))
          .map(({ item, placement }) => [
            item.id,
            { id: item.id, ...placement, fullBleed: item.fullBleed },
          ]),
      ),
    [resolvedItems, groupDrag, groupIds],
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
      if (groupIds?.includes(entry.item.id)) {
        // The whole group moves by the same cells, clamped as a unit (one change, one undo step).
        moveItems(id, groupIds, dx, nextY - entry.placement.y, activeBreakpoint);
        return;
      }
      // The section keeps its height: a block dropped past the bottom stops at the last row.
      const clampedY = Math.max(0, Math.min(nextY, rows - entry.placement.h));
      if (dx === 0 && clampedY === entry.placement.y) return;
      moveItem(id, entry.item.id, entry.placement.x + dx, clampedY, activeBreakpoint);
    },
    [
      resolvedItems,
      cellXStep,
      cellHeight,
      rowSteps,
      rows,
      moveItem,
      moveItems,
      groupIds,
      id,
      activeBreakpoint,
    ],
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

  // Marquee in client coordinates relative to the grid, while dragging on empty grid space.
  const [marquee, setMarquee] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const selectionRef = useRef(selectedItems);
  useLayoutEffect(() => {
    selectionRef.current = selectedItems;
  });

  const startMarquee = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, grid: HTMLDivElement) => {
      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      const before = selectionRef.current;
      const base = additive && before[0]?.sectionId === id ? before : [];
      if (!additive) setSelection(null);
      const origin = { x: e.clientX, y: e.clientY };
      let started = false;
      let current: SelectionRef[] = base;

      trackPointerDrag(e, {
        onMove: (ev) => {
          if (!started && Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < 4) return;
          if (!started) {
            started = true;
            setInteracting(true);
            window.getSelection()?.removeAllRanges();
          }
          const gridRect = grid.getBoundingClientRect();
          // The marquee stays inside this section's grid.
          const clampX = (x: number) => Math.max(gridRect.left, Math.min(x, gridRect.right));
          const clampY = (y: number) => Math.max(gridRect.top, Math.min(y, gridRect.bottom));
          const box = rectFromPoints(
            clampX(origin.x),
            clampY(origin.y),
            clampX(ev.clientX),
            clampY(ev.clientY),
          );
          setMarquee({
            left: box.left - gridRect.left,
            top: box.top - gridRect.top,
            width: box.right - box.left,
            height: box.bottom - box.top,
          });
          const prefix = `${id}:`;
          const blocks = Array.from(
            grid.querySelectorAll<HTMLElement>('[data-vantage-block][tabindex]'),
          ).flatMap((el) => {
            const key = el.getAttribute('data-vantage-block') ?? '';
            if (!key.startsWith(prefix)) return [];
            const r = el.getBoundingClientRect();
            const itemId = key.slice(prefix.length);
            return [{ id: itemId, left: r.left, top: r.top, right: r.right, bottom: r.bottom }];
          });
          const hits = marqueeHits(blocks, box).map((itemId) => ({ sectionId: id, itemId }));
          const next = mergeSelection(base, hits);
          if (!sameSelection(next, current)) {
            current = next;
            setSelectedItems(next);
          }
        },
        onEnd: (cancelled) => {
          setMarquee(null);
          if (!started) return;
          setInteracting(false);
          if (cancelled) {
            setSelectedItems(before);
            return;
          }
          announce(announcements.selectionChanged({ count: current.length, items: [] }));
          // Keyboard moves act from a focused selected block.
          const primary = current.at(-1);
          if (primary) {
            const key = `${primary.sectionId}:${primary.itemId}`;
            Array.from(grid.querySelectorAll<HTMLElement>('[data-vantage-block][tabindex]'))
              .find((el) => el.getAttribute('data-vantage-block') === key)
              ?.focus({ preventScroll: true });
          }
        },
      });
    },
    [id, setSelection, setSelectedItems, setInteracting, announce, announcements],
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

      if (e.target === grid && e.button === 0) {
        startMarquee(e, grid);
      } else if (e.target === grid) {
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
      startMarquee,
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
    marquee ? builder['builder-grid--marquee'] : '',
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
                minSize={resolveMinSize(getItemMinSize?.(item, activeBreakpoint), {
                  columns,
                  cellHeight,
                  rowGap,
                })}
                overlapsWith={overlaps.get(item.id)}
                moveRange={groupIds?.includes(item.id) ? (groupRange ?? undefined) : undefined}
                groupOffset={
                  groupDrag && groupDrag.draggedId !== item.id && groupIds?.includes(item.id)
                    ? groupDrag.offset
                    : undefined
                }
              />
            ))}
            {groupIds && groupBox && showGroupToolbar && !isInteracting ? (
              <GroupToolbar sectionId={id} itemIds={groupIds} bounds={groupBox} />
            ) : null}
            {marquee ? (
              <div
                className={builder.marquee}
                aria-hidden="true"
                data-vantage-marquee=""
                style={{
                  left: marquee.left,
                  top: marquee.top,
                  width: marquee.width,
                  height: marquee.height,
                }}
              />
            ) : null}
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
