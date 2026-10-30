import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import type { SelectionRef } from '../context/BuilderContext';
import type { LayoutChangeOptions } from '../lib/diff';
import { applyBlockAction, keyToAction } from '../lib/keyboard';
import type { BlockAnnouncements, BlockLabels } from '../lib/keyboardLabels';
import { blocksInReadingOrder } from '../lib/readingOrder';
import type { Breakpoint, Layout } from '../types';

/** The part of `useVantageHistory`'s result the builder needs for Cmd/Ctrl+Z and redo. */
export type BuilderHistory = {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export const BLOCK_ATTR = 'data-vantage-block';

export const blockKey = (ref: SelectionRef) => `${ref.sectionId}:${ref.itemId}`;

function isEditableTarget(target: Element): boolean {
  return (
    (target as HTMLElement).isContentEditable === true ||
    target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !==
      null
  );
}

type KeyboardState = {
  layout: Layout;
  selection: SelectionRef | null;
  setSelection: (next: SelectionRef | null) => void;
  activeBreakpoint: Breakpoint;
  isInteracting: boolean;
  emitChange: (next: Layout, options?: LayoutChangeOptions) => void;
  history?: BuilderHistory;
  blockLabels: BlockLabels;
  announcements: BlockAnnouncements;
  announce: (message: string) => void;
};

/**
 * The builder's keyboard layer: one window `keydown` listener.
 *
 * - Block keys (arrows, Shift+arrows, Cmd/Ctrl+Shift+↑/↓, Delete/Backspace, Escape) act on the
 *   selected block while focus is inside that block (body or chrome) or nowhere (`<body>`).
 * - Undo/redo (Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Cmd/Ctrl+Y) act anywhere except text fields and
 *   dialogs outside the builder, and only when `history` is passed.
 * - Text fields keep every key. Copy, paste and duplicate are left to the host.
 *
 * One held key (auto-repeat) is one gesture: its changes share a merge key, so
 * `useVantageHistory` records one undo step.
 */
export function useBuilderKeyboard(rootRef: RefObject<HTMLElement | null>, state: KeyboardState) {
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  });

  const burstRef = useRef(0);
  // Block to focus once the host has applied the change (moving or removing DOM nodes drops focus).
  const pendingFocusRef = useRef<{ target: SelectionRef; from: Layout } | null>(null);

  useLayoutEffect(() => {
    const pending = pendingFocusRef.current;
    const root = rootRef.current;
    if (!pending || !root || pending.from === state.layout) return;
    pendingFocusRef.current = null;
    const key = blockKey(pending.target);
    const body = Array.from(root.querySelectorAll<HTMLElement>(`[${BLOCK_ATTR}][tabindex]`)).find(
      (el) => el.getAttribute(BLOCK_ATTR) === key,
    );
    if (body && document.activeElement !== body) body.focus();
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.defaultPrevented || s.isInteracting) return;
      const action = keyToAction(e);
      if (!action) return;
      const root = rootRef.current;
      const target = e.target instanceof Element ? e.target : null;
      if (!root || (target && isEditableTarget(target))) return;
      if (!e.repeat) burstRef.current += 1;

      if (action.type === 'undo' || action.type === 'redo') {
        const history = s.history;
        const inForeignDialog =
          target !== null &&
          !root.contains(target) &&
          target.closest('[role="dialog"], [role="alertdialog"]') !== null;
        if (!history || inForeignDialog) return;
        if (action.type === 'undo' ? !history.canUndo : !history.canRedo) return;
        e.preventDefault();
        if (action.type === 'undo') {
          history.undo();
          s.announce(s.announcements.undone());
        } else {
          history.redo();
          s.announce(s.announcements.redone());
        }
        return;
      }

      const selection = s.selection;
      if (!selection) return;
      const focusOnSelected =
        target === null ||
        target === document.body ||
        target === document.documentElement ||
        target.closest(`[${BLOCK_ATTR}]`)?.getAttribute(BLOCK_ATTR) === blockKey(selection);
      if (!focusOnSelected) return;

      if (action.type === 'deselect') {
        const section = s.layout.sections.find((x) => x.id === selection.sectionId);
        const item = section?.items.find((x) => x.id === selection.itemId);
        e.preventDefault();
        s.setSelection(null);
        if (item) {
          s.announce(
            s.announcements.deselected({
              item,
              name: s.blockLabels.block(item),
              column: item.x + 1,
              row: item.y + 1,
              width: item.w,
              height: item.h,
            }),
          );
        }
        return;
      }

      const result = applyBlockAction(s.layout, selection, action, s.activeBreakpoint);
      if (!result) return;
      e.preventDefault();
      const { item } = result;
      const ctx = {
        item,
        name: s.blockLabels.block(item),
        column: item.x + 1,
        row: item.y + 1,
        width: item.w,
        height: item.h,
      };

      if (action.type === 'delete') {
        const order = blocksInReadingOrder(s.layout, s.activeBreakpoint);
        const index = order.findIndex((ref) => blockKey(ref) === blockKey(selection));
        const next = order[index + 1] ?? order[index - 1] ?? null;
        s.emitChange(result.layout);
        s.setSelection(next);
        if (next) pendingFocusRef.current = { target: next, from: s.layout };
        s.announce(s.announcements.deleted(ctx));
        return;
      }

      if (result.layout !== s.layout) {
        pendingFocusRef.current = { target: selection, from: s.layout };
        s.emitChange(result.layout, {
          mergeKey: `vantage-key:${action.type}:${blockKey(selection)}:${burstRef.current}`,
        });
      }
      const message =
        action.type === 'move'
          ? s.announcements.moved(ctx)
          : action.type === 'resize'
            ? s.announcements.resized(ctx)
            : action.type === 'bringForward'
              ? s.announcements.broughtForward(ctx)
              : s.announcements.sentBackward(ctx);
      s.announce(message);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rootRef]);
}
