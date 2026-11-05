// @vitest-environment jsdom
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BuilderContext, type BuilderContextValue } from '../context/BuilderContext';
import {
  CanvasDndContext,
  type CanvasDndContextValue,
  type SectionDropHandle,
} from '../context/CanvasDndContext';
import { ItemDataProvider } from '../hooks/useItemData';
import { DEFAULT_LABELS } from '../lib/defaultLabels';
import { DEFAULT_BLOCK_ANNOUNCEMENTS, DEFAULT_BLOCK_LABELS } from '../lib/keyboardLabels';
import { DEFAULT_SECTION_ACTION_LABELS } from '../lib/sectionActionLabels';
import { VantageThemeContext } from '../theme/VantageThemeContext';
import { mergeVantageTokens } from '../theme/tokens';
import type { ComponentRegistry, GridItem, Layout, Section } from '../types';
import { ArrangementSectionView } from './ArrangementSectionView';

const item = (id: string, extra: Partial<GridItem> = {}): GridItem => ({
  id,
  kind: 'text',
  label: id.toUpperCase(),
  x: 0,
  y: 0,
  w: 3,
  h: 2,
  ...extra,
});

const section = (extra: Partial<Section> = {}): Section => ({
  id: 's',
  label: 'Flow',
  columns: 12,
  colGap: 16,
  rowGap: 12,
  paddingTop: 8,
  paddingBottom: 24,
  arrangement: { preset: 'three' },
  items: [item('a'), item('b'), item('c')],
  ...extra,
});

const layoutOf = (s: Section): Layout => ({
  breakpoints: ['desktop', 'tablet', 'mobile'],
  breakpointWidths: { tablet: 1024, mobile: 640 },
  breakpointPreviewWidths: { tablet: 768, mobile: 375 },
  sections: [s],
});

const components: ComponentRegistry = {
  text: {
    component: ({ item: it }) => <span>{`${it.id}:${JSON.stringify(it.data ?? null)}`}</span>,
    defaults: { w: 1, h: 1 },
  },
};

type Rect = { left: number; top: number; right: number; bottom: number };
const cellRects: Record<string, Rect> = {
  a: { left: 10, top: 5, right: 110, bottom: 55 },
  b: { left: 110, top: 5, right: 210, bottom: 55 },
  c: { left: 210, top: 5, right: 310, bottom: 55 },
};
const frameRect: Rect = { left: 10, top: 5, right: 310, bottom: 55 };

const domRect = (r: Rect): DOMRect => {
  const full = {
    ...r,
    x: r.left,
    y: r.top,
    width: r.right - r.left,
    height: r.bottom - r.top,
  };
  return { ...full, toJSON: () => full } as DOMRect;
};

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const id = this.getAttribute('data-vantage-arrangement-cell');
    if (id) return domRect(cellRects[id]!);
    if (this.hasAttribute('data-vantage-section-frame')) return domRect(frameRect);
    return domRect({ left: 0, top: 0, right: 0, bottom: 0 });
  });
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

type Setup = {
  section?: Section;
  context?: Partial<BuilderContextValue>;
  dnd?: Partial<CanvasDndContextValue>;
  wrap?: (children: ReactNode) => ReactNode;
};

function build({ section: s = section(), context = {}, dnd = {}, wrap = (c) => c }: Setup) {
  const onChange = vi.fn();
  const unregister = vi.fn();
  const handles: SectionDropHandle[] = [];
  const registerSection = vi.fn((_id: string, handle: SectionDropHandle) => {
    handles.push(handle);
    return unregister;
  });
  const builderValue = {
    layout: layoutOf(s),
    onChange,
    isInteracting: false,
    selection: null,
    selectedItems: [],
    setSelection: vi.fn(),
    activeBreakpoint: 'desktop',
    breakpointPreviewWidths: { tablet: 768, mobile: 375 },
    sectionHeaderPlacement: 'section',
    showSectionActions: false,
    showSectionToolbar: false,
    components,
    defaultLabels: DEFAULT_LABELS,
    blockLabels: DEFAULT_BLOCK_LABELS,
    announcements: DEFAULT_BLOCK_ANNOUNCEMENTS,
    sectionActionLabels: DEFAULT_SECTION_ACTION_LABELS,
    blockInstructionsId: 'help',
    ...context,
  } as unknown as BuilderContextValue;
  const dndValue: CanvasDndContextValue = {
    registerSection,
    dropTarget: null,
    setDropTarget: vi.fn(),
    dragSourceSectionId: null,
    ...dnd,
  };
  const tree = (current: Section, ctx: BuilderContextValue = builderValue) =>
    wrap(
      <BuilderContext.Provider value={ctx}>
        <CanvasDndContext.Provider value={dndValue}>
          <DndContext>
            <ArrangementSectionView section={current} />
          </DndContext>
        </CanvasDndContext.Provider>
      </BuilderContext.Provider>,
    );
  return { tree, builderValue, onChange, registerSection, unregister, handles };
}

