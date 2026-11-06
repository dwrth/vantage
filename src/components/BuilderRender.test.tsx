// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveItem, resolveSection, sectionRows } from '../lib/breakpoint';
import { diffLayouts } from '../lib/diff';
import { removeItem } from '../mutations/layout';
import { arbLayout, deepFreeze } from '../test/arbitraries';
import type { Breakpoint, ComponentRegistry, Layout } from '../types';
import { VantageBuilder } from './Builder';

const renderer = ({ item }: { item: { id: string } }) => <span data-item={item.id} />;
const components: ComponentRegistry = {
  text: { component: renderer, defaults: { w: 2, h: 1 } },
  image: { component: renderer, defaults: { w: 2, h: 1 } },
  button: { component: renderer, defaults: { w: 2, h: 1 } },
};

beforeEach(() => {
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
  vi.unstubAllGlobals();
});

const arbLayoutAndBreakpoint = arbLayout({ maxSections: 3, maxItems: 5 }).chain((layout) =>
  fc.record({
    layout: fc.constant(deepFreeze(layout)),
    breakpoint: fc.constantFrom(...layout.breakpoints),
  }),
);

function visibleKeys(layout: Layout, breakpoint: Breakpoint): string[] {
  return layout.sections.flatMap((section) =>
    section.items
      .filter((item) => !resolveItem(item, section, breakpoint, layout.breakpoints).hidden)
      .map((item) => `${section.id}:${item.id}`),
  );
}

function renderedKeys(): string[] {
  return Array.from(document.querySelectorAll('[data-vantage-block][role="group"]')).map(
    (el) => el.getAttribute('data-vantage-block')!,
  );
}

function renderBuilder(layout: Layout, breakpoint: Breakpoint, onChange = vi.fn()) {
  return render(
    <VantageBuilder
      value={layout}
      onChange={onChange}
      components={components}
      activeBreakpoint={breakpoint}
    />,
  );
}

describe('VantageBuilder renders any valid layout', () => {
  it('renders every visible block exactly once and no hidden block', () => {
    fc.assert(
      fc.property(arbLayoutAndBreakpoint, ({ layout, breakpoint }) => {
        cleanup();
        renderBuilder(layout, breakpoint);
        expect(renderedKeys().sort()).toEqual(visibleKeys(layout, breakpoint).sort());
        expect(document.querySelectorAll('[data-vantage-section]')).toHaveLength(
          layout.sections.length,
        );
      }),
      { numRuns: 40 },
    );
  });

  it('maps section columns, gaps, padding and rows to the grid CSS', () => {
    fc.assert(
      fc.property(arbLayoutAndBreakpoint, ({ layout, breakpoint }) => {
        cleanup();
        renderBuilder(layout, breakpoint);
        for (const section of layout.sections) {
          if (section.arrangement) continue;
          const resolved = resolveSection(section, breakpoint, layout.breakpoints);
          const grid = document.querySelector<HTMLElement>(
            `[data-vantage-section-frame="${section.id}"]`,
          )!;
          expect(grid.style.getPropertyValue('--cols')).toBe(String(resolved.columns));
          expect(grid.style.getPropertyValue('--col-gap-px')).toBe(`${resolved.colGap}px`);
          expect(grid.style.getPropertyValue('--row-gap-px')).toBe(`${resolved.rowGap}px`);
          expect(grid.style.getPropertyValue('--section-pad-top-px')).toBe(
            `${resolved.paddingTop}px`,
          );
          expect(grid.style.getPropertyValue('--section-pad-bottom-px')).toBe(
            `${resolved.paddingBottom}px`,
          );
          const rows = sectionRows(section, breakpoint, layout.breakpoints);
          expect(grid.style.gridTemplateRows).toBe(`repeat(${rows}, minmax(var(--row-px), auto))`);
        }
      }),
      { numRuns: 40 },
    );
  });

  it('places every free-grid block on its resolved cells', () => {
    fc.assert(
      fc.property(arbLayoutAndBreakpoint, ({ layout, breakpoint }) => {
        cleanup();
        renderBuilder(layout, breakpoint);
        for (const section of layout.sections) {
          if (section.arrangement) continue;
          for (const item of section.items) {
            const placement = resolveItem(item, section, breakpoint, layout.breakpoints);
            if (placement.hidden) continue;
            const body = document.querySelector<HTMLElement>(
              `[data-vantage-block="${section.id}:${item.id}"][role="group"]`,
            )!;
            expect(body.style.gridColumn).toBe(
              item.fullBleed ? '1 / -1' : `${placement.x + 2} / span ${placement.w}`,
            );
            expect(body.style.gridRow).toBe(`${placement.y + 1} / span ${placement.h}`);
          }
        }
      }),
      { numRuns: 40 },
    );
  });

  it('reports a delete through onChange without changing what it renders', () => {
    const arb = arbLayoutAndBreakpoint.filter(
      ({ layout, breakpoint }) =>
        visibleKeys(layout, breakpoint).length > 0 &&
        layout.sections.some((s) => !s.arrangement && s.items.length > 0),
    );
    fc.assert(
      fc.property(arb, fc.nat(), ({ layout, breakpoint }, pick) => {
        cleanup();
        const onChange = vi.fn();
        const { rerender } = renderBuilder(layout, breakpoint, onChange);
        const keys = visibleKeys(layout, breakpoint);
        const key = keys[pick % keys.length]!;
        const [sectionId, itemId] = key.split(':') as [string, string];
        const block = document.querySelector<HTMLElement>(
          `[data-vantage-block="${key}"]:not([role="group"])`,
        )!;
        const del = block.querySelector<HTMLElement>('button[aria-label^="Delete"]')!;
        fireEvent.click(del);
        expect(onChange).toHaveBeenCalledTimes(1);
        const [next, changeset] = onChange.mock.calls[0]!;
        const expected = removeItem(layout, sectionId, itemId);
        expect(next).toEqual(expected);
        expect(changeset).toEqual(diffLayouts(layout, expected));
        expect(renderedKeys().sort()).toEqual([...keys].sort());
        rerender(
          <VantageBuilder
            value={next}
            onChange={onChange}
            components={components}
            activeBreakpoint={breakpoint}
          />,
        );
        expect(renderedKeys().sort()).toEqual(keys.filter((k) => k !== key).sort());
      }),
      { numRuns: 30 },
    );
  });

  it('selects exactly the block pressed', () => {
    const arb = arbLayoutAndBreakpoint.filter(
      ({ layout, breakpoint }) => visibleKeys(layout, breakpoint).length > 0,
    );
    fc.assert(
      fc.property(arb, fc.nat(), ({ layout, breakpoint }, pick) => {
        cleanup();
        const onSelectionChange = vi.fn();
        render(
          <VantageBuilder
            value={layout}
            onChange={vi.fn()}
            components={components}
            activeBreakpoint={breakpoint}
            onSelectionChange={onSelectionChange}
          />,
        );
        const keys = visibleKeys(layout, breakpoint);
        const key = keys[pick % keys.length]!;
        const [sectionId, itemId] = key.split(':') as [string, string];
        fireEvent.pointerDown(
          document.querySelector(`[data-vantage-block="${key}"][role="group"]`)!,
        );
        expect(onSelectionChange).toHaveBeenLastCalledWith({ sectionId, itemId });
        const selected = Array.from(
          document.querySelectorAll('[data-vantage-block][class*="chrome--active"]'),
        ).map((el) => el.getAttribute('data-vantage-block'));
        expect(selected).toEqual([key]);
      }),
      { numRuns: 30 },
    );
  });
});
