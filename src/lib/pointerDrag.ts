import type { PointerEvent as ReactPointerEvent } from 'react';

export type PointerDragHandlers = {
  onMove: (event: PointerEvent) => void;
  /**
   * Runs exactly once when the drag ends. `cancelled` is true for Escape and `pointercancel`:
   * discard the draft instead of committing it.
   */
  onEnd: (cancelled: boolean) => void;
};

/**
 * Follow a pointer (mouse, touch or pen) from its `pointerdown` until release. Captures the
 * pointer so moves keep arriving outside the handle; give the handle `touch-action: none`.
 * Ends on pointerup, pointercancel, Escape, or when the capture is lost (e.g. the handle unmounts).
 */
export function trackPointerDrag(e: ReactPointerEvent, { onMove, onEnd }: PointerDragHandlers) {
  const target = e.target as HTMLElement;
  target.setPointerCapture?.(e.pointerId);

  let ended = false;
  const finish = (cancelled: boolean) => {
    if (ended) return;
    ended = true;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('keydown', onKeyDown, true);
    target.removeEventListener?.('lostpointercapture', onUp);
    onEnd(cancelled);
  };
  const onUp = () => finish(false);
  const onCancel = () => finish(true);
  const onKeyDown = (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape') return;
    ev.preventDefault();
    ev.stopPropagation();
    finish(true);
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  window.addEventListener('keydown', onKeyDown, true);
  target.addEventListener?.('lostpointercapture', onUp);
}
