// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SectionBackground as SectionBackgroundType } from '../types';
import { SectionBackground } from './SectionBackground';

type Box = { top: number; width: number; height: number };

const boxes = {
  wrap: { top: 100, width: 100, height: 200 } as Box,
  layer: { top: 0, width: 100, height: 100 } as Box,
};

function domRect({ top, width, height }: Box): DOMRect {
  const r = { left: 0, top, width, height, x: 0, y: top, right: width, bottom: top + height };
  return { ...r, toJSON: () => r } as DOMRect;
}

let observers: Array<{ callback: () => void; observed: Element[]; disconnected: boolean }>;

beforeEach(() => {
  boxes.wrap = { top: 100, width: 100, height: 200 };
  boxes.layer = { top: 0, width: 100, height: 100 };
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    return domRect(this.hasAttribute('data-vantage-section-background') ? boxes.wrap : boxes.layer);
  });
  observers = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      entry = { callback: () => {}, observed: [] as Element[], disconnected: false };
      constructor(callback: () => void) {
        this.entry.callback = callback;
        observers.push(this.entry);
      }
      observe(el: Element) {
        this.entry.observed.push(el);
      }
      unobserve() {}
      disconnect() {
        this.entry.disconnected = true;
      }
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const wrapOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-vantage-section-background]')!;
const layerOf = (container: HTMLElement) => wrapOf(container).firstElementChild as HTMLElement;
const imgOf = (container: HTMLElement) => container.querySelector('img');

function loadImage(img: HTMLImageElement, naturalWidth: number, naturalHeight: number) {
  Object.defineProperty(img, 'naturalWidth', { value: naturalWidth, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: naturalHeight, configurable: true });
  fireEvent.load(img);
}

const render_ = (background?: SectionBackgroundType, props = {}) =>
  render(<SectionBackground background={background} {...props} />);

