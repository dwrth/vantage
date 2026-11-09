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

const item = (id: string, x: number, y: number, w = 4, h = 2): GridItem => ({
  id,
  kind: 'block',
  label: id.toUpperCase(),
  x,
  y,
  w,
  h,
});

// B overlaps A; C sits apart.
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
      rows: 4,
      items: [item('a', 0, 0, 6, 3), item('b', 4, 1), item('c', 6, 3, 4, 1)],
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
    <VantageBuilder
      value={history.layout}
      onChange={history.onChange}
      history={history}
      components={components}
      {...props}
    />
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

const pos = (id: string) => {
  const { x, y, w, h } = host.layout.sections[0]!.items.find((i) => i.id === id)!;
  return { x, y, w, h };
};
describe('overlapping blocks', () => {
  it('render without warnings or repair actions', () => {
    render(<Host />);
    expect(document.querySelector('[data-vantage-overlap]')).toBeNull();
    expect(screen.queryByRole('button', { name: /below|overlap/i })).toBeNull();
  });

  it('move and resize onto each other freely', () => {
    render(<Host />);
    act(() => screen.getByRole('group', { name: 'C' }).focus());
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(pos('c')).toEqual({ x: 5, y: 2, w: 4, h: 1 });
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown', shiftKey: true });
    expect(pos('c')).toEqual({ x: 5, y: 2, w: 4, h: 2 });
    expect(pos('a')).toEqual({ x: 0, y: 0, w: 6, h: 3 });
    expect(pos('b')).toEqual({ x: 4, y: 1, w: 4, h: 2 });
  });
});

describe('content minimum', () => {
  it('stops Shift+arrow shrinking at the host minimum', () => {
    render(<Host getItemMinSize={(i) => (i.id === 'c' ? { w: 3, h: 1 } : null)} />);
    act(() => screen.getByRole('group', { name: 'C' }).focus());
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft', shiftKey: true });
    expect(pos('c')).toMatchObject({ w: 3 });
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft', shiftKey: true });
    expect(pos('c')).toMatchObject({ w: 3 });
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight', shiftKey: true });
    expect(pos('c')).toMatchObject({ w: 4 });
  });
});
