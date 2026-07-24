import { useDraggable } from '@dnd-kit/core';
import { createElement, Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useBuilderContext } from '../context/BuilderContext';
import { useBuilderActions } from '../hooks/useBuilderActions';
import {
  getCellXStep,
  pxToCell,
  resizeByHandle,
  resizeEdgeAxes,
  type PlacementRect,
  type ResizeEdge,
} from '../lib/grid';
import { closestRowForOffset, getRowStart } from '../lib/rowMetrics';
import { resolveRenderer } from '../lib/registry';
import type { ResolvedItemLayout } from '../lib/breakpoint';
import type { Breakpoint, GridItem } from '../types';
import chrome from '../styles/grid-block.module.css';

const RESIZE_EDGES: ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const RESIZE_EDGE_CLASS: Record<ResizeEdge, string> = {
  n: 'grid-block__resize--n',
  s: 'grid-block__resize--s',
  e: 'grid-block__resize--e',
  w: 'grid-block__resize--w',
  ne: 'grid-block__resize--ne',
  nw: 'grid-block__resize--nw',
  se: 'grid-block__resize--se',
  sw: 'grid-block__resize--sw',
};

const RESIZE_EDGE_LABEL: Record<ResizeEdge, string> = {
  n: 'Resize north',
  s: 'Resize south',
  e: 'Resize east',
  w: 'Resize west',
  ne: 'Resize northeast',
  nw: 'Resize northwest',
  se: 'Resize southeast',
  sw: 'Resize southwest',
};

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

type ResizeStart = PlacementRect & { pointerX: number; pointerY: number; edge: ResizeEdge };

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
  const {
    components,
    setInteracting,
    onItemContextMenu,
    selection,
    setSelection,
    renderEditButton,
    renderDragHandle,
    renderDeleteButton,
  } = useBuilderContext();
  const { resizeItem, removeItem } = useBuilderActions();
  const resizeStart = useRef<ResizeStart | null>(null);
  const pendingResize = useRef<PlacementRect | null>(null);
  const [resizeDraft, setResizeDraft] = useState<PlacementRect | null>(null);
  const cellXStep = getCellXStep(cellWidth, colGap);
  const cellStepRef = useRef({ x: cellXStep, y: cellHeight });
  const displayedPlacement = resizeDraft !== null ? { ...placement, ...resizeDraft } : placement;

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
    gridColumn: `${displayedPlacement.x + 2} / span ${displayedPlacement.w}`,
    gridRow: `${displayedPlacement.y + 1} / span ${displayedPlacement.h}`,
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
    (edge: ResizeEdge, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const start: ResizeStart = {
        x: placement.x,
        y: placement.y,
        w: placement.w,
        h: placement.h,
        pointerX: e.clientX,
        pointerY: e.clientY,
        edge,
      };
      resizeStart.current = start;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setInteracting(true);

      const computeResize = (clientX: number, clientY: number): PlacementRect => {
        const current = resizeStart.current!;
        const { moveE, moveW, moveN, moveS } = resizeEdgeAxes(current.edge);
        const dx = clientX - current.pointerX;
        const dy = clientY - current.pointerY;

        const dw = moveE || moveW ? pxToCell(dx, cellStepRef.current.x) : 0;

        let dh = 0;
        if (moveS || moveN) {
          if (rowSteps) {
            if (moveS) {
              dh =
                closestRowForOffset(
                  getRowStart(current.y + current.h, rowSteps, cellStepRef.current.y) + dy,
                  rowSteps,
                  cellStepRef.current.y,
                ) -
                current.y -
                current.h;
            } else {
              dh =
                closestRowForOffset(
                  getRowStart(current.y, rowSteps, cellStepRef.current.y) + dy,
                  rowSteps,
                  cellStepRef.current.y,
                ) - current.y;
            }
          } else {
            dh = pxToCell(dy, cellStepRef.current.y);
          }
        }

        return resizeByHandle(current, current.edge, dw, dh, columns);
      };

      const onMove = (ev: PointerEvent) => {
        const next = computeResize(ev.clientX, ev.clientY);
        pendingResize.current = next;
        setResizeDraft(next);
      };

      const finishResize = () => {
        const next = pendingResize.current;
        const start = resizeStart.current;
        pendingResize.current = null;
        resizeStart.current = null;
        setResizeDraft(null);
        setInteracting(false);
        if (
          next &&
          start &&
          (next.x !== start.x || next.y !== start.y || next.w !== start.w || next.h !== start.h)
        ) {
          resizeItem(sectionId, item.id, next.x, next.y, next.w, next.h, breakpoint);
        }
      };

      const onUp = () => {
        finishResize();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
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
  const usePlaceholder = Boolean(descriptor?.editPlaceholder) && !isSelected;

  let body: React.ReactNode;
  if (usePlaceholder) {
    body = createElement(descriptor!.editPlaceholder!, { item });
  } else if (descriptor?.editComponent) {
    body = createElement(descriptor.editComponent, { item });
  } else {
    body = createElement(resolveRenderer(components, item, 'preview'), { item });
  }

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
        {body}
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
        {renderDragHandle ? (
          <div
            className={[
              chrome['grid-block__handle-slot'],
              isDragging ? chrome['grid-block__handle-slot--dragging'] : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {renderDragHandle({
              sectionId,
              item,
              isSelected,
              isDragging,
              listeners,
              attributes,
            })}
          </div>
        ) : (
          <button
            type="button"
            className={chrome['grid-block__handle']}
            aria-label={`Drag ${item.label ?? 'block'}`}
            title={item.label ?? 'Drag'}
            data-vantage-drag-handle=""
            {...listeners}
            {...attributes}
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
        )}
        {renderEditButton ? (
          <div className={chrome['grid-block__edit']} onPointerDown={(e) => e.stopPropagation()}>
            {renderEditButton({ sectionId, item, isSelected })}
          </div>
        ) : null}
        {renderDeleteButton ? (
          <div
            className={chrome['grid-block__delete-slot']}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {renderDeleteButton({
              sectionId,
              item,
              isSelected,
              onDelete: () => removeItem(sectionId, item.id),
            })}
          </div>
        ) : (
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
        )}
        {RESIZE_EDGES.map((edge) => (
          <div
            key={edge}
            className={[chrome['grid-block__resize'], chrome[RESIZE_EDGE_CLASS[edge]]]
              .filter(Boolean)
              .join(' ')}
            data-edge={edge}
            onPointerDown={(e) => onResizePointerDown(edge, e)}
            aria-label={RESIZE_EDGE_LABEL[edge]}
          />
        ))}
      </div>
    </Fragment>
  );
}
