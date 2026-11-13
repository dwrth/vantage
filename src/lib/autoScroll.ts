import { edgeScrollSpeed, type ClientPoint } from './dropTargeting';

/** Nearest ancestor that scrolls vertically, else the page. */
export function scrollParent(node: HTMLElement | null): HTMLElement {
  for (let el = node?.parentElement; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (/(auto|scroll|overlay)/.test(overflowY) && el.scrollHeight > el.clientHeight) return el;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

/** Visible vertical extent of a scroll container in client coordinates. */
export function visibleBand(el: HTMLElement): { top: number; bottom: number } {
  if (el === document.scrollingElement || el === document.documentElement) {
    return { top: 0, bottom: window.innerHeight };
  }
  const rect = el.getBoundingClientRect();
  return { top: Math.max(0, rect.top), bottom: Math.min(window.innerHeight, rect.bottom) };
}

export type EdgeAutoScroll = {
  /** Latest pointer position; scrolling runs while it rests in an edge band. */
  update: (point: ClientPoint) => void;
  /** Stops scrolling until the next `update`. */
  pause: () => void;
  stop: () => void;
};

/** Vertical auto-scroll of `scroller` while the pointer is near its top or bottom edge. */
export function edgeAutoScroll(scroller: HTMLElement): EdgeAutoScroll {
  let pointer: ClientPoint | null = null;
  let raf = 0;
  let last = 0;

  const tick = (now: number) => {
    raf = 0;
    if (!pointer) return;
    const band = visibleBand(scroller);
    const speed = edgeScrollSpeed(pointer.y, band.top, band.bottom);
    if (speed === 0) return;
    const elapsed = last ? Math.min(now - last, 50) : 16;
    last = now;
    scroller.scrollBy(0, speed * elapsed);
    raf = requestAnimationFrame(tick);
  };

  return {
    update(point) {
      pointer = point;
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    },
    pause() {
      pointer = null;
    },
    stop() {
      pointer = null;
      cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