function setup(options: Setup = {}) {
  const built = build(options);
  const view = render(built.tree(options.section ?? section()));
  return { ...built, ...view };
}

const cellIds = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-vantage-arrangement-cell]')).map((el) =>
    el.getAttribute('data-vantage-arrangement-cell'),
  );
const sectionEl = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-vantage-section]')!;
const frameEl = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-vantage-section-frame]')!;
const canvasFrame = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[class*="canvas-frame"]')!;
const prop = (el: HTMLElement, name: string) => el.style.getPropertyValue(name);

describe('ArrangementSectionView structure', () => {
  it('renders the blocks in order inside a section tagged with id and preset', () => {
    const { container } = setup();
    const el = sectionEl(container);
    expect(el.tagName).toBe('SECTION');
    expect(el.getAttribute('data-vantage-section')).toBe('s');
    expect(el.getAttribute('data-vantage-arrangement')).toBe('three');
    expect(cellIds(container)).toEqual(['a', 'b', 'c']);
  });

  it('puts the blocks into their preset slots', () => {
    const { container } = setup();
    const cells = container.querySelectorAll<HTMLElement>('[data-vantage-arrangement-cell]');
    expect(Array.from(cells).map((c) => [c.style.gridColumn, c.style.gridRow])).toEqual([
      ['2 / span 4', '1'],
      ['6 / span 4', '1'],
      ['10 / span 4', '1'],
    ]);
  });

  it('feeds the grid variables from the section and the preset', () => {
    const { container } = setup();
    const grid = frameEl(container);
    expect(grid.getAttribute('data-vantage-section-frame')).toBe('s');
    expect(prop(grid, '--cols')).toBe('12');
    expect(prop(grid, '--col-gap-px')).toBe('16px');
    expect(prop(grid, '--row-gap-px')).toBe('12px');
    expect(prop(grid, '--section-pad-top-px')).toBe('8px');
    expect(prop(grid, '--section-pad-bottom-px')).toBe('24px');
    expect(grid.style.gridTemplateRows).toBe('none');
  });

  it('derives the row ratio from the theme tokens', () => {
    const tokens = mergeVantageTokens({
      '--vantage-cell-max-px': '100px',
      '--vantage-row-max-px': '50px',
    });
    const { container } = setup({
      wrap: (children) => (
        <VantageThemeContext.Provider value={tokens}>{children}</VantageThemeContext.Provider>
      ),
    });
    expect(prop(frameEl(container), '--row-ratio')).toBe('0.5');
  });

  it('falls back to a ratio of 1 when the cell max is zero', () => {
    const tokens = mergeVantageTokens({ '--vantage-cell-max-px': '0' });
    const { container } = setup({
      wrap: (children) => (
        <VantageThemeContext.Provider value={tokens}>{children}</VantageThemeContext.Provider>
      ),
    });
    expect(prop(frameEl(container), '--row-ratio')).toBe('1');
  });

  it('shows an empty placeholder without blocks', () => {
    const { container } = setup({ section: section({ items: [] }) });
    expect(cellIds(container)).toEqual([]);
    expect(container.querySelector('[class*="empty"]')).not.toBeNull();
  });

  it('shows no placeholder when there are blocks', () => {
    const { container } = setup();
    expect(container.querySelector('[class*="empty"]')).toBeNull();
  });

  it('paints the section background behind the blocks', () => {
    const { container } = setup({ section: section({ background: { color: '#123456' } }) });
    const bg = container.querySelector('[data-vantage-section-background]')!;
    expect(bg).not.toBeNull();
    expect(bg.parentElement).toBe(frameEl(container));
  });

  it('paints no background by default', () => {
    const { container } = setup();
    expect(container.querySelector('[data-vantage-section-background]')).toBeNull();
  });
});

