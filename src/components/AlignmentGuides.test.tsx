// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentRegistry, Layout } from '../types';
import { VantageBuilder } from './Builder';

/*
 * jsdom has no layout: the grid reports 1152px wide (12 columns of 96px, no gaps or padding),
 * so a column is 96px and a row 48px. The dragged block reports its own rect for dnd-kit.
 */
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
  if (this.hasAttribute('data-vantage-section-frame')) return rect(0, 0, 1152, 192);
  if (this.getAttribute('data-vantage-block') === 's:a' && this.getAttribute('role') === 'group') {
    return rect(0, 0, 192, 48);
  }
  return rect(0, 0, 0, 0);
}

beforeEach(() => {
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

const components: ComponentRegistry = {
  block: { component: () => null, defaults: { w: 2, h: 1 } },
};

function layoutWith(items: Layout['sections'][number]['items']): Layout {
  return {
    breakpoints: ['desktop'],
    breakpointWidths: {},
    breakpointPreviewWidths: {},
    sections: [
      {
        id: 's',
        columns: 12,
        colGap: 0,
        rowGap: 0,
        paddingTop: 0,
        paddingBottom: 0,
        rows: 4,
        items,
      },
    ],
  };
}

const pointer = (x: number, y: number) => ({
  clientX: x,
  clientY: y,
  isPrimary: true,
  button: 0,
  pointerId: 1,
});

const guides = () =>
  [...document.querySelectorAll<HTMLElement>('[data-vantage-guide]')].map((el) => ({
    orientation: el.getAttribute('data-vantage-guide'),
    left: el.style.left,
    top: el.style.top,
  }));

describe('alignment guides while resizing', () => {
  const layout = layoutWith([
    { id: 'a', kind: 'block', x: 0, y: 0, w: 2, h: 1 },
    { id: 'b', kind: 'block', x: 0, y: 2, w: 4, h: 2 },
  ]);

  it('shows edge guides during the resize and removes them after', () => {
    render(<VantageBuilder value={layout} onChange={() => {}} components={components} />);
    expect(guides()).toEqual([]);

    const east = document.querySelector('[data-vantage-block="s:a"] [data-edge="e"]')!;
    fireEvent.pointerDown(east, pointer(192, 24));
    // Before moving: the left edges already line up.
    expect(guides()).toEqual([{ orientation: 'vertical', left: '0px', top: '0px' }]);

    // Two columns wider: now as wide as b, so left, centre and right line up.
    fireEvent.pointerMove(window, pointer(384, 24));
    expect(guides().map((g) => g.left)).toEqual(['0px', '192px', '384px']);

    fireEvent.pointerUp(window, pointer(384, 24));
    expect(guides()).toEqual([]);
  });
});

describe('alignment guides while dragging', () => {
  it('shows the section centre for a centred block and clears it on drop', () => {
    const onChange = vi.fn();
    render(
      <VantageBuilder
        value={layoutWith([{ id: 'a', kind: 'block', x: 0, y: 0, w: 2, h: 1 }])}
        onChange={onChange}
        components={components}
      />,
    );
    const handle = document.querySelector('[data-vantage-drag-handle]') as HTMLElement;
    fireEvent.pointerDown(handle, pointer(20, 20));
    fireEvent.pointerMove(document, pointer(30, 20));
    // Five columns right: x 5..7, centred on the 12-column section.
    fireEvent.pointerMove(document, pointer(20 + 5 * 96, 20));
    expect(guides()).toEqual([{ orientation: 'vertical', left: '576px', top: '0px' }]);
    expect(document.querySelector('[class*="alignment-guide--section"]')).not.toBeNull();

    fireEvent.pointerUp(document, pointer(20 + 5 * 96, 20));
    expect(guides()).toEqual([]);
    expect(onChange.mock.calls.at(-1)?.[0].sections[0].items[0]).toMatchObject({ x: 5, y: 0 });
  });
});

describe('content alignment in the builder', () => {
  it('marks the block body with the alignment of the active breakpoint', () => {
    render(
      <VantageBuilder
        value={layoutWith([
          { id: 'a', kind: 'block', x: 0, y: 0, w: 2, h: 1, verticalAlign: 'end' },
          { id: 'b', kind: 'block', x: 4, y: 0, w: 2, h: 1 },
        ])}
        onChange={() => {}}
        components={components}
      />,
    );
    const body = (id: string) =>
      document.querySelector(`[data-vantage-block="s:${id}"][role="group"]`)!;
    expect(body('a').getAttribute('data-valign')).toBe('end');
    expect(body('b').hasAttribute('data-valign')).toBe(false);
  });
});
