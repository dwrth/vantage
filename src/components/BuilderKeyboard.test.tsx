// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVantageHistory } from '../hooks/useVantageHistory';
import type { ComponentRegistry, GridItem, Layout } from '../types';
import { VantageBuilder, type VantageBuilderProps } from './Builder';

const components: ComponentRegistry = {
  block: { component: () => null, defaults: { w: 1, h: 1 } },
};

const item = (id: string, x: number, y: number, extra: Partial<GridItem> = {}): GridItem => ({
  id,
  kind: 'block',
  label: id.toUpperCase(),
  x,
  y,
  w: 2,
  h: 2,
  ...extra,
});

// Stacking order (items) differs from reading order on purpose: C is drawn first.
const initial: Layout = {
  breakpoints: ['desktop'],
  breakpointWidths: {},
  breakpointPreviewWidths: {},
  sections: [
    {
      id: 's',
      columns: 12,
      colGap: 8,
      rowGap: 8,
      rows: 6,
      items: [item('c', 0, 3), item('a', 0, 0), item('b', 4, 0)],
    },
  ],
};

const host = { layout: initial };

function Host(props: Partial<VantageBuilderProps>) {
  const [layout, setLayout] = useState(initial);
  const history = useVantageHistory(layout, (next) => {
    host.layout = next;
    setLayout(next);
  });
  return (
    <>
      <input aria-label="outside" />
      <VantageBuilder
        value={history.layout}
        onChange={history.onChange}
        history={history}
        components={components}
        {...props}
      />
    </>
  );
}

