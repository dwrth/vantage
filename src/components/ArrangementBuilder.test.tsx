// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentRegistry, Layout } from '../types';
import { VantageBuilder } from './Builder';

const components: ComponentRegistry = {
  block: { component: () => <span>content</span>, defaults: { w: 1, h: 1 } },
};

const item = (id: string) => ({ id, kind: 'block', label: id, x: 0, y: 0, w: 1, h: 1 });

const layout = (activeHidden = false): Layout => ({
  breakpoints: ['desktop', 'tablet', 'mobile'],
  breakpointWidths: { tablet: 1024, mobile: 640 },
  breakpointPreviewWidths: { tablet: 768, mobile: 375 },
  sections: [
    {
      id: 'flow',
      label: 'Flow',
      columns: 12,
      colGap: 16,
      rowGap: 16,
      arrangement: { preset: 'three' },
      items: [item('a'), item('b'), item('c')],
      overrides: activeHidden ? { mobile: { items: { b: { hidden: true } } } } : undefined,
    },
    { id: 'grid', label: 'Grid', columns: 12, colGap: 8, rowGap: 8, rows: 4, items: [item('g')] },
  ],
});

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

const blocks = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-vantage-arrangement-cell]')).map((el) =>
    el.getAttribute('data-vantage-arrangement-cell'),
  );

describe('arrangement section in the builder', () => {
  it('renders its blocks in order next to a free grid section', () => {
    const { container } = render(
      <VantageBuilder value={layout()} onChange={vi.fn()} components={components} />,
    );
    expect(blocks(container)).toEqual(['a', 'b', 'c']);
    expect(container.querySelector('[data-vantage-arrangement="three"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-vantage-section]')).toHaveLength(2);
  });

  it('skips blocks hidden on the active breakpoint', () => {
    const { container } = render(
      <VantageBuilder
        value={layout(true)}
        onChange={vi.fn()}
        components={components}
        activeBreakpoint="mobile"
      />,
    );
    expect(blocks(container)).toEqual(['a', 'c']);
  });

  it('moves the selected block with the arrow keys', () => {
    const onChange = vi.fn();
    render(<VantageBuilder value={layout()} onChange={onChange} components={components} />);
    const block = screen.getAllByRole('group', { name: /b/ })[0]!;
    fireEvent.focus(block);
    fireEvent.keyDown(block, { key: 'ArrowRight' });
    const next = onChange.mock.calls.at(-1)![0] as Layout;
    expect(next.sections[0]!.items.map((i) => i.id)).toEqual(['a', 'c', 'b']);
  });

  it('deletes a block', () => {
    const onChange = vi.fn();
    render(<VantageBuilder value={layout()} onChange={onChange} components={components} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Delete/i })[0]!);
    const next = onChange.mock.calls.at(-1)![0] as Layout;
    expect(next.sections[0]!.items).toHaveLength(2);
  });
});
