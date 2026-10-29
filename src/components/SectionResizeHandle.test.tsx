// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentRegistry, Layout } from '../types';
import { VantageBuilder } from './Builder';

const components: ComponentRegistry = {
  block: { component: () => null, defaults: { w: 1, h: 1 } },
};

const layout: Layout = {
  breakpoints: ['desktop'],
  breakpointWidths: {},
  breakpointPreviewWidths: {},
  sections: [
    { id: 'a', label: 'Hero', columns: 12, colGap: 8, rowGap: 8, rows: 4, items: [] },
    { id: 'b', columns: 12, colGap: 8, rowGap: 8, rows: 4, items: [] },
  ],
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

const labels = () => screen.getAllByRole('separator').map((el) => el.getAttribute('aria-label'));

describe('section resize edge label', () => {
  it('defaults to an English label naming the section', () => {
    render(<VantageBuilder value={layout} onChange={() => {}} components={components} />);
    expect(labels()).toEqual(['Resize Hero height', 'Resize section height']);
  });

  it('uses sectionResizeLabel when given', () => {
    render(
      <VantageBuilder
        value={layout}
        onChange={() => {}}
        components={components}
        sectionResizeLabel={(section) => `Höhe von ${section.label ?? 'Abschnitt'} ändern`}
      />,
    );
    expect(labels()).toEqual(['Höhe von Hero ändern', 'Höhe von Abschnitt ändern']);
  });
});
