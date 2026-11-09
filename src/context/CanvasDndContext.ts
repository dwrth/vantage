import { createContext, useContext } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import type { DropSource } from '../lib/arrangementPreview';

/** `translate` of a dragged block: undoes the shift of its section while it is dragged (see `Canvas`). */
export const DRAG_SHIFT = '0 var(--vantage-drag-shift-y, 0px)';

/** Ghost placement shown in a section while something is dragged over it. */
export type DropTarget = {
  sectionId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Arrangement section: index among its blocks the drop lands at (`x` / `y` are unused). */
  index?: number;
};

/** Live grid geometry a section exposes to the canvas-level drag-and-drop. */
export type SectionDropHandle = {
  getElement: () => HTMLElement | null;
  /**
   * Grid cell whose top-left is closest to a client point, clamped so a `w` x `h` item stays
   * inside the section. Returns the item size after clamping (the section never grows).
   */
  cellAt: (
    clientLeft: number,
    clientTop: number,
    w: number,
    h: number,
    excludeItemId?: string,
  ) => { x: number; y: number; w: number; h: number; index?: number };
  /** Arrangement section: `cellAt` wants the pointer position, not a block corner. */
  byPointer?: boolean;
  /** Pixel size of a `w` x `h` block on this grid (for centering a dragged palette item). */
  blockSize: (w: number, h: number) => { width: number; height: number };
  /** In-section move from a drag delta (the original single-section behaviour). */
  dropWithin: (event: DragEndEvent) => void;
};

export type CanvasDndContextValue = {
  registerSection: (sectionId: string, handle: SectionDropHandle) => () => void;
  dropTarget: DropTarget | null;
  setDropTarget: (next: DropTarget | null) => void;
  /** Section whose item is currently being dragged. */
  dragSourceSectionId: string | null;
  /** What is being dragged (a block or a palette item); `null` without a drag. */
  dragSource: DropSource | null;
  /** Height in px of the dragged block when the drag started (`null` for a palette item). */
  dragHeight: number | null;
};

export const CanvasDndContext = createContext<CanvasDndContextValue | null>(null);

export function useCanvasDnd(): CanvasDndContextValue {
  const ctx = useContext(CanvasDndContext);
  if (!ctx) throw new Error('useCanvasDnd must be used within the VantageBuilder canvas');
  return ctx;
}

export function sameDropTarget(a: DropTarget | null, b: DropTarget | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.sectionId === b.sectionId &&
    a.x === b.x &&
    a.y === b.y &&
    a.w === b.w &&
    a.h === b.h &&
    a.index === b.index
  );
}