describe('ArrangementSectionView alignment', () => {
  const alignOf = (arrangement: Section['arrangement']) => {
    const { container } = setup({ section: section({ arrangement }) });
    return frameEl(container).style.alignItems;
  };

  it('aligns to the start by default', () => {
    expect(alignOf({ preset: 'three' })).toBe('start');
  });

  it.each([
    ['start', 'start'],
    ['center', 'center'],
    ['end', 'end'],
  ] as const)('maps verticalAlign %s', (verticalAlign, expected) => {
    expect(alignOf({ preset: 'three', verticalAlign })).toBe(expected);
  });

  it('stretches for equal height regardless of verticalAlign', () => {
    expect(alignOf({ preset: 'three', equalHeight: true, verticalAlign: 'end' })).toBe('stretch');
  });
});

describe('ArrangementSectionView breakpoints', () => {
  it('stacks into one column on mobile and reverses when asked', () => {
    const { container } = setup({
      section: section({ arrangement: { preset: 'three', mobileOrder: 'reversed' } }),
      context: { activeBreakpoint: 'mobile' },
    });
    expect(prop(frameEl(container), '--cols')).toBe('1');
    const cells = Array.from(
      container.querySelectorAll<HTMLElement>('[data-vantage-arrangement-cell]'),
    );
    expect(
      cells.map((c) => [c.getAttribute('data-vantage-arrangement-cell'), c.style.gridRow]),
    ).toEqual([
      ['a', '3'],
      ['b', '2'],
      ['c', '1'],
    ]);
  });

  it('skips blocks hidden at the active breakpoint and closes the gap', () => {
    const { container } = setup({
      section: section({ overrides: { mobile: { items: { b: { hidden: true } } } } }),
      context: { activeBreakpoint: 'mobile' },
    });
    expect(cellIds(container)).toEqual(['a', 'c']);
    const rows = Array.from(
      container.querySelectorAll<HTMLElement>('[data-vantage-arrangement-cell]'),
    ).map((c) => c.style.gridRow);
    expect(rows).toEqual(['1', '2']);
  });

  it('uses the tablet override of the gap', () => {
    const { container } = setup({
      section: section({ overrides: { tablet: { colGap: 4, rowGap: 2 } } }),
      context: { activeBreakpoint: 'tablet' },
    });
    expect(prop(frameEl(container), '--col-gap-px')).toBe('4px');
    expect(prop(frameEl(container), '--row-gap-px')).toBe('2px');
  });

  it.each([
    ['desktop', {}, '100%'],
    ['tablet', { tablet: 768, mobile: 375 }, '768px'],
    ['tablet', { mobile: 375 }, '375px'],
    ['tablet', {}, '100%'],
    ['mobile', { tablet: 768, mobile: 375 }, '375px'],
    ['mobile', { tablet: 768 }, '100%'],
  ] as const)('limits the canvas on %s with preview widths %j to %s', (bp, widths, expected) => {
    const { container } = setup({
      context: { activeBreakpoint: bp, breakpointPreviewWidths: widths },
    });
    expect(canvasFrame(container).style.maxWidth).toBe(expected);
  });

  it('resolves block data from the breakpoint override', () => {
    const { container } = setup({
      section: section({
        items: [item('a', { data: { n: 1 } })],
        overrides: { tablet: { items: { a: { data: { n: 2 } } } } },
      }),
      context: { activeBreakpoint: 'tablet' },
    });
    expect(container.textContent).toContain('a:{"n":2}');
  });

  it('merges entity data under the block data', () => {
    const { container } = setup({
      section: section({ items: [item('a', { data: { n: 1 } })] }),
      wrap: (children) => (
        <ItemDataProvider resolveItemData={() => ({ n: 0, extra: true })}>
          {children}
        </ItemDataProvider>
      ),
    });
    expect(container.textContent).toContain('a:{"n":1,"extra":true}');
  });
});

