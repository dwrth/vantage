// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { edgeAutoScroll } from './autoScroll';

let frames: FrameRequestCallback[] = [];
const flush = (now: number) => {
  const pending = frames;
  frames = [];
  pending.forEach((cb) => cb(now));
};

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => {
    frames = [];
  });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function scroller() {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({ top: 0, bottom: 1000 }) as DOMRect;
  el.scrollBy = vi.fn() as unknown as typeof el.scrollBy;
  return el;
}

describe('edgeAutoScroll', () => {
  it('scrolls while the pointer rests in an edge band and stops outside it', () => {
    const el = scroller();
    const auto = edgeAutoScroll(el);
    auto.update({ x: 0, y: 1000 });
    flush(0);
    flush(16);
    expect(el.scrollBy).toHaveBeenCalledTimes(2);
    expect(vi.mocked(el.scrollBy).mock.calls[1]).toEqual([0, 32]);
    auto.update({ x: 0, y: 500 });
    flush(32);
    expect(el.scrollBy).toHaveBeenCalledTimes(2);
    expect(frames).toHaveLength(0);
  });

  it('scrolls up near the top edge', () => {
    const el = scroller();
    edgeAutoScroll(el).update({ x: 0, y: 0 });
    flush(0);
    expect(vi.mocked(el.scrollBy).mock.calls[0]![1]).toBeLessThan(0);
  });

  it('does nothing after pause or stop', () => {
    const el = scroller();
    const auto = edgeAutoScroll(el);
    auto.update({ x: 0, y: 1000 });
    auto.pause();
    flush(0);
    auto.update({ x: 0, y: 1000 });
    auto.stop();
    flush(16);
    expect(el.scrollBy).not.toHaveBeenCalled();
  });
});
