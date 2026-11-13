// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BuilderContext, type BuilderContextValue } from '../context/BuilderContext';
import type { ArrangementSlot } from '../lib/arrangement';
import { BlockDragContext, useBlockDragController } from '../lib/blockDrag';
import { DEFAULT_LABELS } from '../lib/defaultLabels';
import { DEFAULT_BLOCK_ANNOUNCEMENTS, DEFAULT_BLOCK_LABELS } from '../lib/keyboardLabels';
import type { ComponentRegistry, GridItem, Layout } from '../types';
import { ArrangementBlock } from './ArrangementBlock';

afterEach(cleanup);

const item = (id: string, kind = 'text', extra: Partial<GridItem> = {}): GridItem => ({
  id,
  kind,
  label: id.toUpperCase(),
  x: 0,
  y: 0,
  w: 3,
  h: 2,
  ...extra,
});

const layout: Layout = {
  breakpoints: ['desktop'],
  breakpointWidths: {},
  breakpointPreviewWidths: {},
  sections: [
    {
      id: 's',
      columns: 12,
      colGap: 0,
      rowGap: 0,
      rows: 4,
      arrangement: { preset: 'three' },
      items: [item('a'), item('b')],
    },
  ],
};

const components: ComponentRegistry = {
  text: { component: () => <span>preview</span>, defaults: { w: 1, h: 1 } },
};

const slot: ArrangementSlot = { col: 4, span: 4, row: 1 };

type Overrides = Partial<BuilderContextValue>;

function DragProvider({ children }: { children: ReactNode }) {
  const noop = () => {};
  const value = useBlockDragController({
    onDragStart: noop,
    onDragMove: noop,
    onDragEnd: noop,
    onDragCancel: noop,
  });
  return <BlockDragContext.Provider value={value}>{children}</BlockDragContext.Provider>;
}

function setup(overrides: Overrides = {}, target: GridItem = layout.sections[0]!.items[0]!) {
  const onChange = vi.fn();
  const setSelection = vi.fn();
  const parentClick = vi.fn();
  const parentPointerDown = vi.fn();
  const value = {
    layout,
    onChange,
    setSelection,
    components,
    activeBreakpoint: 'desktop',
    selectedItems: [],
    defaultLabels: DEFAULT_LABELS,
    blockLabels: DEFAULT_BLOCK_LABELS,
    announcements: DEFAULT_BLOCK_ANNOUNCEMENTS,
    blockInstructionsId: 'help',
    ...overrides,
  } as unknown as BuilderContextValue;
  const view = render(
    <BuilderContext.Provider value={value}>
      <DragProvider>
        <div onClick={parentClick} onPointerDown={parentPointerDown}>
          <ArrangementBlock sectionId="s" item={target} slot={slot} />
        </div>
      </DragProvider>
    </BuilderContext.Provider>,
  );
  return { onChange, setSelection, parentClick, parentPointerDown, ...view };
}

const body = () => screen.getByRole('group');
const cell = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-vantage-arrangement-cell]')!;
const chromeOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-vantage-block="s:a"]:not([role])')!;

