// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    { id: 'b', label: 'Footer', columns: 12, colGap: 8, rowGap: 8, rows: 4, items: [] },
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

const order = (onChange: ReturnType<typeof vi.fn>) =>
  (onChange.mock.calls.at(-1)![0] as Layout).sections.map((s) => s.label);

describe('section actions', () => {
  it('moves sections up and down and disables moves past the ends', () => {
    const onChange = vi.fn();
    render(<VantageBuilder value={layout} onChange={onChange} components={components} />);
    expect(screen.getByRole('button', { name: 'Move Hero up' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Move Footer down' })).toHaveProperty(
      'disabled',
      true,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Move Footer up' }));
    expect(order(onChange)).toEqual(['Footer', 'Hero']);
    fireEvent.click(screen.getByRole('button', { name: 'Move Hero down' }));
    expect(order(onChange)).toEqual(['Footer', 'Hero']);
  });

  it('duplicates a section, or lets the host do it', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <VantageBuilder value={layout} onChange={onChange} components={components} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Hero' }));
    expect(order(onChange)).toEqual(['Hero', 'Hero', 'Footer']);

    const onDuplicateSection = vi.fn();
    onChange.mockClear();
    rerender(
      <VantageBuilder
        value={layout}
        onChange={onChange}
        components={components}
        onDuplicateSection={onDuplicateSection}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Footer' }));
    expect(onDuplicateSection).toHaveBeenCalledWith('b');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows a save button only when the host handles it', () => {
    const { rerender } = render(
      <VantageBuilder value={layout} onChange={() => {}} components={components} />,
    );
    expect(screen.queryByRole('button', { name: 'Save Hero as template' })).toBeNull();

    const onSaveSection = vi.fn();
    const onChange = vi.fn();
    rerender(
      <VantageBuilder
        value={layout}
        onChange={onChange}
        components={components}
        onSaveSection={onSaveSection}
        sectionActionLabels={{ save: (section) => `${section.label} als Vorlage speichern` }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Footer als Vorlage speichern' }));
    expect(onSaveSection).toHaveBeenCalledWith('b');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('inserts an empty section above a section', () => {
    const onChange = vi.fn();
    render(<VantageBuilder value={layout} onChange={onChange} components={components} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add section above Footer' }));
    const next = onChange.mock.calls[0][0] as Layout;
    expect(next.sections.map((s) => s.id)[0]).toBe('a');
    expect(next.sections[2].id).toBe('b');
    expect(next.sections[1].items).toEqual([]);
  });

  it('uses translated labels and can be turned off', () => {
    const { rerender } = render(
      <VantageBuilder
        value={layout}
        onChange={() => {}}
        components={components}
        sectionActionLabels={{
          moveUp: (section) => `${section.label} nach oben verschieben`,
          toolbar: () => 'Abschnittsaktionen',
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Footer nach oben verschieben' })).toBeTruthy();
    expect(screen.getAllByRole('toolbar', { name: 'Abschnittsaktionen' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Duplicate Hero' })).toBeTruthy();

    rerender(
      <VantageBuilder
        value={layout}
        onChange={() => {}}
        components={components}
        showSectionActions={false}
      />,
    );
    expect(screen.queryAllByRole('toolbar')).toEqual([]);
  });
});
