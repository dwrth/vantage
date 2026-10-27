import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { trackPointerDrag } from './pointerDrag';

// Node test env: stand in a plain EventTarget for `window` and the captured handle.
let win: EventTarget;
let handle: EventTarget & { setPointerCapture: (id: number) => void };

beforeEach(() => {
  win = new EventTarget();
  vi.stubGlobal('window', win);
  handle = Object.assign(new EventTarget(), { setPointerCapture: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function start() {
  const onMove = vi.fn();
  const onEnd = vi.fn();
  trackPointerDrag({ target: handle, pointerId: 1 } as unknown as ReactPointerEvent, {
    onMove,
    onEnd,
  });
  return { onMove, onEnd };
}

function key(k: string) {
  return Object.assign(new Event('keydown', { cancelable: true }), { key: k });
}

describe('trackPointerDrag', () => {
  it('captures the pointer and forwards moves', () => {
    const { onMove } = start();
    expect(handle.setPointerCapture).toHaveBeenCalledWith(1);
    win.dispatchEvent(new Event('pointermove'));
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['pointerup', false],
    ['pointercancel', true],
  ])('ends once on %s (cancelled: %s)', (type, cancelled) => {
    const { onMove, onEnd } = start();
    win.dispatchEvent(new Event(type));
    win.dispatchEvent(new Event(type));
    win.dispatchEvent(new Event('pointermove'));
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith(cancelled);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('cancels on Escape and ignores other keys', () => {
    const { onEnd } = start();
    win.dispatchEvent(key('a'));
    expect(onEnd).not.toHaveBeenCalled();
    win.dispatchEvent(key('Escape'));
    expect(onEnd).toHaveBeenCalledWith(true);
  });

  it('ends when pointer capture is lost, without a second end on the following pointerup', () => {
    const { onEnd } = start();
    handle.dispatchEvent(new Event('lostpointercapture'));
    win.dispatchEvent(new Event('pointerup'));
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith(false);
  });
});