describe('ArrangementSectionView selection and chrome', () => {
  it('marks the section holding the selection', () => {
    const selected = setup({ context: { selection: { sectionId: 's', itemId: 'a' } } });
    expect(sectionEl(selected.container).hasAttribute('data-vantage-section-selected')).toBe(true);
    cleanup();
    const elsewhere = setup({ context: { selection: { sectionId: 'x', itemId: 'a' } } });
    expect(sectionEl(elsewhere.container).hasAttribute('data-vantage-section-selected')).toBe(
      false,
    );
  });

  it('marks the active grid while interacting', () => {
    const idle = setup();
    expect(frameEl(idle.container).className).not.toMatch(/active/);
    cleanup();
    const busy = setup({ context: { isInteracting: true } });
    expect(frameEl(busy.container).className).toMatch(/active/);
  });

  it('renders the header as first child of the section by default placement', () => {
    const renderSectionHeader = vi.fn(() => <header>head</header>);
    const { container } = setup({ context: { renderSectionHeader } });
    const header = screen.getByText('head');
    expect(header.parentElement).toBe(sectionEl(container));
    expect(sectionEl(container).firstElementChild).toBe(header);
    expect(renderSectionHeader).toHaveBeenCalledWith({
      section: expect.objectContaining({ id: 's' }),
      activeBreakpoint: 'desktop',
      hasSelection: false,
      isDropTarget: false,
    });
  });

  it('renders the header inside the canvas frame for canvas placement', () => {
    const { container } = setup({
      context: {
        renderSectionHeader: () => <header>head</header>,
        sectionHeaderPlacement: 'canvas',
      },
    });
    expect(screen.getAllByText('head')).toHaveLength(1);
    expect(screen.getByText('head').parentElement).toBe(canvasFrame(container));
  });

  it('renders the footer last, with the selection state', () => {
    const renderSectionFooter = vi.fn(() => <footer>foot</footer>);
    const { container } = setup({
      context: { renderSectionFooter, selection: { sectionId: 's', itemId: 'b' } },
    });
    expect(sectionEl(container).lastElementChild).toBe(screen.getByText('foot'));
    expect(renderSectionFooter).toHaveBeenCalledWith(
      expect.objectContaining({ hasSelection: true, isDropTarget: false }),
    );
  });

  it('shows the section toolbar only when enabled', () => {
    const off = setup();
    expect(screen.queryByRole('toolbar')).toBeNull();
    off.unmount();
    setup({ context: { showSectionActions: true, showSectionToolbar: true } });
    expect(screen.getByRole('toolbar', { name: 'Flow actions' })).toBeTruthy();
  });
});

describe('ArrangementSectionView drop target', () => {
  it('flags the section and draws the insertion line at the drop index', () => {
    const renderSectionHeader = vi.fn(() => null);
    const { container } = setup({
      context: { renderSectionHeader },
      dnd: { dropTarget: { sectionId: 's', x: 0, y: 0, w: 3, h: 2, index: 1 } },
    });
    expect(sectionEl(container).hasAttribute('data-vantage-drop-target')).toBe(true);
    expect(sectionEl(container).className).toMatch(/drop-target/);
    expect(frameEl(container).className).toMatch(/active/);
    expect(renderSectionHeader).toHaveBeenLastCalledWith(
      expect.objectContaining({ isDropTarget: true }),
    );
    const line = container.querySelector<HTMLElement>('[class*="insertion-line"]')!;
    expect(line.getAttribute('aria-hidden')).toBe('true');
    expect(line.style.left).toBe('98.5px');
    expect(line.style.top).toBe('0px');
    expect(line.style.width).toBe('3px');
    expect(line.style.height).toBe('50px');
  });

  it('draws the line after the last block for an index past the end', () => {
    const { container } = setup({
      dnd: { dropTarget: { sectionId: 's', x: 0, y: 0, w: 3, h: 2, index: 3 } },
    });
    const line = container.querySelector<HTMLElement>('[class*="insertion-line"]')!;
    expect(line.style.left).toBe(`${310 - 10 + 8 - 1.5}px`);
    expect(line.style.height).toBe('50px');
  });

  it('ignores drop targets of other sections', () => {
    const { container } = setup({
      dnd: { dropTarget: { sectionId: 'other', x: 0, y: 0, w: 3, h: 2, index: 1 } },
    });
    expect(sectionEl(container).hasAttribute('data-vantage-drop-target')).toBe(false);
    expect(container.querySelector('[class*="insertion-line"]')).toBeNull();
  });

  it('shows no line for a grid-style drop target without index', () => {
    const { container } = setup({
      dnd: { dropTarget: { sectionId: 's', x: 0, y: 0, w: 3, h: 2 } },
    });
    expect(sectionEl(container).hasAttribute('data-vantage-drop-target')).toBe(true);
    expect(container.querySelector('[class*="insertion-line"]')).toBeNull();
  });

  it('shows no line when the section has no blocks to line up with', () => {
    const { container } = setup({
      section: section({ items: [] }),
      dnd: { dropTarget: { sectionId: 's', x: 0, y: 0, w: 3, h: 2, index: 0 } },
    });
    expect(container.querySelector('[class*="insertion-line"]')).toBeNull();
  });

  it('marks the section a drag starts from', () => {
    const { container } = setup({ dnd: { dragSourceSectionId: 's' } });
    expect(sectionEl(container).className).toMatch(/drag-source/);
  });

  it('does not mark other sections as drag source', () => {
    const { container } = setup({ dnd: { dragSourceSectionId: 'other' } });
    expect(sectionEl(container).className).not.toMatch(/drag-source/);
  });
});

