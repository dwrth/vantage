import { useLayoutEffect, useRef, type RefObject } from 'react';
import { prefersReducedMotion } from '../lib/motion';

const REFLOW_MS = 160;

/**
 * Animates the children of each `[attr]` element of `container` from where they were on the last
 * render to where they are now (FLIP), while `active` is set and on the render that clears it
 * (the way back). The elements themselves stay put,
 * so hit-testing their rects is not thrown off by the animation. Nothing moves under
 * `prefers-reduced-motion: reduce`.
 */
export function useReflow(
  container: RefObject<HTMLElement | null>,
  attr: string,
  active: boolean,
): void {
  const positions = useRef(new Map<string, { left: number; top: number }>());
  const wasActive = useRef(false);
  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const play = (active || wasActive.current) && !prefersReducedMotion();
    wasActive.current = active;
    const next = new Map<string, { left: number; top: number }>();
    for (const el of root.querySelectorAll<HTMLElement>(`[${attr}]:not([data-vantage-dragging])`)) {
      const at = { left: el.offsetLeft, top: el.offsetTop };
      const key = el.getAttribute(attr)!;
      const from = positions.current.get(key);
      next.set(key, at);
      if (!play || !from || (from.left === at.left && from.top === at.top)) continue;
      const keyframes = [
        { translate: `${from.left - at.left}px ${from.top - at.top}px` },
        { translate: '0 0' },
      ];
      for (const child of el.children) {
        if (typeof child.animate === 'function') {
          child.animate(keyframes, { duration: REFLOW_MS, easing: 'ease-out' });
        }
      }
    }
    positions.current = next;
  });
}
