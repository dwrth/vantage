// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBuilderContext, type SelectionRef } from '../context/BuilderContext';
import {
  duplicateSection,
  insertSection,
  moveItem,
  moveSectionBy,
  removeItem,
  resizeItem,
  resizeSection,
} from '../mutations/layout';
import { VantageThemeProvider } from '../theme/VantageThemeProvider';
import type { Breakpoint, ComponentRegistry, GridItem, Layout } from '../types';
import { VantageBuilder, type VantageBuilderProps } from './Builder';

/*
 * jsdom has no layout, so geometry is mocked: the grid of section `s` is 1152px wide (12 columns of
 * 96px, no gaps or padding, rows of 48px) at the page origin; the arrangement section `r` sits below
 * it from y 400 to 600. The canvas spans both.
 */
const GRIDS: Record<string, { top: number; height: number }> = {
  s: { top: 0, height: 288 },
  r: { top: 400, height: 200 },
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

function mockRect(this: HTMLElement): DOMRect {
  const frame = this.getAttribute('data-vantage-section-frame');
  if (frame && frame in GRIDS) return rect(0, GRIDS[frame]!.top, 1152, GRIDS[frame]!.height);
  if (/(^|\s)_canvas_/.test(this.className)) return rect(0, 0, 1152, 700);
  return rect(0, 0, 0, 0);
}

const renderBody = ({ item }: { item: GridItem }) => <span data-body={item.id}>{item.id}</span>;

const components: ComponentRegistry = {
  block: { component: renderBody, defaults: { w: 2, h: 2 } },
  placeholder: {
    component: renderBody,
    editPlaceholder: ({ item }) => <span data-placeholder={item.id} />,
    editComponent: ({ item }) => <span data-editor={item.id} />,
    defaults: { w: 2, h: 2 },
  },
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

const layout: Layout = {
  breakpoints: ['desktop', 'tablet'],
  breakpointWidths: {},
  breakpointPreviewWidths: { tablet: 700 },
  sections: [
    {
      id: 's',
      label: 'Hero',
      columns: 12,
      colGap: 0,
      rowGap: 0,
      paddingTop: 0,
      paddingBottom: 0,
      rows: 6,
      items: [item('a', 0, 0), item('b', 1, 1), item('c', 0, 4, { fullBleed: true, h: 1, w: 12 })],
    },
    { id: 'r', columns: 12, colGap: 0, rowGap: 0, items: [], arrangement: { preset: 'two' } },
  ],
};

beforeEach(() => {
  Object.defineProperty(document, 'scrollingElement', {
    configurable: true,
    get: () => document.documentElement,
  });
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

function renderBuilder(props: Partial<VantageBuilderProps> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <VantageBuilder value={layout} onChange={onChange} components={components} {...props} />,
  );
  const lastLayout = () => onChange.mock.calls.at(-1)?.[0] as Layout | undefined;
  return { ...utils, onChange, lastLayout };
}

const body = (key: string) =>
  document.querySelector<HTMLElement>(`[data-vantage-block="${key}"][role="group"]`)!;
const chrome = (key: string) =>
  document.querySelector<HTMLElement>(`[data-vantage-block="${key}"]:not([role="group"])`)!;
const grid = (id: string) =>
  document.querySelector<HTMLElement>(`[data-vantage-section-frame="${id}"]`)!;
const frame = (id: string) => grid(id).closest<HTMLElement>('[class*="canvas-frame"]')!;
const selectedKeys = () =>
  Array.from(document.querySelectorAll('[data-vantage-selected]')).map((el) =>
    el.getAttribute('data-vantage-block'),
  );

const pointer = (x: number, y: number, extra: object = {}) => ({
  clientX: x,
  clientY: y,
  isPrimary: true,
  button: 0,
  pointerId: 1,
  ...extra,
});

describe('VantageBuilder shell', () => {
  it('asks for components instead of rendering a canvas when the registry is empty', () => {
    renderBuilder({ components: {} });
    expect(screen.getByText(/No components registered/)).toBeTruthy();
    expect(document.querySelector('[data-vantage-section]')).toBeNull();
  });

  it('offers to add the first section on an empty layout', () => {
    const empty: Layout = { ...layout, sections: [] };
    const { onChange, lastLayout } = renderBuilder({
      value: empty,
      defaultLabels: { noSections: 'Leer', addSection: 'Neu', section: (n) => `Abschnitt ${n}` },
    });
    expect(screen.getByText('Leer')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Neu' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastLayout()!.sections).toHaveLength(1);
    expect(lastLayout()!.sections[0]!.label).toBe('Abschnitt 1');
  });

  it('starts from defaultSelectedItems', () => {
    renderBuilder({
      defaultSelectedItems: [
        { sectionId: 's', itemId: 'a' },
        { sectionId: 's', itemId: 'b' },
      ],
    });
    expect(selectedKeys()).toEqual(['s:a', 's:b']);
  });

  it('marks a selected section and passes it to header and footer render props', () => {
    const header = vi.fn(() => <div data-testid="header" />);
    const footer = vi.fn(() => <div data-testid="footer" />);
    renderBuilder({
      renderSectionHeader: header,
      renderSectionFooter: footer,
      defaultSelectedItem: { sectionId: 's', itemId: 'a' },
    });
    expect(screen.getAllByTestId('header')).toHaveLength(2);
    expect(screen.getAllByTestId('footer')).toHaveLength(2);
    expect(footer).toHaveBeenCalledWith(
      expect.objectContaining({ hasSelection: true, isDropTarget: false }),
    );
    expect(
      document
        .querySelector('[data-vantage-section="s"]')!
        .hasAttribute('data-vantage-section-selected'),
    ).toBe(true);
  });

  it('renders the unknown-kind fallback for a block without a registered kind', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderBuilder({
      value: {
        ...layout,
        sections: [{ ...layout.sections[0]!, items: [item('x', 0, 0, { kind: 'nope-builder' })] }],
      },
    });
    expect(body('s:x').textContent).toBe('Unknown kind: nope-builder');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('nope-builder'));
  });
});

describe('VantageBuilder breakpoints', () => {
  function BreakpointSwitch({ to }: { to: Breakpoint }) {
    const { setActiveBreakpoint, activeBreakpoint } = useBuilderContext();
    return (
      <button type="button" data-active={activeBreakpoint} onClick={() => setActiveBreakpoint(to)}>
        to {to}
      </button>
    );
  }

  it('limits the canvas to the preview width of the active breakpoint', () => {
    renderBuilder({ defaultActiveBreakpoint: 'tablet' });
    expect(frame('s').style.maxWidth).toBe('700px');
  });

  it('falls back to desktop for a default breakpoint that is not enabled', () => {
    renderBuilder({ defaultActiveBreakpoint: 'mobile' });
    expect(frame('s').style.maxWidth).toBe('100%');
  });

  it('falls back to desktop for a controlled breakpoint that is not enabled', () => {
    renderBuilder({ activeBreakpoint: 'mobile' });
    expect(frame('s').style.maxWidth).toBe('100%');
  });

  it('switches breakpoints from inside the builder when uncontrolled', () => {
    const onActiveBreakpointChange = vi.fn();
    renderBuilder({
      onActiveBreakpointChange,
      children: (
        <>
          <BreakpointSwitch to="tablet" />
          <BreakpointSwitch to="mobile" />
        </>
      ),
    });
    fireEvent.click(screen.getByText('to tablet'));
    expect(onActiveBreakpointChange).toHaveBeenLastCalledWith('tablet');
    expect(frame('s').style.maxWidth).toBe('700px');
    fireEvent.click(screen.getByText('to mobile'));
    expect(onActiveBreakpointChange).toHaveBeenLastCalledWith('desktop');
    expect(frame('s').style.maxWidth).toBe('100%');
  });

  it('only reports the request when controlled', () => {
    const onActiveBreakpointChange = vi.fn();
    renderBuilder({
      activeBreakpoint: 'desktop',
      onActiveBreakpointChange,
      children: <BreakpointSwitch to="tablet" />,
    });
    fireEvent.click(screen.getByText('to tablet'));
    expect(onActiveBreakpointChange).toHaveBeenCalledWith('tablet');
    expect(frame('s').style.maxWidth).toBe('100%');
    expect(screen.getByText('to tablet').getAttribute('data-active')).toBe('desktop');
  });

  it('edits the active breakpoint: a tablet resize lands in the tablet override', () => {
    const { lastLayout } = renderBuilder({ activeBreakpoint: 'tablet' });
    fireEvent.keyDown(screen.getByRole('separator', { name: 'Resize Hero height' }), {
      key: 'ArrowDown',
    });
    expect(lastLayout()).toEqual(resizeSection(layout, 's', 7, 'tablet'));
    expect(lastLayout()!.sections[0]!.rows).toBe(6);
  });
});

describe('section chrome', () => {
  it('commits a keyboard resize of the section height', () => {
    const { lastLayout } = renderBuilder();
    const handle = screen.getByRole('separator', { name: 'Resize Hero height' });
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(lastLayout()).toEqual(resizeSection(layout, 's', 7, 'desktop'));
  });

  it('previews a pointer resize of the section height and commits it on release', () => {
    const { onChange, lastLayout } = renderBuilder();
    const handle = screen.getByRole('separator', { name: 'Resize Hero height' });
    fireEvent.pointerDown(handle, pointer(10, 288));
    fireEvent.pointerMove(window, pointer(10, 288 + 96));
    const section = document.querySelector('[data-vantage-section="s"]')!;
    expect(section.className).toMatch(/section--resizing/);
    expect(grid('s').style.gridTemplateRows).toBe('repeat(8, minmax(var(--row-px), auto))');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(window, pointer(10, 288 + 96));
    expect(section.className).not.toMatch(/section--resizing/);
    expect(lastLayout()).toEqual(resizeSection(layout, 's', 8, 'desktop'));
  });

  it('names the resize edge with sectionResizeLabel or the unnamed-section fallback', () => {
    renderBuilder({ sectionResizeLabel: (s) => `Höhe ${s.id}` });
    expect(screen.getByRole('separator', { name: 'Höhe s' })).toBeTruthy();
    cleanup();
    renderBuilder({
      value: { ...layout, sections: [{ ...layout.sections[0]!, label: undefined }] },
      defaultLabels: { unnamedSection: 'Abschnitt' },
    });
    expect(screen.getByRole('separator', { name: 'Resize Abschnitt height' })).toBeTruthy();
  });

  it('applies the toolbar actions through onChange', () => {
    const { onChange } = renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Hero' }));
    const duplicated = onChange.mock.calls.at(-1)![0] as Layout;
    expect(duplicated.sections.map((s) => s.label)).toEqual(
      duplicateSection(layout, 's').layout.sections.map((s) => s.label),
    );
    expect(duplicated.sections).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Move Hero down' }));
    expect(onChange.mock.calls.at(-1)![0]).toEqual(moveSectionBy(layout, 's', 1));
    fireEvent.click(screen.getByRole('button', { name: 'Add section above Hero' }));
    const inserted = onChange.mock.calls.at(-1)![0] as Layout;
    expect(inserted.sections.map((s) => s.label)).toEqual(
      insertSection(layout, 0, { label: (n) => `Section ${n}` }).layout.sections.map(
        (s) => s.label,
      ),
    );
  });

  it('hides the section actions when showSectionActions is false', () => {
    renderBuilder({ showSectionActions: false });
    expect(screen.queryByRole('toolbar')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add section above Hero' })).toBeNull();
  });

  it('aligns a fill-screen grid by its vertical alignment', () => {
    renderBuilder({
      value: {
        ...layout,
        sections: [{ ...layout.sections[0]!, fillScreen: true, verticalAlign: 'center' }],
      },
    });
    expect(grid('s').className).toMatch(/builder-grid--fill/);
    expect(grid('s').style.alignContent).toBe('center');
  });

  it('uses a square row ratio when the cell max token is zero', () => {
    render(
      <VantageThemeProvider tokens={{ '--vantage-cell-max-px': '0' }}>
        <VantageBuilder value={layout} onChange={vi.fn()} components={components} />
      </VantageThemeProvider>,
    );
    expect(grid('s').style.getPropertyValue('--row-ratio')).toBe('1');
  });
});

describe('selection on the grid', () => {
  it('cycles through the stacked blocks under the pointer with Alt+click', () => {
    const onSelectionChange = vi.fn();
    renderBuilder({ onSelectionChange });
    // Cell (1, 1) is covered by `a` (bottom) and `b` (top).
    const at = pointer(106, 58, { altKey: true });
    fireEvent.pointerDown(grid('s'), at);
    expect(selectedKeys()).toEqual(['s:b']);
    fireEvent.pointerDown(grid('s'), at);
    expect(selectedKeys()).toEqual(['s:a']);
    fireEvent.pointerDown(grid('s'), at);
    expect(selectedKeys()).toEqual(['s:b']);
    expect(onSelectionChange).toHaveBeenCalledTimes(3);
  });

  it('cycles through stacked blocks on measured rows of a centered fill-screen grid', async () => {
    const measured = window.getComputedStyle;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
      const styles = measured(el, pseudo);
      if (!el.hasAttribute('data-vantage-section-frame')) return styles;
      return { ...styles, gridTemplateRows: Array(6).fill('48px').join(' '), paddingTop: '0px' };
    });
    renderBuilder({
      value: {
        ...layout,
        sections: [{ ...layout.sections[0]!, fillScreen: true, verticalAlign: 'center' }],
      },
    });
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    const at = pointer(106, 58, { altKey: true });
    fireEvent.pointerDown(grid('s'), at);
    expect(selectedKeys()).toEqual(['s:b']);
    fireEvent.pointerDown(grid('s'), at);
    expect(selectedKeys()).toEqual(['s:a']);
  });

  it('hits a full-bleed block anywhere across the width with Alt+click', () => {
    renderBuilder();
    fireEvent.pointerDown(grid('s'), pointer(1100, 4 * 48 + 10, { altKey: true }));
    expect(selectedKeys()).toEqual(['s:c']);
  });

  it('keeps the selection on an Alt+click over empty cells', () => {
    const onSelectionChange = vi.fn();
    renderBuilder({ defaultSelectedItem: { sectionId: 's', itemId: 'a' }, onSelectionChange });
    fireEvent.pointerDown(grid('s'), pointer(800, 10, { altKey: true }));
    expect(selectedKeys()).toEqual(['s:a']);
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('clears the selection on a secondary-button press on empty grid space', () => {
    const onSelectionChange = vi.fn();
    renderBuilder({ defaultSelectedItem: { sectionId: 's', itemId: 'a' }, onSelectionChange });
    fireEvent.pointerDown(grid('s'), pointer(800, 10, { button: 2 }));
    expect(onSelectionChange).toHaveBeenCalledWith(null);
    expect(selectedKeys()).toEqual([]);
  });

  it('ends an empty marquee with an empty selection', () => {
    const onSelectedItemsChange = vi.fn();
    renderBuilder({ defaultSelectedItem: { sectionId: 's', itemId: 'a' }, onSelectedItemsChange });
    fireEvent.pointerDown(grid('s'), pointer(800, 10));
    fireEvent.pointerMove(window, pointer(900, 40));
    expect(document.querySelector('[data-vantage-marquee]')).not.toBeNull();
    fireEvent.pointerUp(window, pointer(900, 40));
    expect(document.querySelector('[data-vantage-marquee]')).toBeNull();
    expect(onSelectedItemsChange).toHaveBeenLastCalledWith([]);
    expect(document.querySelector('[data-vantage-announcer]')!.textContent).not.toBe('');
  });
});

describe('block chrome', () => {
  it('deletes a block with the built-in delete button without selecting it', () => {
    const onSelectionChange = vi.fn();
    const { lastLayout } = renderBuilder({ onSelectionChange });
    fireEvent.click(screen.getByRole('button', { name: 'Delete A' }));
    expect(lastLayout()).toEqual(removeItem(layout, 's', 'a'));
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('keeps presses on the built-in delete button from reaching the page', () => {
    const outer = vi.fn();
    render(
      <div onPointerDown={outer}>
        <VantageBuilder value={layout} onChange={vi.fn()} components={components} />
      </div>,
    );
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Delete A' }));
    expect(outer).not.toHaveBeenCalled();
  });

  it('hands custom delete, edit and drag-handle slots their context', () => {
    const outer = vi.fn();
    const renderDeleteButton = vi.fn(({ onDelete, item: it }) => (
      <button type="button" onClick={onDelete}>
        remove {it.id}
      </button>
    ));
    const renderEditButton = vi.fn(({ item: it, isSelected }) => (
      <button type="button" data-selected={isSelected}>
        edit {it.id}
      </button>
    ));
    const renderDragHandle = vi.fn(({ item: it, attributes, listeners, isDragging }) => (
      <button
        type="button"
        data-dragging={isDragging}
        data-has-listeners={listeners !== undefined}
        {...attributes}
      >
        grab {it.id}
      </button>
    ));
    render(
      <div onPointerDown={outer}>
        <VantageBuilder
          value={layout}
          onChange={vi.fn()}
          components={components}
          defaultSelectedItem={{ sectionId: 's', itemId: 'a' }}
          renderDeleteButton={renderDeleteButton}
          renderEditButton={renderEditButton}
          renderDragHandle={renderDragHandle}
        />
      </div>,
    );
    expect(screen.queryByRole('button', { name: 'Delete A' })).toBeNull();
    expect(screen.getByText('edit a').getAttribute('data-selected')).toBe('true');
    expect(screen.getByText('edit b').getAttribute('data-selected')).toBe('false');
    const grab = screen.getByText('grab a');
    expect(grab.getAttribute('tabindex')).toBe('-1');
    expect(grab.getAttribute('data-dragging')).toBe('false');
    expect(grab.getAttribute('data-has-listeners')).toBe('true');
    fireEvent.pointerDown(screen.getByText('edit a'));
    fireEvent.pointerDown(screen.getByText('remove a'));
    expect(outer).not.toHaveBeenCalled();
  });

  it('removes the block through the custom delete slot', () => {
    const onChange = vi.fn();
    render(
      <VantageBuilder
        value={layout}
        onChange={onChange}
        components={components}
        renderDeleteButton={({ onDelete, item: it }) => (
          <button type="button" onClick={onDelete}>
            remove {it.id}
          </button>
        )}
      />,
    );
    fireEvent.click(screen.getByText('remove b'));
    expect(onChange.mock.calls[0]![0]).toEqual(removeItem(layout, 's', 'b'));
  });

  it('marks restricted blocks', () => {
    renderBuilder({ isItemRestricted: (i) => i.id === 'b' });
    expect(body('s:b').className).toMatch(/restricted/);
    expect(chrome('s:b').className).toMatch(/restricted/);
    expect(body('s:a').className).not.toMatch(/restricted/);
  });

  it('reports context menus on blocks only when the host listens', () => {
    const onItemContextMenu = vi.fn();
    renderBuilder({ onItemContextMenu });
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    act(() => {
      body('s:a').dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(onItemContextMenu).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sectionId: 's', item: expect.objectContaining({ id: 'a' }) }),
    );
    cleanup();
    renderBuilder();
    const plain = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    act(() => {
      body('s:a').dispatchEvent(plain);
    });
    expect(plain.defaultPrevented).toBe(false);
  });

  it('shows the edit placeholder unless the block is the only selected one', () => {
    const value: Layout = {
      ...layout,
      sections: [
        {
          ...layout.sections[0]!,
          items: [item('p', 0, 0, { kind: 'placeholder' }), item('q', 6, 0)],
        },
      ],
    };
    const ui = (selectedItems: SelectionRef[]) => (
      <VantageBuilder
        value={value}
        onChange={vi.fn()}
        components={components}
        selectedItems={selectedItems}
      />
    );
    const { rerender } = render(ui([]));
    expect(body('s:p').querySelector('[data-placeholder="p"]')).not.toBeNull();
    rerender(ui([{ sectionId: 's', itemId: 'p' }]));
    expect(body('s:p').querySelector('[data-editor="p"]')).not.toBeNull();
    rerender(
      ui([
        { sectionId: 's', itemId: 'q' },
        { sectionId: 's', itemId: 'p' },
      ]),
    );
    expect(body('s:p').querySelector('[data-placeholder="p"]')).not.toBeNull();
  });

  it('gives a full-bleed block only vertical resize edges', () => {
    renderBuilder();
    const edges = (key: string) =>
      Array.from(chrome(key).querySelectorAll('[data-edge]')).map((el) =>
        el.getAttribute('data-edge'),
      );
    expect(edges('s:c')).toEqual(['n', 's']);
    expect(edges('s:a')).toEqual(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']);
  });
});

describe('overlapping blocks', () => {
  it('render without a warning and move onto each other as dropped', () => {
    const { lastLayout } = renderBuilder();
    expect(document.querySelector('[data-vantage-overlap]')).toBeNull();
    expect(screen.queryByRole('button', { name: /below|overlap/i })).toBeNull();
    act(() => body('s:a').focus());
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(lastLayout()).toEqual(moveItem(layout, 's', 'a', 1, 0, 'desktop'));
  });
});

describe('pointer resize of a block', () => {
  const edge = (key: string, name: string) =>
    chrome(key).querySelector<HTMLElement>(`[data-edge="${name}"]`)!;

  it('previews and commits a resize from the east edge', () => {
    const { lastLayout } = renderBuilder();
    fireEvent.pointerDown(edge('s:a', 'e'), pointer(190, 10));
    fireEvent.pointerMove(window, pointer(190 + 2 * 96, 10));
    expect(body('s:a').style.gridColumn).toBe('2 / span 4');
    expect(chrome('s:a').className).toMatch(/resizing/);
    fireEvent.pointerUp(window, pointer(190 + 2 * 96, 10));
    expect(lastLayout()).toEqual(resizeItem(layout, 's', 'a', 0, 0, 4, 2, 'desktop'));
  });

  it('resizes from the north edge by rows', () => {
    const { lastLayout } = renderBuilder();
    fireEvent.pointerDown(edge('s:b', 'n'), pointer(150, 48));
    fireEvent.pointerMove(window, pointer(150, 0));
    fireEvent.pointerUp(window, pointer(150, 0));
    expect(lastLayout()).toEqual(resizeItem(layout, 's', 'b', 1, 0, 2, 3, 'desktop'));
  });

  it('discards the draft on Escape', () => {
    const { onChange } = renderBuilder();
    fireEvent.pointerDown(edge('s:a', 'se'), pointer(190, 90));
    fireEvent.pointerMove(window, pointer(400, 200));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(body('s:a').style.gridColumn).toBe('2 / span 2');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('grows a block from the south edge', () => {
    const { lastLayout } = renderBuilder();
    fireEvent.pointerDown(edge('s:a', 's'), pointer(50, 96));
    fireEvent.pointerMove(window, pointer(50, 96 + 48));
    fireEvent.pointerUp(window, pointer(50, 96 + 48));
    expect(lastLayout()).toEqual(resizeItem(layout, 's', 'a', 0, 0, 2, 3, 'desktop'));
  });

  it('does not report a press without movement', () => {
    const { onChange } = renderBuilder();
    fireEvent.pointerDown(edge('s:a', 'e'), pointer(190, 10));
    fireEvent.pointerUp(window, pointer(190, 10));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('dragging blocks', () => {
  const handle = (key: string) =>
    chrome(key).querySelector<HTMLElement>('[data-vantage-drag-handle]')!;

  it('moves a block within its section by whole cells', () => {
    const { lastLayout } = renderBuilder();
    fireEvent.pointerDown(handle('s:a'), pointer(20, 20));
    fireEvent.pointerMove(document, pointer(20, 30));
    fireEvent.pointerMove(document, pointer(20 + 96 * 3, 20 + 48));
    fireEvent.pointerUp(document, pointer(20 + 96 * 3, 20 + 48));
    expect(lastLayout()).toEqual(moveItem(layout, 's', 'a', 3, 1, 'desktop'));
  });

  it('leaves the layout alone when a block is dropped where it started', () => {
    const { onChange } = renderBuilder();
    fireEvent.pointerDown(handle('s:a'), pointer(20, 20));
    fireEvent.pointerMove(document, pointer(60, 20));
    fireEvent.pointerMove(document, pointer(22, 20));
    fireEvent.pointerUp(document, pointer(22, 20));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('drives a custom drag handle through its listeners and reports the drag to it', () => {
    renderBuilder({
      renderDragHandle: ({ item: it, listeners, attributes, isDragging }) => (
        <button type="button" data-dragging={isDragging} {...listeners} {...attributes}>
          grab {it.id}
        </button>
      ),
    });
    const grab = screen.getByText('grab a');
    fireEvent.pointerDown(grab, pointer(20, 20));
    fireEvent.pointerMove(document, pointer(20, 60));
    expect(screen.getByText('grab a').getAttribute('data-dragging')).toBe('true');
    expect(screen.getByText('grab a').parentElement!.className).toMatch(/handle-slot--dragging/);
    fireEvent.pointerUp(document, pointer(20, 60));
    expect(screen.getByText('grab a').getAttribute('data-dragging')).toBe('false');
  });

  it('keeps a dragged full-bleed block in its column', () => {
    renderBuilder();
    fireEvent.pointerDown(handle('s:c'), pointer(20, 200));
    fireEvent.pointerMove(document, pointer(320, 200));
    expect(body('s:c').style.transform).toBe('translate3d(0px, 0px, 0)');
    fireEvent.pointerUp(document, pointer(320, 200));
  });

  it('moves a block into an arrangement section and selects it there', () => {
    const onSelectionChange = vi.fn();
    const { lastLayout } = renderBuilder({ onSelectionChange });
    fireEvent.pointerDown(handle('s:a'), pointer(20, 20));
    fireEvent.pointerMove(document, pointer(20, 30));
    fireEvent.pointerMove(document, pointer(300, 480));
    expect(
      document
        .querySelector('[data-vantage-section="r"]')!
        .hasAttribute('data-vantage-drop-target'),
    ).toBe(true);
    fireEvent.pointerUp(document, pointer(300, 480));
    const next = lastLayout()!;
    expect(next.sections[0]!.items.map((i) => i.id)).toEqual(['b', 'c']);
    expect(next.sections[1]!.items.map((i) => i.id)).toEqual(['a']);
    expect(onSelectionChange).toHaveBeenLastCalledWith({ sectionId: 'r', itemId: 'a' });
  });
});

describe('palette drops (external drag)', () => {
  const drag = (type: string, target: EventTarget, x: number, y: number) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, {
      clientX: x,
      clientY: y,
      dataTransfer: { dropEffect: 'none', getData: () => '' },
    });
    act(() => {
      target.dispatchEvent(event);
    });
    return event;
  };
  const hasGhost = () => document.querySelector('[class*="drop-ghost"]') !== null;
  const canvas = () => grid('s').closest<HTMLElement>('[class*="_canvas_"]')!;

  it('keeps the ghost while the pointer moves inside the canvas and drops it on leaving', () => {
    renderBuilder({ externalDrag: { w: 2, h: 1 }, onExternalDrop: vi.fn() });
    drag('dragover', grid('s'), 300, 100);
    expect(hasGhost()).toBe(true);
    drag('dragleave', canvas(), 500, 100);
    expect(hasGhost()).toBe(true);
    drag('dragleave', canvas(), 1200, 100);
    expect(hasGhost()).toBe(false);
  });

  it('shows no ghost on scroll before the palette item reached the canvas', () => {
    renderBuilder({ externalDrag: { w: 2, h: 1 }, onExternalDrop: vi.fn() });
    act(() => {
      document.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    expect(hasGhost()).toBe(false);
  });

  it('does not accept palette drops without onExternalDrop', () => {
    renderBuilder({ externalDrag: { w: 2, h: 1 } });
    const over = drag('dragover', grid('s'), 300, 100);
    expect(over.defaultPrevented).toBe(false);
    expect(hasGhost()).toBe(false);
  });

  describe('auto-scroll near the window edges', () => {
    let frames: FrameRequestCallback[];
    let scrollBy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      frames = [];
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
      vi.stubGlobal('cancelAnimationFrame', () => {});
      scrollBy = vi.fn();
      document.documentElement.scrollBy = scrollBy as unknown as typeof window.scrollBy;
    });

    const runFrame = (now: number) => {
      const pending = frames;
      frames = [];
      for (const cb of pending) cb(now);
    };

    it('scrolls down while the pointer rests in the bottom band and stops on drop', () => {
      renderBuilder({ externalDrag: { w: 2, h: 1 }, onExternalDrop: vi.fn() });
      drag('dragover', document, 300, window.innerHeight - 1);
      runFrame(1000);
      expect(scrollBy).toHaveBeenCalledTimes(1);
      const [dx, first] = scrollBy.mock.calls[0]!;
      expect(dx).toBe(0);
      expect(first).toBeGreaterThan(0);
      runFrame(1020);
      expect(scrollBy.mock.calls[1]![1]).toBeCloseTo((first / 16) * 20);
      runFrame(2000);
      expect(scrollBy.mock.calls[2]![1]).toBeCloseTo((first / 16) * 50);
      drag('drop', document, 300, window.innerHeight - 1);
      runFrame(2016);
      expect(scrollBy).toHaveBeenCalledTimes(3);
      expect(frames).toHaveLength(0);
    });

    it('scrolls up in the top band, once per frame however many dragover events arrive', () => {
      renderBuilder({ externalDrag: { w: 2, h: 1 }, onExternalDrop: vi.fn() });
      drag('dragover', document, 300, 1);
      drag('dragover', document, 300, 2);
      runFrame(1000);
      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy.mock.calls[0]![1]).toBeLessThan(0);
    });

    it('does not scroll in the middle of the window', () => {
      renderBuilder({ externalDrag: { w: 2, h: 1 }, onExternalDrop: vi.fn() });
      drag('dragover', document, 300, window.innerHeight / 2);
      runFrame(1000);
      expect(scrollBy).not.toHaveBeenCalled();
      expect(frames).toHaveLength(0);
    });

    it('stops when the drag leaves the window but not when it leaves an element', () => {
      renderBuilder({ externalDrag: { w: 2, h: 1 }, onExternalDrop: vi.fn() });
      drag('dragover', document, 300, window.innerHeight - 1);
      drag('dragleave', document, 300, window.innerHeight - 2);
      runFrame(1000);
      expect(scrollBy).toHaveBeenCalledTimes(1);
      drag('dragleave', document, 300, window.innerHeight);
      runFrame(1016);
      expect(scrollBy).toHaveBeenCalledTimes(1);
    });
  });
});
