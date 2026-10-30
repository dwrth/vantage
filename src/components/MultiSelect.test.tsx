// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SelectionRef } from '../context/BuilderContext';
import type { BlockAnnouncements, BlockLabels } from '../lib/keyboardLabels';
import { useVantageHistory } from '../hooks/useVantageHistory';
import type { ComponentRegistry, GridItem, Layout } from '../types';
import { VantageBuilder, type VantageBuilderProps } from './Builder';

/*
 * jsdom has no layout, so geometry is mocked: the grid of section `s` is 1152px wide (12 columns
 * of 96px, no gaps or padding, rows of 48px) at the page origin. Block bodies report their cells.
 */
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

const initial: Layout = {
  breakpoints: ['desktop', 'tablet'],
  breakpointWidths: {},
  breakpointPreviewWidths: {},
  sections: [
    {
      id: 's',
      columns: 12,
      colGap: 0,
      rowGap: 0,
      paddingTop: 0,
      paddingBottom: 0,
      rows: 6,
      items: [item('a', 0, 0), item('b', 4, 0), item('c', 0, 3)],
    },
    { id: 't', columns: 12, colGap: 0, rowGap: 0, rows: 4, items: [item('d', 0, 0)] },
  ],
};

function rect(left: number, top: number, width: number, height: number): DOMRect {
  const r = {
    left,
    top,
    width,
    height,
    x: left,
    y: top,
    right: left + width,
    bottom: top + height,
  };
  return { ...r, toJSON: () => r } as DOMRect;
}

const host = { layout: initial };

function mockRect(this: HTMLElement): DOMRect {
  if (this.getAttribute('data-vantage-section-frame') === 's') return rect(0, 0, 1152, 288);
  const key = this.getAttribute('data-vantage-block');
  if (key?.startsWith('s:') && this.getAttribute('role') === 'group') {
    const found = host.layout.sections[0]!.items.find((i) => `s:${i.id}` === key);
    if (found) return rect(found.x * 96, found.y * 48, found.w * 96, found.h * 48);
  }
  return rect(0, 0, 0, 0);
}

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

/** Host that controls only the single selection, as callers before multi-select did. */
function SingleControlledHost(props: Partial<VantageBuilderProps>) {
  const [selection, setSelection] = useState<SelectionRef | null>(null);
  return (
    <>
      <output data-testid="single">{selection ? selection.itemId : 'none'}</output>
      <Host
        {...props}
        selectedItem={selection}
        onSelectionChange={(next) => {
          setSelection(next);
          props.onSelectionChange?.(next);
        }}
      />
    </>
  );
}

beforeEach(() => {
  host.layout = initial;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(mockRect);
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const block = (name: string) => screen.getByRole('group', { name });
const ref = (itemId: string, sectionId = 's') => ({ sectionId, itemId });
const pos = (id: string) => {
  const { x, y } = host.layout.sections[0]!.items.find((i) => i.id === id)!;
  return { x, y };
};
const ids = () => host.layout.sections[0]!.items.map((i) => i.id);
const selected = () =>
  Array.from(document.querySelectorAll('[data-vantage-selected]')).map((el) =>
    el.getAttribute('aria-label'),
  );
const status = () => document.querySelector('[data-vantage-announcer]')?.textContent?.trim();
const press = (key: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });
const click = (
  name: string,
  init: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean } = {},
) => fireEvent.pointerDown(block(name), { button: 0, isPrimary: true, pointerId: 1, ...init });
const grid = () => document.querySelector('[data-vantage-section-frame="s"]') as HTMLElement;
const pointer = (x: number, y: number) => ({
  clientX: x,
  clientY: y,
  isPrimary: true,
  button: 0,
  pointerId: 1,
});