beforeEach(() => {
  host.layout = initial;
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

const block = (name: string) => screen.getByRole('group', { name });
const pos = (id: string) => {
  const { x, y, w, h } = host.layout.sections[0]!.items.find((i) => i.id === id)!;
  return { x, y, w, h };
};
const press = (key: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });
const status = () => document.querySelector('[data-vantage-announcer]')?.textContent?.trim();

function focusBlock(name: string) {
  act(() => block(name).focus());
}

describe('builder accessibility', () => {
  it('renders blocks as named, described tab stops in reading order', () => {
    render(<Host />);
    const groups = screen.getAllByRole('group');
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['A', 'B', 'C']);
    for (const g of groups) {
      expect(g.tabIndex).toBe(0);
      expect(g.getAttribute('aria-roledescription')).toBe('block');
      const help = document.getElementById(g.getAttribute('aria-describedby')!);
      expect(help?.textContent).toContain('Arrow keys move');
    }
    // Stacking keeps the items order: C at the bottom.
    expect(groups.map((g) => g.style.getPropertyValue('--vantage-z'))).toEqual(['2', '3', '1']);
  });

  it('never hides focusable controls from assistive tech', () => {
    render(<Host />);
    focusBlock('A');
    for (const hidden of document.querySelectorAll('[aria-hidden="true"]')) {
      expect(hidden.querySelector('button, [tabindex="0"], a[href], input')).toBeNull();
    }
    expect(screen.getByRole('button', { name: 'Delete A' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Drag A' }).tabIndex).toBe(-1);
  });

  it('uses translated labels and announcements from props', () => {
    render(
      <Host
        blockLabels={{ block: (i) => `Baustein ${i.label}`, roleDescription: 'Baustein' }}
        announcements={{ moved: ({ name, column }) => `${name} in Spalte ${column}` }}
      />,
    );
    focusBlock('Baustein A');
    press('ArrowRight');
    expect(status()).toBe('Baustein A in Spalte 2');
  });
});

describe('builder keyboard', () => {
  it('selects the focused block and moves it with arrows', () => {
    const onSelectionChange = vi.fn();
    render(<Host onSelectionChange={onSelectionChange} />);
    focusBlock('A');
    expect(onSelectionChange).toHaveBeenLastCalledWith({ sectionId: 's', itemId: 'a' });
    press('ArrowRight');
    press('ArrowDown');
    expect(pos('a')).toMatchObject({ x: 1, y: 1 });
    expect(status()).toBe('A moved to column 2, row 2');
    expect(document.activeElement).toBe(block('A'));
  });

  it('resizes with Shift+arrows', () => {
    render(<Host />);
    focusBlock('A');
    press('ArrowRight', { shiftKey: true });
    press('ArrowUp', { shiftKey: true });
    expect(pos('a')).toMatchObject({ w: 3, h: 1 });
    expect(status()).toBe('A resized to 3 columns by 1 rows');
  });

  it('records one undo step per held key, and one per separate press', () => {
    render(<Host />);
    focusBlock('A');
    press('ArrowRight');
    press('ArrowRight', { repeat: true });
    press('ArrowRight', { repeat: true });
    expect(pos('a').x).toBe(3);
    press('ArrowRight');
    expect(pos('a').x).toBe(4);

    press('z', { metaKey: true });
    expect(pos('a').x).toBe(3);
    expect(status()).toBe('Undone');
    press('z', { ctrlKey: true });
    expect(pos('a').x).toBe(0);
    press('z', { metaKey: true, shiftKey: true });
    expect(pos('a').x).toBe(3);
    press('y', { ctrlKey: true });
    expect(pos('a').x).toBe(4);
    expect(status()).toBe('Redone');
  });

  it('changes the layer with Cmd/Ctrl+Shift+arrows', () => {
    render(<Host />);
    focusBlock('C');
    press('ArrowUp', { metaKey: true, shiftKey: true });
    expect(host.layout.sections[0]!.items.map((i) => i.id)).toEqual(['a', 'c', 'b']);
    expect(status()).toBe('C brought forward');
    press('ArrowDown', { ctrlKey: true, shiftKey: true });
    expect(host.layout.sections[0]!.items.map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('deletes the block and moves focus to the next one in reading order', () => {
    const onSelectionChange = vi.fn();
    render(<Host onSelectionChange={onSelectionChange} />);
    focusBlock('A');
    press('Delete');
    expect(host.layout.sections[0]!.items.map((i) => i.id)).toEqual(['c', 'b']);
    expect(status()).toBe('A deleted');
    expect(onSelectionChange).toHaveBeenLastCalledWith({ sectionId: 's', itemId: 'b' });
    expect(document.activeElement).toBe(block('B'));
    press('Backspace');
    expect(host.layout.sections[0]!.items.map((i) => i.id)).toEqual(['c']);
  });

  it('deselects with Escape and reselects with Enter', () => {
    const onSelectionChange = vi.fn();
    render(<Host onSelectionChange={onSelectionChange} />);
    focusBlock('A');
    press('Escape');
    expect(onSelectionChange).toHaveBeenLastCalledWith(null);
    expect(status()).toBe('A deselected');
    press('ArrowRight');
    expect(pos('a').x).toBe(0);
    press('Enter');
    expect(onSelectionChange).toHaveBeenLastCalledWith({ sectionId: 's', itemId: 'a' });
  });

  it('leaves text fields, other focus targets and host shortcuts alone', () => {
    render(<Host />);
    focusBlock('A');
    const outside = screen.getByRole('textbox', { name: 'outside' });
    act(() => outside.focus());
    press('ArrowRight');
    press('Delete');
    expect(pos('a')).toMatchObject({ x: 0 });

    focusBlock('A');
    press('ArrowRight');
    act(() => outside.focus());
    expect(press('z', { metaKey: true })).toBe(true);
    expect(pos('a').x).toBe(1);

    focusBlock('A');
    for (const k of ['c', 'v', 'd']) expect(press(k, { metaKey: true })).toBe(true);
  });

  it('leaves undo to the browser without a history prop', () => {
    render(<Host history={undefined} />);
    focusBlock('A');
    press('ArrowRight');
    expect(press('z', { metaKey: true })).toBe(true);
    expect(pos('a').x).toBe(1);
  });
});
