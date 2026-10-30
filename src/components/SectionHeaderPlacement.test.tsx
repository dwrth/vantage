// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentRegistry, Layout } from '../types';
import { VantageBuilder } from './Builder';

const components: ComponentRegistry = {
  block: { component: () => null, defaults: { w: 1, h: 1 } },
};

const layout: Layout = {
  breakpoints: ['desktop', 'tablet'],
  breakpointWidths: {},
  breakpointPreviewWidths: { tablet: 700 },
  sections: [{ id: 'a', label: 'Hero', columns: 12, colGap: 8, rowGap: 8, rows: 4, items: [] }],
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

const renderWith = (placement?: 'section' | 'canvas') =>
  render(
    <VantageBuilder
      value={layout}
      onChange={() => {}}
      components={components}
      activeBreakpoint="tablet"
      sectionHeaderPlacement={placement}
      renderSectionHeader={({ section }) => <div data-testid="header">{section.label}</div>}
    />,
  );

describe('sectionHeaderPlacement', () => {
  it('renders the header as the first child of the section by default', () => {
    renderWith();
    const header = screen.getByTestId('header');
    const section = header.closest('[data-vantage-section]');
    expect(header.parentElement).toBe(section);
    expect(section?.firstElementChild).toBe(header);
  });

  it('renders the header above the grid inside the breakpoint-width canvas frame', () => {
    renderWith('canvas');
    const header = screen.getByTestId('header');
    const grid = document.querySelector('[data-vantage-section-frame="a"]') as HTMLElement;
    const frame = header.parentElement as HTMLElement;
    expect(frame.style.maxWidth).toBe('700px');
    expect(frame.firstElementChild).toBe(header);
    // The grid and its container-query wrapper (the boxes the grid math measures) stay header-free.
    expect(grid.contains(header)).toBe(false);
    expect(grid.parentElement?.contains(header)).toBe(false);
    expect(frame.contains(grid)).toBe(true);
  });
});