describe('SectionBackground rendering', () => {
  it.each([
    ['undefined', undefined],
    ['empty', {}],
    ['only unrelated fields', { imageSize: 'contain' as const, imageRepeat: 'repeat' as const }],
  ])('renders nothing for %s', (_name, background) => {
    const { container } = render_(background);
    expect(container.firstChild).toBeNull();
  });

  it('paints a color on an aria-hidden, non-interactive wrapper', () => {
    const { container } = render_({ color: '#ff0000' });
    const wrap = wrapOf(container);
    expect(wrap.getAttribute('aria-hidden')).toBe('true');
    expect(wrap.style.pointerEvents).toBe('none');
    expect(wrap.style.zIndex).toBe('-1');
    expect(wrap.hasAttribute('data-vantage-section-parallax')).toBe(false);
    const layer = layerOf(container);
    expect(layer.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(layer.style.backgroundImage).toBe('');
    expect(layer.style.opacity).toBe('1');
    expect(layer.style.filter).toBe('');
    expect(imgOf(container)).toBeNull();
  });

  it('applies className to the wrapper and layerClassName to the layer', () => {
    const { container } = render_(
      { color: 'red' },
      { className: 'outer', layerClassName: 'inner' },
    );
    expect(wrapOf(container).className).toBe('outer');
    expect(layerOf(container).className).toBe('inner');
  });

  it('renders for blur or opacity alone, including zero', () => {
    expect(render_({ blur: 0 }).container.firstChild).not.toBeNull();
    cleanup();
    const { container } = render_({ opacity: 0 });
    expect(layerOf(container).style.opacity).toBe('0');
  });

  it('applies opacity and blur, growing the layer by twice the blur', () => {
    const { container } = render_({ color: 'red', blur: 4, opacity: 0.5 });
    const layer = layerOf(container);
    expect(layer.style.opacity).toBe('0.5');
    expect(layer.style.filter).toBe('blur(4px)');
    expect(layer.style.inset).toBe('-8px');
  });

  it('treats a negative blur as none', () => {
    const { container } = render_({ color: 'red', blur: -5 });
    const layer = layerOf(container);
    expect(layer.style.filter).toBe('');
    expect(layer.style.inset).toBe('0px');
  });
});

describe('SectionBackground legacy image mode', () => {
  it('paints the image as a CSS background with the defaults', () => {
    const { container } = render_({ image: 'https://x.test/a.jpg' });
    const layer = layerOf(container);
    expect(layer.style.backgroundImage).toBe('url("https://x.test/a.jpg")');
    expect(layer.style.backgroundSize).toBe('cover');
    expect(layer.style.backgroundPosition).toBe('center center');
    expect(layer.style.backgroundRepeat).toBe('no-repeat');
    expect(layer.style.overflow).toBe('');
    expect(imgOf(container)).toBeNull();
  });

  it('honours size, position and repeat', () => {
    const { container } = render_({
      image: 'a.jpg',
      imageSize: 'contain',
      imagePosition: 'top left',
      imageRepeat: 'repeat',
    });
    const layer = layerOf(container);
    expect(layer.style.backgroundSize).toBe('contain');
    expect(layer.style.backgroundPosition).toBe('left top');
    expect(layer.style.backgroundRepeat).toBe('repeat');
  });

  it('escapes quotes in the image url', () => {
    const { container } = render_({ image: 'a"b.jpg' });
    expect(layerOf(container).style.backgroundImage).toBe('url("a\\"b.jpg")');
  });
});

describe('SectionBackground focal mode', () => {
  it('renders an img instead of a CSS background', () => {
    const { container } = render_({ image: 'a.jpg', objectPositionX: 20, objectPositionY: 80 });
    const layer = layerOf(container);
    expect(layer.style.backgroundImage).toBe('');
    expect(layer.style.backgroundSize).toBe('');
    expect(layer.style.overflow).toBe('hidden');
    const img = imgOf(container)!;
    expect(img.getAttribute('src')).toBe('a.jpg');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.draggable).toBe(false);
  });

  it('positions with object-fit and the focal point before the image size is known', () => {
    const { container } = render_({ image: 'a.jpg', objectPositionX: 20, objectPositionY: 80 });
    const img = imgOf(container)!;
    expect(img.style.objectFit).toBe('cover');
    expect(img.style.objectPosition).toBe('20% 80%');
    expect(img.style.width).toBe('100%');
    expect(img.style.height).toBe('100%');
  });

  it('maps imageSize to object-fit', () => {
    const contain = render_({ image: 'a.jpg', cropScale: 1, imageSize: 'contain' });
    expect(imgOf(contain.container)!.style.objectFit).toBe('contain');
    cleanup();
    const auto = render_({ image: 'a.jpg', cropScale: 1, imageSize: 'auto' });
    expect(imgOf(auto.container)!.style.objectFit).toBe('scale-down');
  });

  it('treats cropScale alone as focal mode, centered by default', () => {
    const { container } = render_({ image: 'a.jpg', cropScale: 0.8 });
    expect(imgOf(container)!.style.objectPosition).toBe('50% 50%');
  });

  it('places the loaded image absolutely, cropping around the focal point', () => {
    const { container } = render_({
      image: 'a.jpg',
      objectPositionX: 50,
      objectPositionY: 50,
      cropScale: 1,
    });
    loadImage(imgOf(container)!, 200, 100);
    const img = imgOf(container)!;
    expect(img.style.position).toBe('absolute');
    expect(img.style.width).toBe('200%');
    expect(img.style.height).toBe('100%');
    expect(img.style.left).toBe('-50%');
    expect(img.style.top).toBe('0%');
    expect(img.style.maxWidth).toBe('none');
  });

  it('zooms out with a smaller cropScale and moves with the focal point', () => {
    const { container } = render_({
      image: 'a.jpg',
      objectPositionX: 0,
      objectPositionY: 100,
      cropScale: 0.5,
    });
    loadImage(imgOf(container)!, 200, 100);
    const img = imgOf(container)!;
    expect(img.style.width).toBe('400%');
    expect(img.style.height).toBe('200%');
    expect(img.style.left).toBe('0%');
    expect(img.style.top).toBe('-100%');
  });

  it('fits the whole image for contain', () => {
    const { container } = render_({
      image: 'a.jpg',
      imageSize: 'contain',
      objectPositionX: 50,
      objectPositionY: 50,
    });
    loadImage(imgOf(container)!, 200, 100);
    const img = imgOf(container)!;
    expect(img.style.width).toBe('100%');
    expect(img.style.height).toBe('50%');
    expect(img.style.left).toBe('0%');
    expect(img.style.top).toBe('25%');
  });

  it('ignores a load event without natural dimensions', () => {
    const { container } = render_({ image: 'a.jpg', objectPositionX: 50 });
    loadImage(imgOf(container)!, 0, 0);
    const img = imgOf(container)!;
    expect(img.style.position).toBe('');
    expect(img.style.objectFit).toBe('cover');
  });

  it('drops the measured size when the image changes', () => {
    const { container, rerender } = render_({ image: 'a.jpg', objectPositionX: 50 });
    loadImage(imgOf(container)!, 200, 100);
    expect(imgOf(container)!.style.position).toBe('absolute');
    rerender(<SectionBackground background={{ image: 'b.jpg', objectPositionX: 50 }} />);
    const img = imgOf(container)!;
    expect(img.getAttribute('src')).toBe('b.jpg');
    expect(img.style.position).toBe('');
    expect(img.style.objectFit).toBe('cover');
  });

  it('re-places the image when the layer is resized', () => {
    const { container } = render_({
      image: 'a.jpg',
      objectPositionX: 50,
      objectPositionY: 50,
      cropScale: 1,
    });
    loadImage(imgOf(container)!, 200, 100);
    expect(imgOf(container)!.style.width).toBe('200%');
    boxes.layer = { top: 0, width: 400, height: 100 };
    act(() => observers[0]!.callback());
    const img = imgOf(container)!;
    expect(img.style.width).toBe('100%');
    expect(img.style.height).toBe('200%');
  });

  it('keeps the previous size when the layer collapses to zero', () => {
    const { container } = render_({
      image: 'a.jpg',
      objectPositionX: 50,
      objectPositionY: 50,
      cropScale: 1,
    });
    loadImage(imgOf(container)!, 200, 100);
    boxes.layer = { top: 0, width: 0, height: 0 };
    act(() => observers[0]!.callback());
    expect(imgOf(container)!.style.width).toBe('200%');
  });
});