describe('single selection stays unchanged', () => {
  it('a plain click selects one block and reports it through onSelectionChange', () => {
    const onSelectionChange = vi.fn();
    render(<Host onSelectionChange={onSelectionChange} />);
    click('A');
    expect(onSelectionChange).toHaveBeenLastCalledWith(ref('a'));
    click('B');
    expect(onSelectionChange).toHaveBeenLastCalledWith(ref('b'));
    expect(selected()).toEqual(['B']);
    expect(document.querySelector('[data-vantage-group-box]')).toBeNull();
  });

  it('arrows, Delete and Escape act on the one block of a controlled single selection', () => {
    render(<SingleControlledHost />);
    act(() => block('A').focus());
    expect(screen.getByTestId('single').textContent).toBe('a');
    press('ArrowRight');
    expect(pos('a')).toEqual({ x: 1, y: 0 });
    expect(pos('b')).toEqual({ x: 4, y: 0 });
    press('Escape');
    expect(screen.getByTestId('single').textContent).toBe('none');
    act(() => block('B').focus());
    press('Delete');
    expect(ids()).toEqual(['a', 'c']);
  });

  it('a host that only controls selectedItem still gets the group', () => {
    const onSelectionChange = vi.fn();
    render(<SingleControlledHost onSelectionChange={onSelectionChange} />);
    click('A');
    click('B', { shiftKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith(ref('b'));
    expect(screen.getByTestId('single').textContent).toBe('b');
    expect(selected()).toEqual(['A', 'B']);
  });

  it('full label objects written before multi-select stay valid and get the group defaults', () => {
    // Exactly the fields `BlockLabels` / `BlockAnnouncements` had before; must still type-check.
    const blockLabels: BlockLabels = {
      block: (i) => `Baustein ${i.label}`,
      roleDescription: 'Baustein',
      instructions: 'Hilfe',
      dragHandle: () => 'Ziehen',
      deleteButton: () => 'Entfernen',
      overlapWarning: () => 'Überlappung',
      moveBelow: 'Darunter',
      keepOverlap: 'Behalten',
    };
    const announcements: BlockAnnouncements = {
      moved: () => 'verschoben',
      resized: () => 'skaliert',
      deleted: () => 'gelöscht',
      broughtForward: () => 'vor',
      sentBackward: () => 'zurück',
      deselected: () => 'abgewählt',
      undone: () => 'rückgängig',
      redone: () => 'wiederholt',
    };
    render(<Host blockLabels={blockLabels} announcements={announcements} />);
    fireEvent.pointerDown(block('Baustein A'), { button: 0 });
    fireEvent.pointerDown(block('Baustein B'), { button: 0, shiftKey: true });
    expect(status()).toBe('2 blocks selected');
    expect(screen.getByRole('button', { name: 'Align left' })).toBeTruthy();
  });

  it('a selectedItem outside the group replaces the group', () => {
    function Switcher() {
      const [selection, setSelection] = useState<SelectionRef | null>(null);
      return (
        <>
          <button type="button" onClick={() => setSelection(ref('c'))}>
            pick c
          </button>
          <Host selectedItem={selection} onSelectionChange={setSelection} />
        </>
      );
    }
    render(<Switcher />);
    click('A');
    click('B', { shiftKey: true });
    expect(selected()).toEqual(['A', 'B']);
    fireEvent.click(screen.getByRole('button', { name: 'pick c' }));
    expect(selected()).toEqual(['C']);
  });
});

describe('Shift/Cmd/Ctrl-click', () => {
  it('toggles blocks and reports the whole selection, primary last', () => {
    const onSelectedItemsChange = vi.fn();
    const onSelectionChange = vi.fn();
    render(
      <Host onSelectedItemsChange={onSelectedItemsChange} onSelectionChange={onSelectionChange} />,
    );
    click('A');
    click('B', { shiftKey: true });
    expect(onSelectedItemsChange).toHaveBeenLastCalledWith([ref('a'), ref('b')]);
    expect(onSelectionChange).toHaveBeenLastCalledWith(ref('b'));
    expect(selected()).toEqual(['A', 'B']);
    expect(status()).toBe('2 blocks selected');
    expect(screen.getByRole('toolbar', { name: '2 blocks selected' })).toBeTruthy();

    click('C', { metaKey: true });
    expect(selected()).toEqual(['A', 'B', 'C']);
    click('A', { ctrlKey: true });
    expect(onSelectedItemsChange).toHaveBeenLastCalledWith([ref('b'), ref('c')]);
    expect(onSelectionChange).toHaveBeenLastCalledWith(ref('c'));
  });

  it('a plain click on a group member selects only that block', () => {
    render(<Host />);
    click('A');
    click('B', { shiftKey: true });
    click('A');
    expect(selected()).toEqual(['A']);
  });

  it('starts a new selection in another section', () => {
    const onSelectedItemsChange = vi.fn();
    render(<Host onSelectedItemsChange={onSelectedItemsChange} />);
    click('A');
    click('D', { shiftKey: true });
    expect(onSelectedItemsChange).toHaveBeenLastCalledWith([ref('d', 't')]);
  });

  it('Escape and a click on empty grid clear the group', () => {
    render(<Host />);
    click('A');
    click('B', { shiftKey: true });
    act(() => block('B').focus());
    press('Escape');
    expect(selected()).toEqual([]);
    expect(status()).toBe('Selection cleared');

    click('A');
    click('B', { shiftKey: true });
    fireEvent.pointerDown(grid(), pointer(900, 250));
    fireEvent.pointerUp(document, pointer(900, 250));
    expect(selected()).toEqual([]);
  });

  it('works with a controlled selectedItems', () => {
    function Controlled() {
      const [items, setItems] = useState<SelectionRef[]>([ref('a'), ref('c')]);
      return <Host selectedItems={items} onSelectedItemsChange={setItems} />;
    }
    render(<Controlled />);
    expect(selected()).toEqual(['A', 'C']);
    click('B', { shiftKey: true });
    expect(selected()).toEqual(['A', 'B', 'C']);
  });
});

describe('group keyboard actions', () => {
  function selectAB() {
    click('A');
    click('B', { shiftKey: true });
    act(() => block('B').focus());
  }

  it('arrows move the group as a unit and one held key is one undo step', () => {
    render(<Host />);
    selectAB();
    press('ArrowDown');
    press('ArrowDown', { repeat: true });
    expect(pos('a')).toEqual({ x: 0, y: 2 });
    expect(pos('b')).toEqual({ x: 4, y: 2 });
    expect(pos('c')).toEqual({ x: 0, y: 3 });
    expect(status()).toBe('2 blocks moved');
    press('z', { metaKey: true });
    expect(pos('a')).toEqual({ x: 0, y: 0 });
    expect(pos('b')).toEqual({ x: 4, y: 0 });
  });

  it('clamps the group at the section edge', () => {
    render(<Host />);
    selectAB();
    press('ArrowLeft');
    expect(pos('a')).toEqual({ x: 0, y: 0 });
    expect(pos('b')).toEqual({ x: 4, y: 0 });
  });

  it('Shift+arrows do not resize a group', () => {
    render(<Host />);
    selectAB();
    press('ArrowRight', { shiftKey: true });
    expect(host.layout).toBe(initial);
  });

  it('Delete removes the group in one undo step and selects the next block', () => {
    const onSelectionChange = vi.fn();
    render(<Host onSelectionChange={onSelectionChange} />);
    selectAB();
    press('Delete');
    expect(ids()).toEqual(['c']);
    expect(status()).toBe('2 blocks deleted');
    expect(onSelectionChange).toHaveBeenLastCalledWith(ref('c'));
    press('z', { metaKey: true });
    expect(ids()).toEqual(['a', 'b', 'c']);
  });

  it('moves on the active breakpoint only', () => {
    render(<Host activeBreakpoint="tablet" />);
    selectAB();
    press('ArrowDown');
    const s = host.layout.sections[0]!;
    expect(s.overrides?.tablet?.items?.a).toMatchObject({ y: 1 });
    expect(s.overrides?.tablet?.items?.b).toMatchObject({ y: 1 });
    expect(pos('a')).toEqual({ x: 0, y: 0 });
  });
});

describe('group toolbar', () => {
  it('aligns the group in one undo step and announces it', () => {
    render(<Host />);
    click('A');
    click('C', { shiftKey: true });
    // Move c right first so left alignment has something to do.
    click('C');
    act(() => block('C').focus());
    press('ArrowRight');
    click('A');
    click('C', { shiftKey: true });
    fireEvent.click(screen.getByRole('button', { name: 'Align right' }));
    expect(pos('a')).toEqual({ x: 1, y: 0 });
    expect(pos('c')).toEqual({ x: 1, y: 3 });
    expect(status()).toBe('2 blocks aligned right');
    press('z', { metaKey: true });
    expect(pos('a')).toEqual({ x: 0, y: 0 });
    expect(pos('c')).toEqual({ x: 1, y: 3 });
  });

  it('deletes the group', () => {
    render(<Host />);
    click('A');
    click('B', { shiftKey: true });
    fireEvent.click(screen.getByRole('button', { name: 'Delete 2 blocks' }));
    expect(ids()).toEqual(['c']);
    expect(selected()).toEqual([]);
  });

  it('can be hidden', () => {
    render(<Host showGroupToolbar={false} />);
    click('A');
    click('B', { shiftKey: true });
    expect(selected()).toEqual(['A', 'B']);
    expect(document.querySelector('[data-vantage-group-box]')).toBeNull();
  });
});

describe('marquee', () => {
  it('selects the blocks the rectangle touches, within the section', () => {
    const onSelectedItemsChange = vi.fn();
    render(<Host onSelectedItemsChange={onSelectedItemsChange} />);
    // From empty space right of b up-left over a and b (a: 0..192 x 0..96, b: 384..576).
    fireEvent.pointerDown(grid(), pointer(700, 120));
    fireEvent.pointerMove(document, pointer(600, 110));
    fireEvent.pointerMove(document, pointer(100, 50));
    expect(document.querySelector('[data-vantage-marquee]')).not.toBeNull();
    expect(selected()).toEqual(['A', 'B']);
    fireEvent.pointerUp(document, pointer(100, 50));
    expect(document.querySelector('[data-vantage-marquee]')).toBeNull();
    expect(onSelectedItemsChange).toHaveBeenLastCalledWith([ref('a'), ref('b')]);
    expect(status()).toBe('2 blocks selected');
    expect(document.activeElement).toBe(block('B'));
  });

  it('adds to the selection with Shift and restores it on Escape', () => {
    render(<Host />);
    click('C');
    fireEvent.pointerDown(grid(), { ...pointer(700, 120), shiftKey: true });
    fireEvent.pointerMove(document, pointer(300, 10));
    expect(selected()).toEqual(['B', 'C']);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(selected()).toEqual(['C']);
  });

  it('a click without dragging only clears', () => {
    render(<Host />);
    click('A');
    fireEvent.pointerDown(grid(), pointer(700, 120));
    fireEvent.pointerMove(document, pointer(701, 121));
    fireEvent.pointerUp(document, pointer(701, 121));
    expect(selected()).toEqual([]);
    expect(document.querySelector('[data-vantage-marquee]')).toBeNull();
  });
});

describe('group pointer drag', () => {
  it('moves the whole group by the dragged cells in one change', () => {
    const onChange = vi.fn();
    render(
      <VantageBuilder
        value={initial}
        onChange={onChange}
        components={components}
        defaultSelectedItems={[ref('a'), ref('b')]}
      />,
    );
    const handle = screen.getByRole('button', { name: 'Drag A' });
    fireEvent.pointerDown(handle, pointer(20, 20));
    fireEvent.pointerMove(document, pointer(30, 20));
    fireEvent.pointerMove(document, pointer(20 + 192, 20 + 48));
    // The follower is drawn at its new cells while dragging.
    expect(block('B').style.gridColumn).toBe('8 / span 2');
    fireEvent.pointerUp(document, pointer(20 + 192, 20 + 48));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as Layout;
    const at = (id: string) => next.sections[0]!.items.find((i) => i.id === id);
    expect(at('a')).toMatchObject({ x: 2, y: 1 });
    expect(at('b')).toMatchObject({ x: 6, y: 1 });
    expect(at('c')).toMatchObject({ x: 0, y: 3 });
  });

  it('clamps the group at the section edge', () => {
    const onChange = vi.fn();
    render(
      <VantageBuilder
        value={initial}
        onChange={onChange}
        components={components}
        defaultSelectedItems={[ref('a'), ref('b')]}
      />,
    );
    const handle = screen.getByRole('button', { name: 'Drag A' });
    fireEvent.pointerDown(handle, pointer(20, 20));
    fireEvent.pointerMove(document, pointer(30, 20));
    // 10 columns right: b (x 4, w 2) stops at x 10, so the group moves 6.
    fireEvent.pointerMove(document, pointer(20 + 960, 20));
    fireEvent.pointerUp(document, pointer(20 + 960, 20));
    const next = onChange.mock.calls[0]![0] as Layout;
    const at = (id: string) => next.sections[0]!.items.find((i) => i.id === id);
    expect(at('a')).toMatchObject({ x: 6, y: 0 });
    expect(at('b')).toMatchObject({ x: 10, y: 0 });
  });
});
