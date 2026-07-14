import { useDraggable } from '@dnd-kit/core';
import { createElement, Fragment, useCallback, useEffect, useRef } from 'react';
import { useBuilderContext } from '../context/BuilderContext';
import { useBuilderActions } from '../hooks/useBuilderActions';
import { getCellXStep, pxToCell } from '../lib/grid';
import { closestRowForOffset, getRowStart } from '../lib/rowMetrics';
import { resolveRenderer } from '../hooks/useItemRenderer';
import type { ResolvedItemLayout } from '../lib/breakpoint';
import type { Breakpoint, GridItem } from '../types';
import chrome from '../styles/grid-block.module.css';

type GridBlockProps = {
  sectionId: string;
  item: GridItem;
  placement: ResolvedItemLayout;
  cellWidth: number;
  cellHeight: number;
  colGap: number;
  columns: number;
  breakpoint: Breakpoint;
  rowSteps: number[] | null;
};

export function GridBlock({
  sectionId,
  item,
  placement,
  cellWidth,
  cellHeight,
  colGap,
  columns,
  breakpoint,
  rowSteps,
}: GridBlockProps) {
  const { components, setInteracting, onItemContextMenu, selection, setSelection, renderEditButton } =
    useBuilderContext();
  const { resizeItem, removeItem } = useBuilderActions();
  const resizeStart = useRef({ w: placement.w, h: placement.h, x: 0, y: 0 });
  const cellXStep = getCellXStep(cellWidth, colGap);
  const cellStepRef = useRef({ x: cellXStep, y: cellHeight });

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { type: 'block', item, sectionId },
  });

  useEffect(() => {
    cellStepRef.current = { x: cellXStep, y: cellHeight };
  }, [cellXStep, cellHeight]);

  const snappedX = transform ? pxToCell(transform.x, cellXStep) * cellXStep : 0;
  const snappedY =
    transform && rowSteps
      ? getRowStart(
          closestRowForOffset(
            getRowStart(placement.y, rowSteps, cellHeight) + transform.y,
            rowSteps,
            cellHeight,
          ),
          rowSteps,
          cellHeight,
        ) - getRowStart(placement.y, rowSteps, cellHeight)
      : transform
        ? pxToCell(transform.y, cellHeight) * cellHeight
        : 0;

  const gridPlacement: React.CSSProperties = {
    gridColumn: `${placement.x + 2} / span ${placement.w}`,
    gridRow: `${placement.y + 1} / span ${placement.h}`,
  };

  const dragTransform = transform ? `translate3d(${snappedX}px, ${snappedY}px, 0)` : undefined;

  const bodyStyle: React.CSSProperties = {
    ...gridPlacement,
    transform: dragTransform,
  };

  const chromeStyle: React.CSSProperties = {
    ...gridPlacement,
    transform: dragTransform,
  };

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      resizeStart.current = { w: placement.w, h: placement.h, x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setInteracting(true);

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - resizeStart.current.x;
        const dy = ev.clientY - resizeStart.current.y;
        const dw = pxToCell(dx, cellStepRef.current.x);
        const dh = rowSteps
          ? closestRowForOffset(
              getRowStart(placement.y + resizeStart.current.h, rowSteps, cellStepRef.current.y) +
                dy,
              rowSteps,
              cellStepRef.current.y,
            ) -
            placement.y -
            resizeStart.current.h
          : pxToCell(dy, cellStepRef.current.y);
        const newW = Math.max(1, Math.min(resizeStart.current.w + dw, columns - placement.x));
        const newH = Math.max(1, resizeStart.current.h + dh);
        resizeItem(sectionId, item.id, newW, newH, breakpoint);
      };

      const onUp = () => {
        setInteracting(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [
      sectionId,
      item.id,
      placement.x,
      placement.y,
      placement.w,
      placement.h,
      columns,
      breakpoint,
      rowSteps,
      resizeItem,
      setInteracting,
    ],
  );

  const Renderer = resolveRenderer(components, item);
  const descriptor = components[item.kind];
  const wrapperClass = descriptor?.editWrapperClass ?? '';

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!onItemContextMenu) return;
      e.preventDefault();
      onItemContextMenu(e, { sectionId, item });
    },
    [onItemContextMenu, sectionId, item],
  );

  const isSelected = selection?.sectionId === sectionId && selection?.itemId === item.id;

  const onPointerDownCapture = useCallback(() => {
    setSelection({ sectionId, itemId: item.id });
  }, [setSelection, sectionId, item.id]);

  return (
    <Fragment>
      <div
        ref={setNodeRef}
        className={[
          chrome['grid-block__body'],
          wrapperClass,
          isDragging ? chrome['grid-block__body--dragging'] : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={bodyStyle}
        onPointerDownCapture={onPointerDownCapture}
        onContextMenu={onItemContextMenu ? onContextMenu : undefined}
        {...attributes}
      >
        {createElement(Renderer, { item, mode: 'edit', interactive: true })}
      </div>
      <div
        className={[
          chrome['grid-block__chrome'],
          isSelected || isDragging ? chrome['grid-block__chrome--active'] : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={chromeStyle}
        aria-hidden={!isSelected && !isDragging}
      >
        <button
          type="button"
          className={chrome['grid-block__handle']}
          aria-label={`Drag ${item.label ?? 'block'}`}
          title={item.label ?? 'Drag'}
          {...listeners}
        >
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
            <circle cx="5" cy="3" r="1.2" fill="currentColor" />
            <circle cx="5" cy="8" r="1.2" fill="currentColor" />
            <circle cx="5" cy="13" r="1.2" fill="currentColor" />
            <circle cx="11" cy="3" r="1.2" fill="currentColor" />
            <circle cx="11" cy="8" r="1.2" fill="currentColor" />
            <circle cx="11" cy="13" r="1.2" fill="currentColor" />
          </svg>
        </button>
        {renderEditButton ? (
          <div
            className={chrome['grid-block__edit']}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {renderEditButton({ sectionId, item, isSelected })}
          </div>
        ) : null}
        <button
          type="button"
          className={chrome['grid-block__delete']}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            removeItem(sectionId, item.id);
          }}
          aria-label="Delete block"
        >
          ×
        </button>
        <div
          className={chrome['grid-block__resize']}
          onPointerDown={onResizePointerDown}
          aria-label="Resize block"
        />
      </div>
    </Fragment>
  );
}
