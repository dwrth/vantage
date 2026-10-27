import type { PointerEvent as ReactPointerEvent } from 'react';

export type PointerDragHandlers = {
  onMove: (event: PointerEvent) => void;
  /** Runs once on release or cancel. */
  onEnd: () => void;
};

/**
 * Follow a pointer (mouse, touch or pen) from its `pointerdown` until release. Captures the
 * pointer so moves keep arriving outside the handle; give the handle `touch-action: none`.
 */
export function trackPointerDrag(e: ReactPointerEvent, { onMove, onEnd }: PointerDragHandlers) {
  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    onEnd();
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}
