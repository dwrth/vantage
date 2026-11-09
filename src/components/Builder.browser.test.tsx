import { cleanup, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import builder from '../styles/builder.module.css';
import { VantageThemeProvider } from '../theme/VantageThemeProvider';
import type { ComponentRegistry, GridItem, Layout, Section } from '../types';
import { VantageBuilder, type VantageBuilderProps } from './Builder';

/*
 * Real layout in Chromium. The builder sits in a 1152px wide box, so a 12-column section without
 * gaps or padding has 96px cells and 48px rows, and the grid starts at the box's top-left corner.
 */
const WIDTH = 1152;
const CELL = 96;
const ROW = 48;

type BlockData = { height?: number };

const components: ComponentRegistry = {
  block: {
    component: ({ item }: { item: GridItem<BlockData> }) => (
      <div style={{ height: item.data?.height }} />
    ),
    defaults: { w: 2, h: 1 },
  },
};

const block = (id: string, x: number, y: number, w: number, h: number, height?: number) => ({
  id,
  kind: 'block',
  x,
  y,
  w,
  h,
  data: height === undefined ? undefined : { height },
});

const section = (id: string, items: GridItem[], rest: Partial<Section> = {}): Section => ({
  id,
  columns: 12,
  colGap: 0,
  rowGap: 0,
  paddingTop: 0,
  paddingBottom: 0,
  rows: 4,
  items,
  ...rest,
});

const layoutOf = (...sections: Section[]): Layout => ({
  breakpoints: ['desktop', 'tablet', 'mobile'],
  breakpointWidths: {},
  breakpointPreviewWidths: { tablet: 768, mobile: 390 },
  sections,
});

afterEach(() => cleanup());

type ExtraProps = Partial<Omit<VantageBuilderProps, 'value' | 'onChange' | 'components'>>;

/** Mounts the builder as a host would: controlled, applying every change. */
function mount(initial: Layout, props: ExtraProps = {}) {
  const changes: Layout[] = [];
  function Host(extra: ExtraProps) {
    const [value, setValue] = useState(initial);
    return (
      <div style={{ width: WIDTH }}>
        <VantageBuilder
          value={value}
          onChange={(next) => {
            changes.push(next);
            setValue(next);
          }}
          components={components}
          showSectionActions={false}
          {...extra}
        />
      </div>
    );
  }
  const { rerender } = render(<Host {...props} />);
  return {
    changes,
    last: () => changes.at(-1),
    update: (next: ExtraProps) => rerender(<Host {...props} {...next} />),
  };
}

const gridEl = (sectionId: string) =>
  document.querySelector<HTMLElement>(`[data-vantage-section-frame="${sectionId}"]`)!;

const blockEl = (sectionId: string, itemId: string) =>
  document.querySelector<HTMLElement>(
    `[data-vantage-block="${sectionId}:${itemId}"][role="group"]`,
  );

const handleOf = (sectionId: string, itemId: string, selector: string) =>
  document.querySelector<HTMLElement>(`[data-vantage-block="${sectionId}:${itemId}"] ${selector}`)!;

const rectOf = (el: Element) => el.getBoundingClientRect();

const center = (el: Element) => {
  const r = rectOf(el);
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** Cells a block covers, measured from the rendered DOM. */
function measuredCell(sectionId: string, itemId: string) {
  const el = blockEl(sectionId, itemId);
  if (!el) return null;
  const g = rectOf(gridEl(sectionId));
  const b = rectOf(el);
  return {
    x: (b.left - g.left) / CELL,
    y: (b.top - g.top) / ROW,
    w: b.width / CELL,
    h: b.height / ROW,
  };
}

const itemIn = (layout: Layout | undefined, sectionId: string, itemId: string) =>
  layout?.sections.find((s) => s.id === sectionId)?.items.find((i) => i.id === itemId);

/** The grids have measured their rows (the builder snaps to measured rows from then on). */
async function ready(...sectionIds: string[]) {
  for (const id of sectionIds) {
    await expect
      .poll(() => gridEl(id)?.querySelector(`.${builder['grid-overlay']}`))
      .not.toBeNull();
  }
}

type Point = { x: number; y: number };

/** Press at `from`, move past the 4px activation distance, move to `to` and release. */
async function drag(from: Point, to: Point) {
  await userEvent.pointer([
    { coords: from },
    { keys: '[MouseLeft>]' },
    { coords: { x: from.x + 6, y: from.y + 6 } },
    { coords: to },
    { keys: '[/MouseLeft]' },
  ]);
}

async function dragBy(el: Element, dx: number, dy: number) {
  const from = center(el);
  await drag(from, { x: from.x + dx, y: from.y + dy });
}

describe('rendered geometry', () => {
  it('places blocks on 96px cells and 48px rows', async () => {
    mount(layoutOf(section('a', [block('b1', 1, 1, 2, 1), block('b2', 4, 0, 3, 2)])));
    await ready('a');
    expect(measuredCell('a', 'b1')).toEqual({ x: 1, y: 1, w: 2, h: 1 });
    expect(measuredCell('a', 'b2')).toEqual({ x: 4, y: 0, w: 3, h: 2 });
    expect(rectOf(gridEl('a')).height).toBe(4 * ROW);
  });
});

describe('section max width', () => {
  it('gives a 14-column section narrower cells and rows under the cap, and snaps to them', async () => {
    const box = 1600;
    const cell = 1152 / 14;
    const changes: Layout[] = [];
    function Host() {
      const [value, setValue] = useState(
        layoutOf(section('a', [block('b1', 0, 0, 7, 2)], { columns: 14 })),
      );
      return (
        <div style={{ width: box }}>
          <VantageThemeProvider tokens={{ '--vantage-section-max-px': '1152px' }}>
            <VantageBuilder
              value={value}
              onChange={(next) => {
                changes.push(next);
                setValue(next);
              }}
              components={components}
              showSectionActions={false}
            />
          </VantageThemeProvider>
        </div>
      );
    }
    render(<Host />);
    await ready('a');
    const grid = rectOf(gridEl('a'));
    const b = rectOf(blockEl('a', 'b1')!);
    expect(b.left - grid.left).toBeCloseTo((box - 1152) / 2, 0);
    expect(b.width).toBeCloseTo(7 * cell, 0);
    expect(b.height).toBeCloseTo(2 * (cell / 2), 0);
    await dragBy(handleOf('a', 'b1', '[data-vantage-drag-handle]'), 3 * cell, cell / 2);
    await expect.poll(() => changes.length).toBe(1);
    expect(itemIn(changes.at(-1), 'a', 'b1')).toMatchObject({ x: 3, y: 1, w: 7, h: 2 });
  });
});

describe('dragging a block by its handle', () => {
  it('lands on the cell the pointer moved it to', async () => {
    const { changes, last } = mount(layoutOf(section('a', [block('b1', 1, 1, 2, 1)])));
    await ready('a');
    await dragBy(handleOf('a', 'b1', '[data-vantage-drag-handle]'), 3 * CELL, 2 * ROW);
    await expect.poll(() => changes.length).toBe(1);
    expect(itemIn(last(), 'a', 'b1')).toMatchObject({ x: 4, y: 3, w: 2, h: 1 });
    await expect.poll(() => measuredCell('a', 'b1')).toEqual({ x: 4, y: 3, w: 2, h: 1 });
  });

  it('snaps to the nearest cell', async () => {
    const { changes, last } = mount(layoutOf(section('a', [block('b1', 5, 0, 2, 1)])));
    await ready('a');
    await dragBy(handleOf('a', 'b1', '[data-vantage-drag-handle]'), 2.6 * CELL, 1.4 * ROW);
    await expect.poll(() => changes.length).toBe(1);
    expect(itemIn(last(), 'a', 'b1')).toMatchObject({ x: 8, y: 1 });
  });

  it('stops at the last row and the right edge instead of growing the section', async () => {
    const { changes, last } = mount(layoutOf(section('a', [block('b1', 1, 1, 2, 1)])));
    await ready('a');
    await dragBy(handleOf('a', 'b1', '[data-vantage-drag-handle]'), 20 * CELL, 8 * ROW);
    await expect.poll(() => changes.length).toBe(1);
    expect(itemIn(last(), 'a', 'b1')).toMatchObject({ x: 10, y: 3 });
    expect(last()!.sections[0].rows).toBe(4);
    await expect.poll(() => rectOf(gridEl('a')).height).toBe(4 * ROW);
  });

  it('moves a block into another section at the cell under it', async () => {
    const { changes, last } = mount(
      layoutOf(section('a', [block('b1', 0, 0, 2, 1)]), section('b', [])),
    );
    await ready('a', 'b');
    const source = rectOf(blockEl('a', 'b1')!);
    const target = rectOf(gridEl('b'));
    // Block top-left 10px past cell (3, 1) of b.
    const dx = target.left + 3 * CELL + 10 - source.left;
    const dy = target.top + ROW + 10 - source.top;
    await dragBy(handleOf('a', 'b1', '[data-vantage-drag-handle]'), dx, dy);
    await expect.poll(() => changes.length).toBe(1);
    expect(last()!.sections[0].items).toHaveLength(0);
    expect(last()!.sections[1].items).toEqual([expect.objectContaining({ x: 3, y: 1 })]);
    const moved = last()!.sections[1].items[0].id;
    await expect.poll(() => measuredCell('b', moved)).toEqual({ x: 3, y: 1, w: 2, h: 1 });
    expect(blockEl('a', 'b1')).toBeNull();
  });
});

describe('resizing a block by its handles', () => {
  it('grows by whole cells from the east and south handles', async () => {
    const { changes, last } = mount(layoutOf(section('a', [block('b1', 1, 0, 2, 1)])));
    await ready('a');
    await dragBy(handleOf('a', 'b1', '[data-edge="se"]'), 2.3 * CELL, 1.8 * ROW);
    await expect.poll(() => changes.length).toBe(1);
    expect(itemIn(last(), 'a', 'b1')).toMatchObject({ x: 1, y: 0, w: 4, h: 3 });
    await expect.poll(() => measuredCell('a', 'b1')).toEqual({ x: 1, y: 0, w: 4, h: 3 });
  });

  it('does not shrink below the content minimum', async () => {
    const { changes, last } = mount(layoutOf(section('a', [block('b1', 0, 0, 5, 3)])), {
      getItemMinSize: () => ({ w: 3, h: 2 }),
    });
    await ready('a');
    await dragBy(handleOf('a', 'b1', '[data-edge="se"]'), -4 * CELL, -2 * ROW);
    await expect.poll(() => changes.length).toBe(1);
    expect(itemIn(last(), 'a', 'b1')).toMatchObject({ w: 3, h: 2 });
    await expect.poll(() => measuredCell('a', 'b1')).toEqual({ x: 0, y: 0, w: 3, h: 2 });
  });

  it('stops at the section bottom and the last column', async () => {
    const { changes, last } = mount(layoutOf(section('a', [block('b1', 9, 2, 2, 1)])));
    await ready('a');
    await dragBy(handleOf('a', 'b1', '[data-edge="se"]'), 6 * CELL, 6 * ROW);
    await expect.poll(() => changes.length).toBe(1);
    expect(itemIn(last(), 'a', 'b1')).toMatchObject({ x: 9, y: 2, w: 3, h: 2 });
  });

  it('keeps the opposite edge when resizing from the west handle', async () => {
    const { changes, last } = mount(layoutOf(section('a', [block('b1', 4, 1, 2, 1)])));
    await ready('a');
    await dragBy(handleOf('a', 'b1', '[data-edge="w"]'), -3 * CELL, 0);
    await expect.poll(() => changes.length).toBe(1);
    expect(itemIn(last(), 'a', 'b1')).toMatchObject({ x: 1, w: 5 });
    await expect.poll(() => measuredCell('a', 'b1')).toEqual({ x: 1, y: 1, w: 5, h: 1 });
  });
});

describe('resizing a section by its bottom edge', () => {
  const resizeHandle = (sectionId: string) =>
    gridEl(sectionId).querySelector<HTMLElement>('[data-vantage-section-resize]')!;

  it('adds the rows the edge was dragged over', async () => {
    const { changes, last } = mount(layoutOf(section('a', [block('b1', 0, 0, 2, 1)])));
    await ready('a');
    await dragBy(resizeHandle('a'), 0, 2 * ROW + 10);
    await expect.poll(() => changes.length).toBe(1);
    expect(last()!.sections[0].rows).toBe(6);
    await expect.poll(() => rectOf(gridEl('a')).height).toBe(6 * ROW);
    expect(resizeHandle('a').getAttribute('aria-valuenow')).toBe('6');
  });

  it('does not shrink above the lowest block', async () => {
    const { changes, last } = mount(layoutOf(section('a', [block('b1', 0, 1, 2, 2)])));
    await ready('a');
    const from = center(resizeHandle('a'));
    await userEvent.pointer([
      { coords: from },
      { keys: '[MouseLeft>]' },
      { coords: { x: from.x, y: from.y - 4 * ROW } },
    ]);
    // The live preview while the edge is held stops there too.
    await expect.poll(() => rectOf(gridEl('a')).height).toBe(3 * ROW);
    await userEvent.pointer({ keys: '[/MouseLeft]' });
    await expect.poll(() => changes.length).toBe(1);
    expect(last()!.sections[0].rows).toBe(3);
    await expect.poll(() => rectOf(gridEl('a')).height).toBe(3 * ROW);
  });
});

describe('keyboard editing with real layout', () => {
  it('moves the focused block by one cell per arrow key', async () => {
    const { changes, last } = mount(layoutOf(section('a', [block('b1', 1, 1, 2, 1)])));
    await ready('a');
    await userEvent.click(blockEl('a', 'b1')!);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowDown}');
    await expect.poll(() => changes.length).toBe(3);
    expect(itemIn(last(), 'a', 'b1')).toMatchObject({ x: 3, y: 2 });
    await expect.poll(() => measuredCell('a', 'b1')).toEqual({ x: 3, y: 2, w: 2, h: 1 });
  });

  it('resizes with Shift+arrows down to the content minimum', async () => {
    const { changes, last } = mount(layoutOf(section('a', [block('b1', 0, 0, 4, 1)])), {
      getItemMinSize: () => ({ w: 3 }),
    });
    await ready('a');
    await userEvent.click(blockEl('a', 'b1')!);
    await userEvent.keyboard('{Shift>}{ArrowDown}{ArrowLeft}{ArrowLeft}{/Shift}');
    await expect.poll(() => itemIn(last(), 'a', 'b1')).toMatchObject({ w: 3, h: 2 });
    expect(changes).toHaveLength(2);
    await expect.poll(() => measuredCell('a', 'b1')).toEqual({ x: 0, y: 0, w: 3, h: 2 });
  });
});

describe('section height without fixed rows', () => {
  it('spans the rows its blocks reach', async () => {
    mount(layoutOf(section('a', [block('b1', 0, 1, 2, 2)], { rows: undefined })));
    await ready('a');
    expect(rectOf(gridEl('a')).height).toBe(3 * ROW);
  });

  it('shrinks to the remaining content when the lowest block is deleted', async () => {
    const { changes } = mount(
      layoutOf(
        section('a', [block('b1', 0, 0, 2, 1), block('b2', 4, 2, 2, 3)], { rows: undefined }),
      ),
    );
    await ready('a');
    expect(rectOf(gridEl('a')).height).toBe(5 * ROW);
    await userEvent.click(blockEl('a', 'b2')!);
    await userEvent.click(handleOf('a', 'b2', 'button[aria-label^="Delete"]'));
    await expect.poll(() => changes.length).toBe(1);
    await expect.poll(() => rectOf(gridEl('a')).height).toBe(ROW);
  });
});

describe('row gaps', () => {
  it('snaps drags to the measured row pitch', async () => {
    const GAP = 16;
    const { changes, last } = mount(
      layoutOf(section('a', [block('b1', 0, 0, 2, 1)], { rowGap: GAP, rows: 4 })),
    );
    await ready('a');
    expect(rectOf(gridEl('a')).height).toBe(4 * ROW + 3 * GAP);
    await dragBy(handleOf('a', 'b1', '[data-vantage-drag-handle]'), 0, 2 * (ROW + GAP) + 20);
    await expect.poll(() => changes.length).toBe(1);
    expect(itemIn(last(), 'a', 'b1')).toMatchObject({ x: 0, y: 2 });
    await expect
      .poll(() => rectOf(blockEl('a', 'b1')!).top - rectOf(gridEl('a')).top)
      .toBe(2 * (ROW + GAP));
  });
});

describe('breakpoints', () => {
  const trackCount = (sectionId: string) =>
    getComputedStyle(gridEl(sectionId)).gridTemplateColumns.split(' ').length;

  it('renders the columns and preview width of the active breakpoint', async () => {
    const responsive = section('a', [block('b1', 6, 0, 6, 1)], {
      overrides: { tablet: { columns: 8 }, mobile: { columns: 4 } },
    });
    const { update } = mount(layoutOf(responsive), {
      activeBreakpoint: 'desktop',
    });
    await ready('a');
    // Columns plus the two side gutters.
    expect(trackCount('a')).toBe(12 + 2);
    expect(rectOf(gridEl('a')).width).toBe(WIDTH);

    update({ activeBreakpoint: 'mobile' });
    await expect.poll(() => rectOf(gridEl('a')).width).toBe(390);
    expect(trackCount('a')).toBe(4 + 2);
    const grid = rectOf(gridEl('a'));
    const b1 = rectOf(blockEl('a', 'b1')!);
    expect(b1.left).toBeGreaterThanOrEqual(grid.left);
    expect(b1.right).toBeLessThanOrEqual(grid.right);
    expect(b1.width % CELL).toBe(0);

    update({ activeBreakpoint: 'tablet' });
    await expect.poll(() => rectOf(gridEl('a')).width).toBe(768);
    expect(trackCount('a')).toBe(8 + 2);
  });
});

describe('arrangement section', () => {
  const cells = (sectionId: string) =>
    Array.from(
      gridEl(sectionId).querySelectorAll<HTMLElement>('[data-vantage-arrangement-cell]'),
      (el) => rectOf(el),
    );

  it('flows blocks into columns and rows and is as tall as its content', async () => {
    const GAP = 16;
    const flow = section(
      'f',
      [
        block('a', 0, 0, 1, 1, 60),
        block('b', 0, 0, 1, 1, 100),
        block('c', 0, 0, 1, 1, 80),
        block('d', 0, 0, 1, 1, 50),
      ],
      { arrangement: { preset: 'three' }, rows: 12, colGap: GAP, rowGap: GAP },
    );
    mount(layoutOf(flow));
    await expect.poll(() => cells('f')).toHaveLength(4);
    const [a, b, c, d] = cells('f');
    expect([b.top, c.top]).toEqual([a.top, a.top]);
    expect(b.left - a.right).toBe(GAP);
    expect(c.left - b.right).toBe(GAP);
    expect(b.width).toBeCloseTo(a.width, 0);
    expect(d.left).toBe(a.left);
    // Cells are as tall as their content (plus the same chrome each): the tallest sets the row.
    expect([b.height - a.height, c.height - a.height]).toEqual([40, 20]);
    expect(d.top - a.top).toBe(b.height + GAP);
    expect(rectOf(gridEl('f')).height).toBe(d.bottom - a.top);
  });

  it('previews the drop in a slot while hovering and drops where the slot was', async () => {
    const flow = section(
      'f',
      ['a', 'b', 'c', 'd'].map((id) => block(id, 0, 0, 1, 1, 60)),
      { arrangement: { preset: 'three' }, colGap: 16, rowGap: 16 },
    );
    const { last } = mount(layoutOf(flow));
    await expect.poll(() => cells('f')).toHaveLength(4);
    const cellEl = (id: string) =>
      gridEl('f').querySelector<HTMLElement>(`[data-vantage-arrangement-cell="${id}"]`)!;
    const slotEl = () => gridEl('f').querySelector<HTMLElement>('[data-vantage-drop-slot]');
    const [a, b, c] = ['a', 'b', 'c'].map((id) => rectOf(cellEl(id)));
    expect(slotEl()).toBeNull();

    // Drag d (second row) by its handle over the left part of a.
    const from = center(handleOf('f', 'd', '[data-vantage-drag-handle]'));
    await userEvent.pointer([
      { coords: from },
      { keys: '[MouseLeft>]' },
      { coords: { x: from.x + 6, y: from.y + 6 } },
      { coords: { x: a!.left + 10, y: a!.top + 20 } },
    ]);
    await expect.poll(() => slotEl()?.getAttribute('data-vantage-drop-slot')).toBe('active');
    const slot = rectOf(slotEl()!);
    expect(slot.left).toBe(a!.left);
    expect(slot.top).toBe(a!.top);
    expect(slot.width).toBeCloseTo(a!.width, 0);
    // a and b move one slot right, c wraps to the second row; nothing is written yet.
    expect(rectOf(cellEl('a')).left).toBe(b!.left);
    expect(rectOf(cellEl('b')).left).toBe(c!.left);
    expect(rectOf(cellEl('c')).left).toBe(a!.left);
    expect(rectOf(cellEl('c')).top).toBeGreaterThan(a!.bottom);
    expect(last()).toBeUndefined();

    await userEvent.pointer({ keys: '[/MouseLeft]' });
    expect(last()?.sections[0]!.items.map((item) => item.id)).toEqual(['d', 'a', 'b', 'c']);
    await expect.poll(() => slotEl()).toBeNull();
    expect(rectOf(cellEl('d')).left).toBe(a!.left);
    expect(rectOf(cellEl('d')).top).toBe(a!.top);
  });

  it('removes the preview without a change when the drag leaves for another section', async () => {
    const flow = section(
      'f',
      ['a', 'b'].map((id) => block(id, 0, 0, 1, 1, 60)),
      { arrangement: { preset: 'three' } },
    );
    const { last } = mount(layoutOf(flow, section('g', [])));
    await expect.poll(() => cells('f')).toHaveLength(2);
    const before = cells('f');
    const from = center(handleOf('f', 'b', '[data-vantage-drag-handle]'));
    await userEvent.pointer([
      { coords: from },
      { keys: '[MouseLeft>]' },
      { coords: { x: from.x + 6, y: from.y + 6 } },
      { coords: { x: before[0]!.left + 10, y: before[0]!.top + 10 } },
    ]);
    await expect
      .poll(() => gridEl('f').querySelector('[data-vantage-drop-slot="active"]'))
      .not.toBeNull();
    const below = rectOf(gridEl('g'));
    await userEvent.pointer({ coords: { x: below.left + 50, y: below.top + 50 } });
    await expect
      .poll(() =>
        gridEl('f')
          .querySelector('[data-vantage-drop-slot]')
          ?.getAttribute('data-vantage-drop-slot'),
      )
      .toBe('inactive');
    expect(cells('f')[0]!.left).toBe(before[0]!.left);
    await userEvent.keyboard('{Escape}');
    await userEvent.pointer({ keys: '[/MouseLeft]' });
    expect(last()).toBeUndefined();
    await expect.poll(() => gridEl('f').querySelector('[data-vantage-drop-slot]')).toBeNull();
  });
});
