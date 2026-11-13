// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addItem, addSection, insertSection } from '../mutations/layout';
import type { ComponentRegistry, Layout } from '../types';
import { VantageBuilder } from './Builder';

const components: ComponentRegistry = {
  block: { component: () => null, defaults: { w: 1, h: 1 } },
};

const layout: Layout = {
  breakpoints: ['desktop'],
  breakpointWidths: {},
  breakpointPreviewWidths: {},
  sections: [{ id: 'a', columns: 12, colGap: 8, rowGap: 8, rows: 4, items: [] }],
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

describe('default labels in mutations', () => {
  it('keeps the English defaults without options', () => {
    expect(addSection(layout).layout.sections[1].label).toBe('Section 2');
    const withItem = addItem(layout, 'a', 'block');
    expect(withItem.sections[0].items[0].label).toBe('Block 1');
  });

  it('names new sections and blocks through the host factories', () => {
    const label = (n: number) => `Abschnitt ${n}`;
    expect(insertSection(layout, 0, { label }).layout.sections[0].label).toBe('Abschnitt 2');
    expect(addSection(layout, { label }).layout.sections[1].label).toBe('Abschnitt 2');
    const next = addItem(layout, 'a', 'block', {
      label: 'Komponente',
      formatLabel: (base, n) => `${base} Nr. ${n}`,
    });
    expect(next.sections[0].items[0].label).toBe('Komponente Nr. 1');
  });
});

describe('defaultLabels prop', () => {
  it('labels a new section at creation time', () => {
    const onChange = vi.fn();
    render(
      <VantageBuilder
        components={components}
        value={{ ...layout, sections: [] }}
        onChange={onChange}
        defaultLabels={{ section: (n) => `Abschnitt ${n}` }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add section' }));
    const next = onChange.mock.calls.at(-1)![0] as Layout;
    expect(next.sections[0].label).toBe('Abschnitt 1');
  });

  it('translates the resize edge and unnamed section fallbacks', () => {
    render(
      <VantageBuilder
        components={components}
        value={layout}
        onChange={vi.fn()}
        defaultLabels={{
          unnamedSection: 'Abschnitt',
          resizeSectionHeight: (name) => `Höhe von ${name} anpassen`,
        }}
      />,
    );
    expect(screen.getByLabelText('Höhe von Abschnitt anpassen')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Duplicate Abschnitt' })).toBeTruthy();
  });

  it('translates the empty canvas', () => {
    render(
      <VantageBuilder
        components={components}
        value={{ ...layout, sections: [] }}
        onChange={vi.fn()}
        defaultLabels={{ noSections: 'Keine Abschnitte', addSection: 'Abschnitt hinzufügen' }}
      />,
    );
    expect(screen.getByText('Keine Abschnitte')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Abschnitt hinzufügen' })).toBeTruthy();
  });
});