describe('ArrangementBlock layout and accessibility', () => {
  it('sits in its slot, offset by the gutter column', () => {
    const { container } = setup();
    const c = cell(container);
    expect(c.getAttribute('data-vantage-arrangement-cell')).toBe('a');
    expect(c.style.gridColumn).toBe('6 / span 4');
    expect(c.style.gridRow).toBe('2');
    expect(c.hasAttribute('data-vantage-dragging')).toBe(false);
  });

  it('is a labelled, focusable group tied to the keyboard help', () => {
    setup();
    expect(body().getAttribute('aria-label')).toBe('A');
    expect(body().getAttribute('aria-roledescription')).toBe('block');
    expect(body().getAttribute('aria-describedby')).toBe('help');
    expect(body().getAttribute('data-vantage-block')).toBe('s:a');
    expect(body().tabIndex).toBe(0);
  });

  it('uses the host labels', () => {
    setup({
      blockLabels: {
        ...DEFAULT_BLOCK_LABELS,
        block: (it) => `Baustein ${it.id}`,
        roleDescription: 'Baustein',
        dragHandle: (it) => `${it.id} ziehen`,
        deleteButton: (it) => `${it.id} entfernen`,
      },
    });
    expect(body().getAttribute('aria-label')).toBe('Baustein a');
    expect(body().getAttribute('aria-roledescription')).toBe('Baustein');
    expect(screen.getByRole('button', { name: 'a ziehen' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'a entfernen' })).toBeTruthy();
  });

  it('keeps the aspect ratio of content that declares one', () => {
    setup({
      components: {
        text: {
          component: () => null,
          defaults: { w: 1, h: 1 },
          arrangementAspectRatio: (it) => (it.id === 'a' ? 1.5 : undefined),
        },
      },
    });
    expect(body().style.aspectRatio).toBe('1.5 / 1');
  });

  it('has no aspect ratio otherwise', () => {
    setup();
    expect(body().style.aspectRatio).toBe('');
  });

  it('adds the kind wrapper class', () => {
    setup({
      components: {
        text: { component: () => null, defaults: { w: 1, h: 1 }, editWrapperClass: 'bare' },
      },
    });
    expect(body().classList.contains('bare')).toBe(true);
  });

  it('marks restricted blocks on body and chrome', () => {
    const isItemRestricted = vi.fn((it: GridItem) => it.id === 'a');
    const { container } = setup({ isItemRestricted });
    expect(body().className).toMatch(/restricted/);
    expect(chromeOf(container).className).toMatch(/restricted/);
  });

  it('does not mark unrestricted blocks', () => {
    const { container } = setup({ isItemRestricted: () => false });
    expect(body().className).not.toMatch(/restricted/);
    expect(chromeOf(container).className).not.toMatch(/restricted/);
  });
});

describe('ArrangementBlock content', () => {
  it('renders the preview component by default', () => {
    setup();
    expect(screen.getByText('preview')).toBeTruthy();
  });

  it('prefers the edit component', () => {
    setup({
      components: {
        text: {
          component: () => <span>preview</span>,
          editComponent: () => <span>editor</span>,
          defaults: { w: 1, h: 1 },
        },
      },
    });
    expect(screen.getByText('editor')).toBeTruthy();
    expect(screen.queryByText('preview')).toBeNull();
  });

  const withPlaceholder: ComponentRegistry = {
    text: {
      component: () => <span>preview</span>,
      editComponent: () => <span>editor</span>,
      editPlaceholder: () => <span>placeholder</span>,
      defaults: { w: 1, h: 1 },
    },
  };

  it('shows the placeholder until the block is selected', () => {
    setup({ components: withPlaceholder });
    expect(screen.getByText('placeholder')).toBeTruthy();
    expect(screen.queryByText('editor')).toBeNull();
  });

  it('swaps the placeholder for the editor once selected', () => {
    setup({ components: withPlaceholder, selectedItems: [{ sectionId: 's', itemId: 'a' }] });
    expect(screen.getByText('editor')).toBeTruthy();
    expect(screen.queryByText('placeholder')).toBeNull();
  });

  it('keeps the placeholder when another block is selected', () => {
    setup({ components: withPlaceholder, selectedItems: [{ sectionId: 's', itemId: 'b' }] });
    expect(screen.getByText('placeholder')).toBeTruthy();
  });

  it('keeps the placeholder when the same item id is selected in another section', () => {
    setup({ components: withPlaceholder, selectedItems: [{ sectionId: 'other', itemId: 'a' }] });
    expect(screen.getByText('placeholder')).toBeTruthy();
  });

  it('shows the unknown-kind fallback for unregistered kinds', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    setup({}, item('a', 'ghost'));
    expect(screen.getByText('ghost')).toBeTruthy();
    expect(screen.getByText(/Unknown kind:/)).toBeTruthy();
  });

  it('passes the item to the component', () => {
    setup({
      components: {
        text: {
          component: ({ item: it }) => <span>{`item ${it.id} ${it.w}x${it.h}`}</span>,
          defaults: { w: 1, h: 1 },
        },
      },
    });
    expect(screen.getByText('item a 3x2')).toBeTruthy();
  });
});

