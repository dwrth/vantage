import { createElement, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useBlockDrag } from '../lib/blockDrag';
import { useBuilderContext } from '../context/BuilderContext';
import { DRAG_SHIFT } from '../context/CanvasDndContext';
import { useBuilderActions } from '../hooks/useBuilderActions';
import type { ArrangementSlot } from '../lib/arrangement';
import { resolveRenderer } from '../lib/registry';
import type { GridItem } from '../types';
import arrangement from '../styles/arrangement.module.css';
import chrome from '../styles/grid-block.module.css';

type Box = { left: number; top: number; width: number; height: number };

type ArrangementBlockProps = {
  sectionId: string;
  item: GridItem;
  slot: ArrangementSlot;
};

/** A block of an arrangement section in the builder: selectable and draggable, sized by its content. */
export function ArrangementBlock({ sectionId, item, slot }: ArrangementBlockProps) {
  const {
    components,
    onItemContextMenu,
    setSelection,
    selectedItems,
    renderEditButton,
    isItemRestricted,
    renderDragHandle,
    renderDeleteButton,
    blockLabels,
    defaultLabels,
    blockInstructionsId,
  } = useBuilderContext();
  const { removeItem } = useBuilderActions();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useBlockDrag(
    `${sectionId}:${item.id}`,
    { type: 'block', item, sectionId, placement: { x: 0, y: 0, w: item.w, h: item.h } },
  );

  /*
   * While dragged, the cell keeps the box it had when the drag started, out of the grid flow:
   * the preview reflows the other blocks without moving the dragged one away from the pointer.
   */
  const cellRef = useRef<HTMLDivElement>(null);
  const [frozen, setFrozen] = useState<Box | null>(null);
  useLayoutEffect(() => {
    const el = cellRef.current;
    setFrozen(
      isDragging && el
        ? { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight }
        : null,
    );
  }, [isDragging]);

  const descriptor = components[item.kind];
  const isSelected = selectedItems.some(
    (ref) => ref.sectionId === sectionId && ref.itemId === item.id,
  );
  const restricted = isItemRestricted?.(item) ?? false;
  const aspectRatio = descriptor?.arrangementAspectRatio?.(item);

  let body: React.ReactNode;
  if (descriptor?.editPlaceholder && !isSelected) {
    body = createElement(descriptor.editPlaceholder, { item });
  } else if (descriptor?.editComponent) {
    body = createElement(descriptor.editComponent, { item });
  } else {
    body = createElement(resolveRenderer(components, item, 'preview'), { item });
  }

  const onPointerDownCapture = useCallback(
    () => setSelection({ sectionId, itemId: item.id }),
    [setSelection, sectionId, item.id],
  );
  const onFocus = useCallback(() => {
    if (!isSelected) setSelection({ sectionId, itemId: item.id });
  }, [isSelected, setSelection, sectionId, item.id]);
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
  const handleAttributes = { ...attributes, tabIndex: -1 };
  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      className={[arrangement.cell, isDragging ? arrangement['cell--dragging'] : '']
        .filter(Boolean)
        .join(' ')}
      ref={cellRef}
      style={
        isDragging && frozen
          ? { position: 'absolute', ...frozen, zIndex: 3, translate: DRAG_SHIFT }
          : {
              gridColumn: `${slot.col + 2} / span ${slot.span}`,
              gridRow: slot.row + 1,
              ...(isDragging ? { zIndex: 3 } : {}),
            }
      }
      data-vantage-arrangement-cell={item.id}
      data-vantage-dragging={isDragging ? '' : undefined}
    >
      <div
        ref={setNodeRef}
        className={[
          chrome['grid-block__body'],
          arrangement.body,
          descriptor?.editWrapperClass ?? '',
          isDragging ? chrome['grid-block__body--dragging'] : '',
          restricted ? chrome['grid-block__body--restricted'] : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ ...dragStyle, ...(aspectRatio ? { aspectRatio } : {}) }}
        role="group"
        tabIndex={0}
        aria-roledescription={blockLabels.roleDescription}
        aria-label={blockName}
        aria-describedby={blockInstructionsId}
        data-vantage-block={blockKey}
        onFocus={onFocus}
        onKeyDown={onBodyKeyDown}
        onPointerDownCapture={onPointerDownCapture}
        onContextMenu={
          onItemContextMenu
            ? (e) => {
                e.preventDefault();
                onItemContextMenu(e, { sectionId, item });
              }
            : undefined
        }
      >
        {body}
      </div>
      <div
        className={[
          chrome['grid-block__chrome'],
          arrangement.chrome,
          isSelected || isDragging ? chrome['grid-block__chrome--active'] : '',
          restricted ? chrome['grid-block__chrome--restricted'] : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={dragStyle}
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
            title={item.label ?? defaultLabels.dragHandle}
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
      </div>
    </div>
  );
}
