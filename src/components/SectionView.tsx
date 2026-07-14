import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { resolveItem, resolveItemData, resolveSection } from '../lib/breakpoint';
import {
  deltaToGrid,
  getCellHeight,
  getCellWidth,
  getGridContentOffset,
  getCellXStep,
  getFlexRowHeight,
  itemsAtPointer,
} from '../lib/grid';
import { closestRowForOffset, getRowStart } from '../lib/rowMetrics';
import { useBuilderActions } from '../hooks/useBuilderActions';
import { useBuilderContext } from '../context/BuilderContext';
import { useContainerWidth } from '../hooks/useContainerWidth';
import type { BreakpointWidths, GridItem, Section } from '../types';
import builder from '../styles/builder.module.css';
import { GridBlock } from './GridBlock';
import { SectionBackground } from './SectionBackground';

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
  const { id, items, background } = section;
  const {
    isInteracting,
    setInteracting,
    selection,
    setSelection,
    activeBreakpoint,
    breakpointPreviewWidths,
    renderSectionHeader,
    renderSectionFooter,
  } = useBuilderContext();
  const { moveItem } = useBuilderActions();

  const resolved = useMemo(
    () => resolveSection(section, activeBreakpoint),
    [section, activeBreakpoint],
  );
  const { columns, colGap, rowGap, paddingTop, paddingBottom } = resolved;

  const resolvedItems = useMemo(
    () =>
      items
        .map((item) => ({
          item: {
            ...item,
            data: resolveItemData(item, section, activeBreakpoint),
          },
          placement: resolveItem(item, section, activeBreakpoint),
        }))
        .filter(({ placement }) => !placement.hidden),
    [items, section, activeBreakpoint],
  );

  const { containerRef, containerWidth } = useContainerWidth<HTMLDivElement>();
  const [measuredRowSteps, setMeasuredRowSteps] = useState<number[]>([]);

  const cellWidth = getCellWidth(containerWidth, columns, colGap);
  const flexRowPx = getFlexRowHeight(containerWidth, columns, colGap);
  const cellHeight = getCellHeight(flexRowPx, rowGap);
  const cellXStep = getCellXStep(cellWidth, colGap);
  const contentOffsetX = getGridContentOffset(containerWidth, columns, colGap);
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
  }, [containerRef, rowGap, resolvedItems, columns, paddingTop, paddingBottom]);

  const hitTestItems: GridItem[] = useMemo(
    () =>
      resolvedItems.map(({ item, placement }) => ({
        ...item,
        x: placement.x,
        y: placement.y,
        w: placement.w,
        h: placement.h,
      })),
    [resolvedItems],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragStart = useCallback(() => {
    setInteracting(true);
  }, [setInteracting]);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setInteracting(false);
      const { active, delta } = event;
      const entry = resolvedItems.find(({ item }) => item.id === active.id);
      if (!entry || !delta) return;
      const { dx, dy } = deltaToGrid(delta.x, delta.y, cellXStep, cellHeight);
      const nextY = rowSteps
        ? closestRowForOffset(
            getRowStart(entry.placement.y, rowSteps, cellHeight) + delta.y,
            rowSteps,
            cellHeight,
          )
        : entry.placement.y + dy;
      if (dx === 0 && nextY === entry.placement.y) return;
      moveItem(id, entry.item.id, entry.placement.x + dx, nextY, activeBreakpoint);
    },
    [
      resolvedItems,
      cellXStep,
      cellHeight,
      rowSteps,
      moveItem,
      setInteracting,
      id,
      activeBreakpoint,
    ],
  );

  const onDragCancel = useCallback(() => {
    setInteracting(false);
  }, [setInteracting]);

  const onGridPointerDownCapture = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const grid = containerRef.current;
      if (!grid) return;

      if (e.altKey) {
        const rect = grid.getBoundingClientRect();
        const contentOffsetY = parseFloat(getComputedStyle(grid).paddingTop) || 0;
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
      selection?.itemId,
      setSelection,
      id,
    ],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selection?.sectionId !== id) return;
      setSelection(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selection?.sectionId, id, setSelection]);

  const canvasMaxWidth = editorCanvasMaxWidth(activeBreakpoint, breakpointPreviewWidths);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <section className={builder.section}>
        {renderSectionHeader ? renderSectionHeader({ section, activeBreakpoint }) : null}
        <div className={builder['canvas-frame']} style={{ maxWidth: canvasMaxWidth }}>
          <div className={builder['canvas-wrap']}>
            <div
              ref={containerRef}
              className={`${builder['builder-grid']} ${isInteracting ? builder['builder-grid--active'] : ''}`}
              data-vantage-section-frame={id}
              tabIndex={-1}
              onPointerDownCapture={onGridPointerDownCapture}
              style={
                {
                  '--cols': columns,
                  '--col-gap-px': `${colGap}px`,
                  '--row-gap-px': `${rowGap}px`,
                  '--section-pad-top-px': `${paddingTop}px`,
                  '--section-pad-bottom-px': `${paddingBottom}px`,
                } as React.CSSProperties
              }
            >
              <SectionBackground background={background} className={builder['section-bg']} />
              {rowSteps ? (
                <div className={builder['grid-overlay']} aria-hidden="true">
                  {rowSteps.map((_, index) => (
                    <span
                      key={index}
                      className={builder['grid-overlay__row-line']}
                      style={{ top: `${getRowStart(index, rowSteps, cellHeight)}px` }}
                    />
                  ))}
                </div>
              ) : null}
              {resolvedItems.map(({ item, placement }) => (
                <GridBlock
                  key={item.id}
                  sectionId={id}
                  item={item}
                  placement={placement}
                  cellWidth={cellWidth}
                  cellHeight={cellHeight}
                  colGap={colGap}
                  columns={columns}
                  breakpoint={activeBreakpoint}
                  rowSteps={rowSteps}
                />
              ))}
            </div>
          </div>
        </div>
        {renderSectionFooter ? renderSectionFooter({ section, activeBreakpoint }) : null}
      </section>
    </DndContext>
  );
}
