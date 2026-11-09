// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentRegistry, Layout } from '../types';
import { VantageBuilder } from './Builder';

/*
 * jsdom has no layout, so the page geometry is mocked: every grid and block reports a rect in page
 * (content) coordinates minus the current `window.scrollY`, like a real page scrolled by the window.
 * With 12 columns of 96px (rowMax 48) and no gaps or padding, a row is 48px and a section of 4 rows
 * is 192px tall. Between two grids sits a 60px band: the next section's header bar.
 *
 *   a: 0..192   bar   b: 252..444   bar   c: 504..696
 */
const GRID_TOP: Record<string, number> = { a: 0, b: 252, c: 504 };
const GRID_W = 1152;
const GRID_H = 192;
const BLOCK = { left: 0, top: 0, width: 192, height: 48 }; // a:blk at x0 y0 w2 h1

let scrollY = 0;

function rect(left: number, top: number, width: number, height: number): DOMRect {
  const r = {
    left,
    top,
    width,
    height,
    x: left,
    y: top,
    right: left + width,
    bottom: top + height,
  };
  return { ...r, toJSON: () => r } as DOMRect;
}

function mockRect(this: HTMLElement): DOMRect {
  const frame = this.getAttribute('data-vantage-section-frame');
  if (frame && frame in GRID_TOP) return rect(0, GRID_TOP[frame] - scrollY, GRID_W, GRID_H);
  if (
    this.getAttribute('data-vantage-block') === 'a:blk' &&
    this.getAttribute('role') === 'group'
  ) {
    return rect(BLOCK.left, BLOCK.top - scrollY, BLOCK.width, BLOCK.height);
  }
  return rect(0, 0, 0, 0);
}

