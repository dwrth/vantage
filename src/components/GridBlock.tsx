import { useDraggable } from '@dnd-kit/core';
import { createElement, Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useBuilderContext } from '../context/BuilderContext';
import { useBuilderActions } from '../hooks/useBuilderActions';
import { useCanvasDnd } from '../context/CanvasDndContext';
import {
  getCellXStep,
  pxToCell,
  resizeByHandle,
  resizeEdgeAxes,
  type PlacementRect,
  type ResizeEdge,
} from '../lib/grid';
import { trackPointerDrag } from '../lib/pointerDrag';
import { closestRowForOffset, getRowStart } from '../lib/rowMetrics';
import { resolveRenderer } from '../lib/registry';
import type { ResolvedItemLayout } from '../lib/breakpoint';
import type { Breakpoint, GridItem } from '../types';
import chrome from '../styles/grid-block.module.css';

const RESIZE_EDGES: ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

/** Full-bleed blocks always span the width, so only the vertical edges resize. */
const FULL_BLEED_RESIZE_EDGES: ResizeEdge[] = ['n', 's'];

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
  /** Section height in rows; drags and resizes stay inside it. */
  rows: number;
  /** Stacking position (1 = bottom). DOM order is reading order, so stacking needs z-index. */
  zIndex: number;
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
  rows,
  zIndex,
}: GridBlockProps) {
  const {
    components,
    setInteracting,
    onItemContextMenu,
    selection,
    setSelection,
    renderEditButton,
    isItemRestricted,
    renderDragHandle,
    renderDeleteButton,
    blockLabels,
    blockInstructionsId,
  } = useBuilderContext();
  const { resizeItem, removeItem } = useBuilderActions();
  const resizeStart = useRef<ResizeStart | null>(null);
  const pendingResize = useRef<PlacementRect | null>(null);
  const [resizeDraft, setResizeDraft] = useState<PlacementRect | null>(null);
  // True from pointer-down on a resize handle until release, before the first move too.
  const [isResizing, setIsResizing] = useState(false);
  const cellXStep = getCellXStep(cellWidth, colGap);
  const cellStepRef = useRef({ x: cellXStep, y: cellHeight });
  const displayedPlacement = resizeDraft !== null ? { ...placement, ...resizeDraft } : placement;

  const { dropTarget } = useCanvasDnd();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${sectionId}:${item.id}`,
    data: { type: 'block', item, sectionId, placement },
  });
  // Over another section the block follows the pointer freely; the target shows a snapped ghost.
  const leavingSection = isDragging && dropTarget !== null && dropTarget.sectionId !== sectionId;

  useEffect(() => {
    cellStepRef.current = { x: cellXStep, y: cellHeight };
  }, [cellXStep, cellHeight]);

  // A drag never grows the section: the block snaps no lower than its last row.
  const clampRow = (row: number) => Math.max(0, Math.min(row, rows - placement.h));

  const fullBleed = item.fullBleed === true;
  // A full-bleed block spans the section, so it only moves vertically.
  const snappedX =
    fullBleed && !leavingSection
      ? 0
      : leavingSection && transform
        ? transform.x
        : transform
          ? pxToCell(transform.x, cellXStep) * cellXStep
          : 0;
  const snappedY =
    leavingSection && transform
      ? transform.y
      : transform && rowSteps
        ? getRowStart(
            clampRow(
              closestRowForOffset(
                getRowStart(placement.y, rowSteps, cellHeight) + transform.y,
                rowSteps,
                cellHeight,
              ),
            ),
            rowSteps,
            cellHeight,
          ) - getRowStart(placement.y, rowSteps, cellHeight)
        : transform
          ? (clampRow(placement.y + pxToCell(transform.y, cellHeight)) - placement.y) * cellHeight
          : 0;

  const gridPlacement: React.CSSProperties = {
    gridColumn: fullBleed ? '1 / -1' : `${displayedPlacement.x + 2} / span ${displayedPlacement.w}`,
    gridRow: `${displayedPlacement.y + 1} / span ${displayedPlacement.h}`,
  };

  const dragTransform = transform ? `translate3d(${snappedX}px, ${snappedY}px, 0)` : undefined;

  const stackStyle = { '--vantage-z': zIndex } as React.CSSProperties;

  const bodyStyle: React.CSSProperties = {
    ...gridPlacement,
    ...stackStyle,
    transform: dragTransform,
  };

  const chromeStyle: React.CSSProperties = {
    ...gridPlacement,
    ...stackStyle,
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
      setIsResizing(true);
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

        return resizeByHandle(current, current.edge, dw, dh, columns, rows);
      };

      const onMove = (ev: PointerEvent) => {
        const next = computeResize(ev.clientX, ev.clientY);
        pendingResize.current = next;
        setResizeDraft(next);
      };

      const onEnd = (cancelled: boolean) => {
        const next = pendingResize.current;
        const start = resizeStart.current;
        pendingResize.current = null;
        resizeStart.current = null;
        setResizeDraft(null);
        setIsResizing(false);
        setInteracting(false);
        if (
          !cancelled &&
          next &&
          start &&
          (next.x !== start.x || next.y !== start.y || next.w !== start.w || next.h !== start.h)
        ) {
          resizeItem(sectionId, item.id, next.x, next.y, next.w, next.h, breakpoint);
        }
      };

      trackPointerDrag(e, { onMove, onEnd });
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
      rows,
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

  const restricted = isItemRestricted?.(item) ?? false;
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

  // Selection follows focus, so Tab / Shift+Tab walk the blocks in reading order.
  const onFocus = useCallback(() => {
    if (!isSelected) setSelection({ sectionId, itemId: item.id });
  }, [isSelected, setSelection, sectionId, item.id]);

  // Enter / Space reselect a focused block after Escape.
  const onBodyKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget || isSelected) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      setSelection({ sectionId, itemId: item.id });
    },
    [isSelected, setSelection, sectionId, item.id],
  );

  const blockKey = `${sectionId}:${item.id}`;
  const blockName = blockLabels.block(item);
  // The block itself is the keyboard drag surface; the handle stays a pointer-only control.
  const handleAttributes = { ...attributes, tabIndex: -1 };

  return (
    <Fragment>
      <div
        ref={setNodeRef}
        className={[
          chrome['grid-block__body'],
          wrapperClass,
          isDragging ? chrome['grid-block__body--dragging'] : '',
          restricted ? chrome['grid-block__body--restricted'] : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={bodyStyle}
        role="group"
        tabIndex={0}
        aria-roledescription={blockLabels.roleDescription}
        aria-label={blockName}
        aria-describedby={blockInstructionsId}
        data-vantage-block={blockKey}
        onFocus={onFocus}
        onKeyDown={onBodyKeyDown}
        onPointerDownCapture={onPointerDownCapture}
        onContextMenu={onItemContextMenu ? onContextMenu : undefined}
      >
        {body}
      </div>
      <div
        className={[
          chrome['grid-block__chrome'],
          isSelected || isDragging ? chrome['grid-block__chrome--active'] : '',
          isResizing ? chrome['grid-block__chrome--resizing'] : '',
          restricted ? chrome['grid-block__chrome--restricted'] : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={chromeStyle}
        data-vantage-block={blockKey}
        onFocus={onFocus}
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
              attributes: handleAttributes,
            })}
          </div>
        ) : (
          <button
            type="button"
            className={chrome['grid-block__handle']}
            aria-label={blockLabels.dragHandle(item)}
            title={item.label ?? 'Drag'}
            data-vantage-drag-handle=""
            {...listeners}
            {...handleAttributes}
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
            aria-label={blockLabels.deleteButton(item)}
          >
            ×
          </button>
        )}
        {(fullBleed ? FULL_BLEED_RESIZE_EDGES : RESIZE_EDGES).map((edge) => (
          <div
            key={edge}
            className={[chrome['grid-block__resize'], chrome[RESIZE_EDGE_CLASS[edge]]]
              .filter(Boolean)
              .join(' ')}
            data-edge={edge}
            onPointerDown={(e) => onResizePointerDown(edge, e)}
            // Pointer-only: Shift+arrow keys resize the focused block.
            aria-hidden="true"
          />
        ))}
      </div>
    </Fragment>
  );
}