describe('ArrangementSectionView drop handle', () => {
  it('registers with the canvas under its id and unregisters on unmount', () => {
    const { registerSection, unregister, handles, container, unmount } = setup();
    expect(registerSection).toHaveBeenCalledTimes(1);
    expect(registerSection.mock.calls[0]![0]).toBe('s');
    expect(handles[0]!.getElement()).toBe(frameEl(container));
    expect(unregister).not.toHaveBeenCalled();
    unmount();
    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it('positions by pointer and reports no intrinsic block size', () => {
    const { handles } = setup();
    expect(handles[0]!.byPointer).toBe(true);
    expect(handles[0]!.blockSize(3, 2)).toEqual({ width: 0, height: 0 });
  });

  it('maps a pointer position to an insertion index among the blocks', () => {
    const { handles } = setup();
    const { cellAt } = handles[0]!;
    expect(cellAt(20, 30, 3, 2)).toEqual({ x: 0, y: 0, w: 3, h: 2, index: 0 });
    expect(cellAt(150, 30, 3, 2).index).toBe(1);
    expect(cellAt(300, 30, 3, 2).index).toBe(3);
  });

  it('leaves the excluded block out when computing the index', () => {
    const { handles } = setup();
    const { cellAt } = handles[0]!;
    expect(cellAt(300, 30, 3, 2, 'a').index).toBe(2);
    expect(cellAt(20, 30, 3, 2, 'a').index).toBe(0);
  });

  it('ignores the block that is being dragged', () => {
    const { handles, container } = setup();
    container
      .querySelector('[data-vantage-arrangement-cell="c"]')!
      .setAttribute('data-vantage-dragging', '');
    expect(handles[0]!.cellAt(300, 30, 3, 2).index).toBe(2);
  });

  const dragEnd = (id: string | undefined, centre: { x: number; y: number } | null): DragEndEvent =>
    ({
      active: {
        data: { current: id ? { item: { id } } : undefined },
        rect: {
          current: {
            translated: centre
              ? { left: centre.x - 50, top: centre.y - 25, width: 100, height: 50 }
              : null,
          },
        },
      },
    }) as unknown as DragEndEvent;

  const order = (onChange: ReturnType<typeof vi.fn>) =>
    (onChange.mock.calls.at(-1)![0] as Layout).sections[0]!.items.map((i) => i.id);

  it('moves the dropped block to the index under its centre', () => {
    const { handles, onChange } = setup();
    handles[0]!.dropWithin(dragEnd('a', { x: 260, y: 30 }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(order(onChange)).toEqual(['b', 'a', 'c']);
  });

  it('moves a block to the end', () => {
    const { handles, onChange } = setup();
    handles[0]!.dropWithin(dragEnd('a', { x: 305, y: 30 }));
    expect(order(onChange)).toEqual(['b', 'c', 'a']);
  });

  it('moves a block to the front', () => {
    const { handles, onChange } = setup();
    handles[0]!.dropWithin(dragEnd('c', { x: 20, y: 30 }));
    expect(order(onChange)).toEqual(['c', 'a', 'b']);
  });

  it('emits nothing when the block lands where it already is', () => {
    const { handles, onChange } = setup();
    handles[0]!.dropWithin(dragEnd('a', { x: 20, y: 30 }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('emits nothing without a dragged block or its rect', () => {
    const { handles, onChange } = setup();
    handles[0]!.dropWithin(dragEnd(undefined, { x: 260, y: 30 }));
    handles[0]!.dropWithin(dragEnd('a', null));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the same registration across renders but drops with the latest layout', () => {
    const { handles, onChange, registerSection, rerender } = setup();
    const reordered = section({ items: [item('c'), item('b'), item('a')] });
    const next = build({ section: reordered });
    rerender(next.tree(reordered, { ...next.builderValue, onChange } as BuilderContextValue));
    expect(registerSection).toHaveBeenCalledTimes(1);
    // blocks now in DOM order c, b, a; dragging c over a's rect lands before a (index 1 of [b, a])
    handles[0]!.dropWithin(dragEnd('c', { x: 20, y: 30 }));
    expect(order(onChange)).toEqual(['b', 'c', 'a']);
  });
});