describe('SectionBackground layer observation', () => {
  it('observes the layer and disconnects on unmount', () => {
    const { container, unmount } = render_({ color: 'red' });
    expect(observers).toHaveLength(1);
    expect(observers[0]!.observed).toEqual([layerOf(container)]);
    unmount();
    expect(observers[0]!.disconnected).toBe(true);
  });

  it('does not observe anything when there is nothing to paint', () => {
    render_(undefined);
    expect(observers).toHaveLength(0);
  });
});

describe('SectionBackground parallax', () => {
  const parallax = { image: 'a.jpg', parallax: true };

  it('only applies to a background with an image', () => {
    const { container } = render_({ color: 'red', parallax: true });
    expect(wrapOf(container).hasAttribute('data-vantage-section-parallax')).toBe(false);
    expect(layerOf(container).style.transform).toBe('');
  });

  it('extends the layer vertically and flags the wrapper', () => {
    const { container } = render_({ ...parallax, blur: 3 });
    const layer = layerOf(container);
    expect(wrapOf(container).hasAttribute('data-vantage-section-parallax')).toBe(true);
    expect(layer.style.top).toBe('-25%');
    expect(layer.style.bottom).toBe('-25%');
    expect(layer.style.left).toBe('-6px');
    expect(layer.style.right).toBe('-6px');
    expect(layer.style.willChange).toBe('transform');
  });

  it('keeps full-width sides without blur', () => {
    const { container } = render_(parallax);
    const layer = layerOf(container);
    expect(layer.style.left).toBe('0px');
    expect(layer.style.right).toBe('0px');
  });

  it('shifts the layer by the wrapper offset from the viewport center', () => {
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    boxes.wrap = { top: 400, width: 100, height: 200 };
    const { container } = render_(parallax);
    // center 500 equals viewport center: no shift
    expect(layerOf(container).style.transform).toBe('translate3d(0, 0px, 0)');
    boxes.wrap = { top: 900, width: 100, height: 200 };
    fireEvent.scroll(window);
    // offset (900 + 100 - 500) / 1000 = 0.5; shift 0.5 * 200 * 0.2 = 20
    expect(layerOf(container).style.transform).toBe('translate3d(0, 20px, 0)');
    boxes.wrap = { top: -100, width: 100, height: 200 };
    fireEvent(window, new Event('resize'));
    // offset (-100 + 100 - 500) / 1000 = -0.5
    expect(layerOf(container).style.transform).toBe('translate3d(0, -20px, 0)');
  });

  it('follows scrolling of overflow ancestors', () => {
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    boxes.wrap = { top: 400, width: 100, height: 200 };
    const { container } = render(
      <div data-testid="scroller" style={{ overflow: 'auto' }}>
        <SectionBackground background={parallax} />
      </div>,
    );
    boxes.wrap = { top: 900, width: 100, height: 200 };
    fireEvent.scroll(container.firstElementChild!);
    expect(layerOf(container).style.transform).toBe('translate3d(0, 20px, 0)');
  });

  it('ignores scrolling of ancestors that do not scroll', () => {
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    boxes.wrap = { top: 400, width: 100, height: 200 };
    const { container } = render(
      <div>
        <SectionBackground background={parallax} />
      </div>,
    );
    boxes.wrap = { top: 900, width: 100, height: 200 };
    fireEvent.scroll(container.firstElementChild!);
    expect(layerOf(container).style.transform).toBe('translate3d(0, 0px, 0)');
  });

  it('skips the update while the wrapper has no height', () => {
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    boxes.wrap = { top: 400, width: 100, height: 200 };
    const { container } = render_(parallax);
    boxes.wrap = { top: 900, width: 100, height: 0 };
    fireEvent.scroll(window);
    expect(layerOf(container).style.transform).toBe('translate3d(0, 0px, 0)');
  });

  it('stops listening and clears the transform on unmount', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { container, unmount } = render_(parallax);
    const layer = layerOf(container);
    expect(layer.style.transform).not.toBe('');
    const added = add.mock.calls.map(([type]) => type);
    expect(added).toEqual(expect.arrayContaining(['scroll', 'resize']));
    unmount();
    const removed = remove.mock.calls.map(([type]) => type);
    expect(removed).toEqual(expect.arrayContaining(['scroll', 'resize']));
    expect(layer.style.transform).toBe('');
  });

  it('leaves the layer still for users who prefer reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }));
    const { container } = render_(parallax);
    expect(layerOf(container).style.transform).toBe('');
    fireEvent.scroll(window);
    expect(layerOf(container).style.transform).toBe('');
  });

  it('removes the transform when parallax is switched off', () => {
    const { container, rerender } = render_(parallax);
    expect(layerOf(container).style.transform).not.toBe('');
    rerender(<SectionBackground background={{ image: 'a.jpg' }} />);
    expect(layerOf(container).style.transform).toBe('');
    expect(wrapOf(container).hasAttribute('data-vantage-section-parallax')).toBe(false);
  });
});
