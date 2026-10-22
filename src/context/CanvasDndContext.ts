import { createContext, useContext } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';

/** Ghost placement shown in a section while something is dragged over it. */
export type DropTarget = {
  sectionId: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Live grid geometry a section exposes to the canvas-level drag-and-drop. */
export type SectionDropHandle = {
  getElement: () => HTMLElement | null;
  /** Grid cell whose top-left is closest to a client point, clamped for an item `w` cells wide. */
  cellAt: (clientLeft: number, clientTop: number, w: number) => { x: number; y: number; w: number };
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
  return a.sectionId === b.sectionId && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}
