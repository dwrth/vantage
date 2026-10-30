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

// B overlaps A; C sits apart, right below where B would land first.
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
const marked = () =>
  Array.from(document.querySelectorAll('[role="group"][data-vantage-overlap]')).map((el) =>
    el.getAttribute('aria-label'),
  );

describe('overlap warning', () => {
  it('marks only the overlapping blocks', () => {
    render(<Host />);
    expect(marked()).toEqual(['A', 'B']);
    expect(screen.getAllByRole('img', { name: /overlaps another block/ })).toHaveLength(2);
  });

  it('moves the selected block below in one undo step and grows the section', () => {
    render(<Host />);
    act(() => screen.getByRole('group', { name: 'B' }).focus());
    fireEvent.click(screen.getByRole('button', { name: 'Move below' }));
    expect(pos('b')).toEqual({ x: 4, y: 4, w: 4, h: 2 });
    expect(host.layout.sections[0]!.rows).toBe(6);
    expect(marked()).toEqual([]);
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true });
    expect(pos('b')).toEqual({ x: 4, y: 1, w: 4, h: 2 });
    expect(host.layout.sections[0]!.rows).toBe(4);
  });

  it('keeps an intended overlap without a warning', () => {
    render(<Host />);
    act(() => screen.getByRole('group', { name: 'B' }).focus());
    fireEvent.click(screen.getByRole('button', { name: 'Keep overlap' }));
    expect(host.layout.sections[0]!.items[1]!.allowOverlap).toBe(true);
    expect(pos('b')).toEqual({ x: 4, y: 1, w: 4, h: 2 });
    expect(marked()).toEqual([]);
  });

  it('can be turned off or replaced by the host', () => {
    const { unmount } = render(<Host showOverlapWarnings={false} />);
    expect(marked()).toEqual([]);
    unmount();
    render(
      <Host
        renderOverlapWarning={(ctx) => (
          <button type="button" onClick={ctx.moveBelow}>
            Unterhalb verschieben {ctx.overlapsWith.join(',')}
          </button>
        )}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Unterhalb verschieben b' }));
    // A moves below B: A's bottom-free rows start at B's bottom.
    expect(pos('a')).toMatchObject({ y: 3 });
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