describe('ArrangementBlock selection', () => {
  it('selects on pointerdown anywhere in the block', () => {
    const { setSelection } = setup();
    fireEvent.pointerDown(screen.getByText('preview'));
    expect(setSelection).toHaveBeenCalledWith({ sectionId: 's', itemId: 'a' });
  });

  it('selects on focus when not selected', () => {
    const { setSelection } = setup();
    fireEvent.focus(body());
    expect(setSelection).toHaveBeenCalledWith({ sectionId: 's', itemId: 'a' });
  });

  it('does not reselect on focus when already selected', () => {
    const { setSelection } = setup({ selectedItems: [{ sectionId: 's', itemId: 'a' }] });
    fireEvent.focus(body());
    expect(setSelection).not.toHaveBeenCalled();
  });

  it('selects when focus lands on the block chrome', () => {
    const { container, setSelection } = setup();
    fireEvent.focus(chromeOf(container));
    expect(setSelection).toHaveBeenCalledWith({ sectionId: 's', itemId: 'a' });
  });

  it.each(['Enter', ' '])('selects with %j on the focused block', (key) => {
    const { setSelection } = setup();
    expect(fireEvent.keyDown(body(), { key })).toBe(false);
    expect(setSelection).toHaveBeenCalledWith({ sectionId: 's', itemId: 'a' });
  });

  it('ignores other keys', () => {
    const { setSelection } = setup();
    expect(fireEvent.keyDown(body(), { key: 'a' })).toBe(true);
    expect(setSelection).not.toHaveBeenCalled();
  });

  it('ignores Enter when already selected', () => {
    const { setSelection } = setup({ selectedItems: [{ sectionId: 's', itemId: 'a' }] });
    expect(fireEvent.keyDown(body(), { key: 'Enter' })).toBe(true);
    expect(setSelection).not.toHaveBeenCalled();
  });

  it('ignores Enter pressed inside the content', () => {
    const { setSelection } = setup({
      components: {
        text: { component: () => <input aria-label="field" />, defaults: { w: 1, h: 1 } },
      },
    });
    expect(fireEvent.keyDown(screen.getByLabelText('field'), { key: 'Enter' })).toBe(true);
    expect(setSelection).not.toHaveBeenCalled();
  });

  it('activates the chrome of the selected block', () => {
    const idle = setup();
    expect(chromeOf(idle.container).className).not.toMatch(/active/);
    cleanup();
    const selected = setup({ selectedItems: [{ sectionId: 's', itemId: 'a' }] });
    expect(chromeOf(selected.container).className).toMatch(/active/);
  });
});

describe('ArrangementBlock context menu', () => {
  it('hands the event to the host and suppresses the browser menu', () => {
    const onItemContextMenu = vi.fn();
    setup({ onItemContextMenu });
    expect(fireEvent.contextMenu(body())).toBe(false);
    expect(onItemContextMenu).toHaveBeenCalledTimes(1);
    expect(onItemContextMenu.mock.calls[0]![1]).toEqual({
      sectionId: 's',
      item: layout.sections[0]!.items[0],
    });
  });

  it('leaves the browser menu alone without a host handler', () => {
    setup();
    expect(fireEvent.contextMenu(body())).toBe(true);
  });
});