function scrollTo(y: number) {
  scrollY = y;
  act(() => {
    // Like a browser: a window scroll targets the document and bubbles to the window.
    document.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
}

const components: ComponentRegistry = {
  block: { component: () => null, defaults: { w: 2, h: 1 } },
};

const section = (id: string, items: Layout['sections'][number]['items'] = []) => ({
  id,
  columns: 12,
  colGap: 0,
  rowGap: 0,
  paddingTop: 0,
  paddingBottom: 0,
  rows: 4,
  items,
});

const layout: Layout = {
  breakpoints: ['desktop'],
  breakpointWidths: {},
  sections: [
    section('a', [{ id: 'blk', kind: 'block', x: 0, y: 0, w: 2, h: 1 }]),
    section('b'),
    section('c'),
  ],
};

beforeEach(() => {
  scrollY = 0;
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
  Object.defineProperty(window, 'pageYOffset', { configurable: true, get: () => scrollY });
  // jsdom has no scrollingElement; dnd-kit needs it to see the window as a scroll container.
  Object.defineProperty(document, 'scrollingElement', {
    configurable: true,
    get: () => document.documentElement,
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(mockRect);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderBuilder(props: Partial<Parameters<typeof VantageBuilder>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <VantageBuilder
      value={layout}
      onChange={onChange}
      components={components}
      renderSectionHeader={() => <div data-testid="bar" />}
      sectionHeaderPlacement="canvas"
      {...props}
    />,
  );
  return { onChange };
}

const pointer = (x: number, y: number) => ({
  clientX: x,
  clientY: y,
  isPrimary: true,
  button: 0,
  pointerId: 1,
});

/** Grab the block's handle at (20, 20), i.e. 20px right of and below the block's top-left. */
function startDrag() {
  const handle = document.querySelector('[data-vantage-drag-handle]') as HTMLElement;
  fireEvent.pointerDown(handle, pointer(20, 20));
  fireEvent.pointerMove(document, pointer(20, 30));
}

function moveTo(x: number, y: number) {
  fireEvent.pointerMove(document, pointer(x, y));
}

/** `{ section, x, y }` of the visible drop ghost, or null. */
function ghost() {
  const el = document.querySelector('[data-vantage-drop-target]');
  if (!el) return null;
  const g = el.querySelector('[class*="drop-ghost"]') as HTMLElement | null;
  if (!g) return null;
  const col = /^(\d+)/.exec(g.style.gridColumn)?.[1];
  const row = /^(\d+)/.exec(g.style.gridRow)?.[1];
  return {
    section: el.getAttribute('data-vantage-section'),
    x: Number(col) - 2,
    y: Number(row) - 1,
  };
}

describe('dragging a block between sections', () => {
  it('targets the section under the pointer', () => {
    renderBuilder();
    startDrag();
    // Pointer at page y 320 (b), block top 300 -> 48px into b -> row 1.
    moveTo(20, 320);
    expect(ghost()).toEqual({ section: 'b', x: 0, y: 1 });
  });

  it('keeps the target under the pointer when the page scrolls during the drag', () => {
    renderBuilder();
    startDrag();
    moveTo(20, 320);
    // The page scrolls 120px without the pointer moving: the pointer now sits on page y 440,
    // still in b; the block top is at page y 420 -> 168px into b -> row 3 (last row).
    scrollTo(120);
    expect(ghost()).toEqual({ section: 'b', x: 0, y: 3 });
    // Moving afterwards uses the scrolled geometry too: client 200 = page 320 -> b row 1.
    moveTo(20, 200);
    expect(ghost()).toEqual({ section: 'b', x: 0, y: 1 });
  });

  it('drops where the ghost was shown after scrolling', () => {
    const { onChange } = renderBuilder();
    startDrag();
    moveTo(20, 320);
    scrollTo(120);
    moveTo(20, 200);
    fireEvent.pointerUp(document, pointer(20, 200));
    const next = onChange.mock.calls.at(-1)?.[0] as Layout;
    const moved = next.sections.find((s) => s.id === 'b')?.items[0];
    expect(moved).toMatchObject({ x: 0, y: 1 });
  });

  it('targets the section below at row 0 while the pointer is on its header bar', () => {
    renderBuilder();
    startDrag();
    moveTo(20, 320);
    // Page y 470: the bar between b (ends 444) and c (starts 504).
    moveTo(20, 470);
    expect(ghost()).toEqual({ section: 'c', x: 0, y: 0 });
  });

  it('drops on a header bar into the top of the section below instead of snapping back', () => {
    const { onChange } = renderBuilder();
    startDrag();
    moveTo(20, 230); // bar of b, right below a
    expect(ghost()).toEqual({ section: 'b', x: 0, y: 0 });
    fireEvent.pointerUp(document, pointer(20, 230));
    const next = onChange.mock.calls.at(-1)?.[0] as Layout;
    expect(next.sections.find((s) => s.id === 'a')?.items).toHaveLength(0);
    expect(next.sections.find((s) => s.id === 'b')?.items[0]).toMatchObject({ x: 0, y: 0 });
  });

  it('never shows a frame without target while crossing from one section to the next', () => {
    renderBuilder();
    startDrag();
    for (let y = 260; y <= 690; y += 10) {
      moveTo(20, y);
      expect(ghost(), `pointer at ${y}`).not.toBeNull();
    }
  });
});

describe('dragging a new block from a palette (external drop)', () => {
  const drag = (type: string, target: Element, x: number, y: number) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
      clientX: x,
      clientY: y,
      dataTransfer: { dropEffect: 'none', getData: () => '' },
    });
    act(() => {
      target.dispatchEvent(event);
    });
    return event;
  };

  it('targets the section below at row 0 over a header bar and accepts the drop there', () => {
    const onExternalDrop = vi.fn();
    renderBuilder({ externalDrag: { w: 2, h: 1 }, onExternalDrop });
    const bar = document.querySelectorAll('[data-testid="bar"]')[2];
    // Over the bar of c (page y 470); the 2x1 ghost is centered on the pointer.
    const over = drag('dragover', bar, 96, 470);
    expect(over.defaultPrevented).toBe(true);
    expect(ghost()).toEqual({ section: 'c', x: 0, y: 0 });
    const drop = drag('drop', bar, 96, 470);
    expect(drop.defaultPrevented).toBe(true);
    expect(onExternalDrop).toHaveBeenCalledWith(
      expect.objectContaining({ sectionId: 'c', x: 0, y: 0 }),
    );
  });

  it('updates the target when the page scrolls while the pointer rests', () => {
    renderBuilder({ externalDrag: { w: 2, h: 1 }, onExternalDrop: vi.fn() });
    const grid = document.querySelector('[data-vantage-section-frame="b"]')!;
    // Ghost (48px tall) centered on page y 324 -> top 300 -> 48px into b -> row 1.
    drag('dragover', grid, 96, 324);
    expect(ghost()).toEqual({ section: 'b', x: 0, y: 1 });
    scrollTo(192);
    // Same client point, now page y 516 -> c, ghost top 492 -> above c -> row 0.
    expect(ghost()).toEqual({ section: 'c', x: 0, y: 0 });
  });
});

describe('dropping into an arrangement section', () => {
  const flowLayout: Layout = {
    ...layout,
    sections: [
      layout.sections[0]!,
      {
        ...section('b', [
          { id: 'p', kind: 'block', x: 0, y: 0, w: 1, h: 1 },
          { id: 'q', kind: 'block', x: 0, y: 0, w: 1, h: 1 },
        ]),
        arrangement: { preset: 'three' },
      },
      section('c'),
    ],
  };
  const slot = (sectionId: string) =>
    document
      .querySelector(`[data-vantage-section="${sectionId}"]`)
      ?.querySelector<HTMLElement>('[data-vantage-drop-slot]') ?? null;

  it('previews a dragged block in a slot and drops it at that index', () => {
    const { onChange } = renderBuilder({ value: flowLayout });
    startDrag();
    // Every block of b reports an empty rect at the origin: the pointer lands behind the first.
    moveTo(20, 320);
    expect(slot('b')?.getAttribute('data-vantage-drop-slot')).toBe('active');
    expect(slot('b')?.style.gridRow).toBe('1');
    expect(slot('b')?.style.gridColumn).toBe('6 / span 4');
    moveTo(22, 322);
    expect(slot('b')?.style.gridColumn).toBe('6 / span 4');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(document, pointer(22, 322));
    const next = onChange.mock.calls.at(-1)?.[0] as Layout;
    expect(next.sections[1]!.items.map((i) => i.id)).toEqual(['p', 'blk', 'q']);
    expect(slot('b')).toBeNull();
  });

  it('shows inactive slots while a block is dragged elsewhere and none after a cancel', () => {
    renderBuilder({ value: flowLayout });
    startDrag();
    moveTo(20, 100);
    expect(slot('b')?.getAttribute('data-vantage-drop-slot')).toBe('inactive');
    moveTo(20, 320);
    expect(slot('b')?.getAttribute('data-vantage-drop-slot')).toBe('active');
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(slot('b')).toBeNull();
  });

  it('previews a palette item and reports the index on drop', () => {
    const onExternalDrop = vi.fn();
    renderBuilder({ value: flowLayout, externalDrag: { w: 2, h: 1 }, onExternalDrop });
    expect(slot('b')?.getAttribute('data-vantage-drop-slot')).toBe('inactive');
    const grid = document.querySelector('[data-vantage-section-frame="b"]')!;
    const over = new Event('dragover', { bubbles: true, cancelable: true });
    Object.assign(over, { clientX: 96, clientY: 324, dataTransfer: { dropEffect: 'none' } });
    act(() => {
      grid.dispatchEvent(over);
    });
    expect(slot('b')?.getAttribute('data-vantage-drop-slot')).toBe('active');
    expect(slot('b')?.style.minHeight).toBe('48px');
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.assign(drop, { clientX: 96, clientY: 324, dataTransfer: { getData: () => '' } });
    act(() => {
      grid.dispatchEvent(drop);
    });
    expect(onExternalDrop).toHaveBeenCalledWith(
      expect.objectContaining({ sectionId: 'b', index: 1 }),
    );
  });
});

describe('a dragged block whose section moves', () => {
  it('cancels the shift of its section while the drag runs', () => {
    renderBuilder();
    startDrag();
    const frame = document.querySelector<HTMLElement>('[data-vantage-section-frame="a"]')!;
    GRID_TOP.a = 40;
    try {
      moveTo(20, 320);
      expect(frame.style.getPropertyValue('--vantage-drag-shift-y')).toBe('-40px');
    } finally {
      GRID_TOP.a = 0;
    }
    fireEvent.pointerUp(document, pointer(20, 320));
    expect(frame.style.getPropertyValue('--vantage-drag-shift-y')).toBe('');
  });
});
