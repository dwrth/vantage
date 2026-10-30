import type { SelectionRef } from '../context/BuilderContext';
import {
  bringItemForward,
  moveItem,
  removeItem,
  resizeItem,
  sendItemBackward,
} from '../mutations/layout';
import type { Breakpoint, GridItem, Layout } from '../types';
import { resizeFloor, type GridMinSize } from './grid';
import { getEnabledBreakpoints, resolveItem, resolveSection, sectionRows } from './breakpoint';

/**
 * Builder shortcuts. Copy, paste and duplicate are not here on purpose: they need the host
 * (entity records, clipboard scope), so the host binds them.
 */
export type BlockKeyAction =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'resize'; dw: number; dh: number }
  | { type: 'bringForward' }
  | { type: 'sendBackward' }
  | { type: 'delete' }
  | { type: 'deselect' }
  | { type: 'undo' }
  | { type: 'redo' };

type KeyLike = Pick<KeyboardEvent, 'key' | 'shiftKey' | 'metaKey' | 'ctrlKey' | 'altKey'>;

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Maps a key press to a builder action, or `null` when the builder leaves the key alone. */
export function keyToAction(e: KeyLike): BlockKeyAction | null {
  if (e.altKey) return null;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.metaKey || e.ctrlKey) {
    if (key === 'z') return { type: e.shiftKey ? 'redo' : 'undo' };
    if (key === 'y' && !e.shiftKey) return { type: 'redo' };
    if (e.shiftKey && key === 'ArrowUp') return { type: 'bringForward' };
    if (e.shiftKey && key === 'ArrowDown') return { type: 'sendBackward' };
    return null;
  }
  const arrow = ARROWS[key];
  if (arrow) {
    const [x, y] = arrow;
    return e.shiftKey ? { type: 'resize', dw: x, dh: y } : { type: 'move', dx: x, dy: y };
  }
  if (e.shiftKey) return null;
  if (key === 'Delete' || key === 'Backspace') return { type: 'delete' };
  if (key === 'Escape') return { type: 'deselect' };
  return null;
}

export type BlockEditAction = Extract<
  BlockKeyAction,
  { type: 'move' | 'resize' | 'bringForward' | 'sendBackward' | 'delete' }
>;

export type BlockEditResult = {
  /** The same object as the input layout when the action changed nothing (e.g. at an edge). */
  layout: Layout;
  /** The block after the action (before it, for `delete`), resolved for the breakpoint. */
  item: GridItem;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, Math.max(min, max)));

export type BlockActionOptions = {
  /** Content minimum of the block on this grid; resizes do not shrink below it. */
  minSize?: GridMinSize;
};

/**
 * Applies a keyboard edit to the selected block on `breakpoint`'s grid. Moves and resizes stay
 * inside the section (columns and rows), like pointer drags, and resizes respect
 * `options.minSize` like pointer resizes (see `resizeFloor`). Returns `null` when the block is
 * missing or hidden on that breakpoint.
 */
export function applyBlockAction(
  layout: Layout,
  selection: SelectionRef,
  action: BlockEditAction,
  breakpoint: Breakpoint,
  options: BlockActionOptions = {},
): BlockEditResult | null {
  const enabled = getEnabledBreakpoints(layout);
  const section = layout.sections.find((s) => s.id === selection.sectionId);
  const index = section?.items.findIndex((i) => i.id === selection.itemId) ?? -1;
  if (!section || index < 0) return null;
  const item = section.items[index]!;
  const placement = resolveItem(item, section, breakpoint, enabled);
  if (placement.hidden) return null;
  const { columns } = resolveSection(section, breakpoint, enabled);
  const rows = sectionRows(section, breakpoint, enabled);
  const fullBleed = item.fullBleed === true;
  const placed = (p: { x: number; y: number; w: number; h: number }): GridItem => ({
    ...item,
    ...p,
  });
  const current = placed(placement);
  const { sectionId, itemId } = selection;

  switch (action.type) {
    case 'move': {
      const x = fullBleed ? placement.x : clamp(placement.x + action.dx, 0, columns - placement.w);
      const y = clamp(placement.y + action.dy, 0, rows - placement.h);
      if (x === placement.x && y === placement.y) return { layout, item: current };
      return {
        layout: moveItem(layout, sectionId, itemId, x, y, breakpoint),
        item: placed({ ...placement, x, y }),
      };
    }
    case 'resize': {
      const floor = resizeFloor(placement, options.minSize);
      const w = fullBleed
        ? placement.w
        : clamp(placement.w + action.dw, floor.w, columns - placement.x);
      const h = clamp(placement.h + action.dh, floor.h, rows - placement.y);
      if (w === placement.w && h === placement.h) return { layout, item: current };
      return {
        layout: resizeItem(layout, sectionId, itemId, placement.x, placement.y, w, h, breakpoint),
        item: placed({ ...placement, w, h }),
      };
    }
    case 'bringForward':
      if (index >= section.items.length - 1) return { layout, item: current };
      return { layout: bringItemForward(layout, sectionId, itemId), item: current };
    case 'sendBackward':
      if (index <= 0) return { layout, item: current };
      return { layout: sendItemBackward(layout, sectionId, itemId), item: current };
    case 'delete':
      return { layout: removeItem(layout, sectionId, itemId), item: current };
  }
}
