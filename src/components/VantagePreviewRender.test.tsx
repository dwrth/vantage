// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveItem } from '../lib/breakpoint';
import { arbLayout, deepFreeze } from '../test/arbitraries';
import type { Breakpoint, ComponentRegistry, GridItem, Layout } from '../types';
import { VantagePreview } from './VantagePreview';

const renderer = ({ item }: { item: GridItem }) => (
  <span data-item={item.id}>{String((item.data as { title?: string } | undefined)?.title)}</span>
);
const components: ComponentRegistry = {
  text: { component: renderer, defaults: { w: 2, h: 1 } },
  image: { component: renderer, defaults: { w: 2, h: 1 } },
  button: { component: renderer, defaults: { w: 2, h: 1 } },
};

let observers: { cb: ResizeObserverCallback; target?: Element }[] = [];

beforeEach(() => {
  observers = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      entry: { cb: ResizeObserverCallback; target?: Element };
      constructor(cb: ResizeObserverCallback) {
        this.entry = { cb };
        observers.push(this.entry);
      }
      observe(target: Element) {
        this.entry.target = target;
      }
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function resizeTo(width: number) {
  act(() => {
    for (const { cb, target } of observers) {
      cb([{ contentRect: { width }, target } as unknown as ResizeObserverEntry], {} as never);
    }
  });
}

function renderedIds(): string[] {
  return Array.from(document.querySelectorAll('[data-item]')).map(
    (el) => el.getAttribute('data-item')!,
  );
}

function hiddenOn(layout: Layout, item: GridItem, bps: Breakpoint[]): Breakpoint[] {
  const section = layout.sections.find((s) => s.items.includes(item))!;
  return bps.filter((bp) => resolveItem(item, section, bp, layout.breakpoints).hidden);
}

const arbFrozenLayout = arbLayout({ maxSections: 3, maxItems: 5 }).map(deepFreeze);

describe('VantagePreview renders any valid layout', () => {
  it('renders each block visible on a forced breakpoint exactly once', () => {
    const arb = arbFrozenLayout.chain((layout) =>
      fc.record({ layout: fc.constant(layout), bp: fc.constantFrom(...layout.breakpoints) }),
    );
    fc.assert(
      fc.property(arb, ({ layout, bp }) => {
        cleanup();
        render(<VantagePreview value={layout} components={components} breakpoint={bp} />);
        const expected = layout.sections.flatMap((s) =>
          s.items.filter((item) => hiddenOn(layout, item, [bp]).length === 0).map((i) => i.id),
        );
        expect(renderedIds().sort()).toEqual(expected.sort());
        expect(document.querySelector('style')).toBeNull();
      }),
      { numRuns: 60 },
    );
  });

  it('in responsive mode renders each block once and marks the breakpoints it is hidden on', () => {
    fc.assert(
      fc.property(arbFrozenLayout, (layout) => {
        cleanup();
        render(<VantagePreview value={layout} components={components} />);
        const bps = layout.breakpoints;
        const expected = layout.sections
          .flatMap((s) => s.items)
          .filter((item) => hiddenOn(layout, item, bps).length < bps.length);
        expect(renderedIds().sort()).toEqual(expected.map((i) => i.id).sort());
        if (bps.length === 1) return;
        expect(document.querySelector('style')).not.toBeNull();
        for (const item of expected) {
          const wrapper = document.querySelector(`[data-item="${item.id}"]`)!.parentElement!;
          const hidden = hiddenOn(layout, item, bps);
          expect(wrapper.getAttribute('data-vp-hidden')).toBe(
            hidden.length > 0 ? hidden.join(' ') : null,
          );
        }
      }),
      { numRuns: 60 },
    );
  });
});

describe('VantagePreview breakpoint from the container width', () => {
  const layout: Layout = {
    breakpoints: ['desktop', 'tablet', 'mobile'],
    breakpointWidths: { tablet: 1023, mobile: 640 },
    breakpointPreviewWidths: {},
    sections: [
      {
        id: 's',
        columns: 12,
        colGap: 8,
        rowGap: 8,
        items: [{ id: 'a', kind: 'text', x: 0, y: 0, w: 4, h: 2, data: { title: 'desk' } }],
        overrides: {
          tablet: { items: { a: { data: { title: 'tab' } } } },
          mobile: { items: { a: { data: { title: 'mob' } } } },
        },
      },
    ],
  };

  it('uses desktop data until the container is measured', () => {
    render(<VantagePreview value={layout} components={components} />);
    expect(document.querySelector('[data-item="a"]')!.textContent).toBe('desk');
  });

  it.each([
    [1400, 'desk'],
    [900, 'tab'],
    [400, 'mob'],
  ])('at %ipx resolves the data of the matching breakpoint', (width, title) => {
    render(<VantagePreview value={layout} components={components} />);
    resizeTo(width);
    expect(document.querySelector('[data-item="a"]')!.textContent).toBe(title);
    expect(document.querySelector('style')).not.toBeNull();
  });

  it('keeps a forced breakpoint whatever the width', () => {
    render(<VantagePreview value={layout} components={components} breakpoint="tablet" />);
    resizeTo(400);
    expect(document.querySelector('[data-item="a"]')!.textContent).toBe('tab');
  });

  it('ignores a forced breakpoint that is not enabled', () => {
    render(
      <VantagePreview
        value={{ ...layout, breakpoints: ['desktop', 'mobile'] }}
        components={components}
        breakpoint="tablet"
      />,
    );
    resizeTo(1400);
    expect(document.querySelector('[data-item="a"]')!.textContent).toBe('desk');
    expect(document.querySelector('style')).not.toBeNull();
  });
});