describe('ArrangementBlock default chrome', () => {
  it('has a drag handle that does not take part in tab order', () => {
    setup();
    const handle = screen.getByRole('button', { name: 'Drag A' });
    expect(handle.getAttribute('title')).toBe('A');
    expect(handle.getAttribute('tabindex')).toBe('-1');
    expect(handle.hasAttribute('data-vantage-drag-handle')).toBe(true);
  });

  it('titles the handle with the default label for unnamed blocks', () => {
    setup({}, item('a', 'text', { label: undefined }));
    expect(screen.getByRole('button', { name: /Drag/ }).getAttribute('title')).toBe(
      DEFAULT_LABELS.dragHandle,
    );
  });

  it('deletes the block without bubbling the click', () => {
    const { onChange, parentClick } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Delete A' }));
    const next = onChange.mock.calls[0]![0] as Layout;
    expect(next.sections[0]!.items.map((i) => i.id)).toEqual(['b']);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('keeps pointerdown on the delete button from reaching the block', () => {
    const { parentPointerDown } = setup();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Delete A' }));
    expect(parentPointerDown).not.toHaveBeenCalled();
  });
});

describe('ArrangementBlock custom chrome', () => {
  it('renders host drag handle with listeners and focus-free attributes', () => {
    const renderDragHandle = vi.fn(() => <span>grip</span>);
    setup({ renderDragHandle });
    expect(screen.getByText('grip')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Drag A' })).toBeNull();
    const ctx = renderDragHandle.mock.calls[0]![0] as Parameters<typeof renderDragHandle>[0] &
      Record<string, unknown>;
    expect(ctx).toMatchObject({
      sectionId: 's',
      item: layout.sections[0]!.items[0],
      isSelected: false,
      isDragging: false,
    });
    expect((ctx.attributes as { tabIndex: number }).tabIndex).toBe(-1);
    expect(ctx.listeners).toBeDefined();
  });

  it('tells the host drag handle about the selection', () => {
    const renderDragHandle = vi.fn(() => null);
    setup({ renderDragHandle, selectedItems: [{ sectionId: 's', itemId: 'a' }] });
    expect(renderDragHandle.mock.calls[0]![0]).toMatchObject({ isSelected: true });
  });

  it('renders the host edit button without it reaching the block pointer handling', () => {
    const renderEditButton = vi.fn(() => <button>edit</button>);
    const { parentPointerDown } = setup({ renderEditButton });
    expect(renderEditButton).toHaveBeenCalledWith({
      sectionId: 's',
      item: layout.sections[0]!.items[0],
      isSelected: false,
    });
    fireEvent.pointerDown(screen.getByText('edit'));
    expect(parentPointerDown).not.toHaveBeenCalled();
  });

  it('renders no edit slot without renderEditButton', () => {
    const { container } = setup();
    expect(container.querySelector('[class*="grid-block__edit"]')).toBeNull();
  });

  it('replaces the delete button and wires onDelete to the removal', () => {
    const renderDeleteButton = vi.fn(({ onDelete }: { onDelete: () => void }) => (
      <button onClick={onDelete}>remove</button>
    ));
    const { onChange } = setup({ renderDeleteButton });
    expect(screen.queryByRole('button', { name: 'Delete A' })).toBeNull();
    expect(renderDeleteButton.mock.calls[0]![0]).toMatchObject({
      sectionId: 's',
      isSelected: false,
    });
    fireEvent.click(screen.getByText('remove'));
    const next = onChange.mock.calls[0]![0] as Layout;
    expect(next.sections[0]!.items.map((i) => i.id)).toEqual(['b']);
  });

  it('keeps pointerdown on the host delete slot from selecting the block', () => {
    const { parentPointerDown } = setup({ renderDeleteButton: () => <button>remove</button> });
    fireEvent.pointerDown(screen.getByText('remove'));
    expect(parentPointerDown).not.toHaveBeenCalled();
  });
});

describe('ArrangementBlock dragging', () => {
  it('flags the cell and body while the handle is dragged', () => {
    const { container } = setup();
    const handle = screen.getByRole('button', { name: 'Drag A' });
    fireEvent.pointerDown(handle, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 40, clientY: 30 });
    const c = cell(container);
    expect(c.hasAttribute('data-vantage-dragging')).toBe(true);
    expect(c.style.zIndex).toBe('3');
    expect(c.className).toMatch(/dragging/);
    expect(body().className).toMatch(/dragging/);
    expect(body().style.transform).toBe('translate3d(30px, 20px, 0)');
    expect(chromeOf(container).style.transform).toBe('translate3d(30px, 20px, 0)');
    expect(chromeOf(container).className).toMatch(/active/);
  });

  it('takes the cell out of the flow at its start box while dragged, and back on drop', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockReturnValue(120);
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockReturnValue(40);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(300);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(90);
    const { container } = setup();
    const handle = screen.getByRole('button', { name: 'Drag A' });
    fireEvent.pointerDown(handle, { pointerId: 1, isPrimary: true, button: 0, clientX: 0 });
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 40, clientY: 30 });
    const c = cell(container);
    expect(c.style.position).toBe('absolute');
    expect([c.style.left, c.style.top, c.style.width, c.style.height]).toEqual([
      '120px',
      '40px',
      '300px',
      '90px',
    ]);
    expect(c.style.gridColumn).toBe('');
    fireEvent.pointerUp(document, { pointerId: 1, clientX: 40, clientY: 30 });
    expect(c.style.position).toBe('');
    expect(c.style.gridColumn).toBe('6 / span 4');
    vi.restoreAllMocks();
  });

  it('tells the host drag handle that a drag is running', () => {
    const renderDragHandle = vi.fn<NonNullable<BuilderContextValue['renderDragHandle']>>(
      ({ listeners }) => (
        <button data-testid="grip" {...listeners}>
          grip
        </button>
      ),
    );
    setup({ renderDragHandle });
    fireEvent.pointerDown(screen.getByTestId('grip'), {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 5, clientY: 5 });
    expect(renderDragHandle.mock.calls.at(-1)![0]).toMatchObject({ isDragging: true });
  });
});
