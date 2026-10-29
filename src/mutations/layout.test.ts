import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveItem } from '../lib/breakpoint';
import { isValidLayout } from '../lib/validate';
import type { ComponentRegistry, GridItem, Layout, Section } from '../types';
import {
  addItem,
  addSection,
  autoArrangeBreakpoint,
  bringItemForward,
  bringItemToFront,
  clearItemOverride,
  clearSectionOverride,
  createEmptyLayout,
  exportLayout,
  importLayout,
  moveItem,
  moveItemToSection,
  removeItem,
  removeSection,
  reorderItemAtIndex,
  resizeItem,
  sendItemBackward,
  sendItemToBack,
  setBreakpointWidth,
  setItemHidden,
  setLayoutBreakpoints,
  setSectionOverride,
  updateItemData,
  updateSection,
} from './layout';

function item(id: string, x: number, y: number, w: number, h: number, data?: unknown): GridItem {
  return { id, x, y, w, h, kind: 'block', data };
}

function section(id: string, items: GridItem[], extra: Partial<Section> = {}): Section {
  return { id, columns: 12, colGap: 8, rowGap: 8, items, ...extra };
}

function layoutOf(...sections: Section[]): Layout {
  return {
    sections,
    breakpoints: ['desktop', 'tablet', 'mobile'],
    breakpointWidths: { mobile: 640, tablet: 1023 },
    breakpointPreviewWidths: { mobile: 390, tablet: 768 },
  };
}

const find = (layout: Layout, sectionId = 's') => layout.sections.find((s) => s.id === sectionId)!;
const ids = (layout: Layout, sectionId = 's') => find(layout, sectionId).items.map((i) => i.id);
const findItem = (layout: Layout, itemId: string, sectionId = 's') =>
  find(layout, sectionId).items.find((i) => i.id === itemId)!;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sections', () => {
  it('creates a valid empty layout with desktop and mobile', () => {
    const layout = createEmptyLayout();
    expect(layout).toEqual({
      sections: [],
      breakpoints: ['desktop', 'mobile'],
      breakpointWidths: { mobile: 640 },
      breakpointPreviewWidths: { mobile: 390 },
    });
    expect(isValidLayout(layout)).toBe(true);
  });

  it('appends numbered sections with the default shape and removes them by id', () => {
    const first = addSection(createEmptyLayout());
    const second = addSection(first.layout);
    expect(second.layout.sections.map((s) => s.label)).toEqual(['Section 1', 'Section 2']);
    expect(find(second.layout, second.sectionId)).toMatchObject({
      columns: 12,
      rows: 4,
      items: [],
    });
    const removed = removeSection(second.layout, first.sectionId);
    expect(removed.sections.map((s) => s.id)).toEqual([second.sectionId]);
  });

  it('patches only the target section and keeps the others by reference', () => {
    const layout = layoutOf(section('s', []), section('t', []));
    const next = updateSection(layout, 's', { label: 'Hero', colGap: 0 });
    expect(find(next)).toMatchObject({ label: 'Hero', colGap: 0 });
    expect(find(next, 't')).toBe(find(layout, 't'));
  });
});

describe('addItem', () => {
  it('appends below existing content with numbered labels per kind', () => {
    const layout = layoutOf(section('s', [item('a', 0, 0, 4, 3)]));
    const next = addItem(layout, 's', 'block', { id: 'b', w: 6, h: 1 });
    expect(findItem(next, 'b')).toMatchObject({ x: 0, y: 3, w: 6, h: 1, label: 'Block 2' });
    expect(ids(next)).toEqual(['a', 'b']);
  });

  it('uses 3x2 and a capitalised kind label by default', () => {
    const next = addItem(layoutOf(section('s', [])), 's', 'text', { id: 'n' });
    expect(findItem(next, 'n')).toMatchObject({ x: 0, y: 0, w: 3, h: 2, label: 'Text 1' });
  });

  it('clamps an explicit drop position into the grid', () => {
    const next = addItem(layoutOf(section('s', [], { rows: 4 })), 's', 'block', {
      id: 'n',
      x: 11,
      y: 9,
      w: 4,
      h: 2,
    });
    expect(findItem(next, 'n')).toMatchObject({ x: 8, y: 2, w: 4, h: 2 });
  });

  it('falls back to a generated id when the requested one is taken', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const next = addItem(layoutOf(section('s', [item('a', 0, 0, 1, 1)])), 's', 'block', {
      id: 'a',
    });
    expect(ids(next)).toHaveLength(2);
    expect(new Set(ids(next)).size).toBe(2);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('carries ref, data and meta', () => {
    const next = addItem(layoutOf(section('s', [])), 's', 'block', {
      id: 'n',
      ref: 'r1',
      data: { a: 1 },
      meta: { m: true },
    });
    expect(findItem(next, 'n')).toMatchObject({ ref: 'r1', data: { a: 1 }, meta: { m: true } });
  });
});

describe('moveItem / resizeItem', () => {
  it('moves on desktop and keeps the item inside the columns', () => {
    const layout = layoutOf(section('s', [item('a', 0, 0, 4, 2)], { rows: 10 }));
    expect(findItem(moveItem(layout, 's', 'a', 10, 3), 'a')).toMatchObject({ x: 8, y: 3, w: 4 });
  });

  it('writes non-desktop moves to that breakpoint only', () => {
    const layout = layoutOf(
      section('s', [item('a', 0, 0, 4, 2)], { rows: 10, overrides: { mobile: { columns: 4 } } }),
    );
    const next = moveItem(layout, 's', 'a', 2, 1, 'mobile');
    expect(findItem(next, 'a')).toMatchObject({ x: 0, y: 0 });
    // Width 4 on 4 mobile columns: x clamps back to 0.
    expect(find(next).overrides?.mobile?.items?.a).toEqual({ x: 0, y: 1, w: 4, h: 2 });
    expect(find(next).overrides?.tablet).toBeUndefined();
  });

  it('resizes on desktop with clamping and per breakpoint via overrides', () => {
    const layout = layoutOf(section('s', [item('a', 0, 0, 4, 2)], { rows: 10 }));
    expect(findItem(resizeItem(layout, 's', 'a', 2, 1, 20, 3), 'a')).toMatchObject({
      x: 0,
      y: 1,
      w: 12,
      h: 3,
    });
    const tablet = resizeItem(layout, 's', 'a', 1, 0, 2, 2, 'tablet');
    expect(findItem(tablet, 'a')).toMatchObject({ x: 0, w: 4 });
    expect(find(tablet).overrides?.tablet?.items?.a).toEqual({ x: 1, y: 0, w: 2, h: 2 });
  });

  it('leaves unknown sections and items untouched', () => {
    const layout = layoutOf(section('s', [item('a', 0, 0, 4, 2)], { rows: 10 }));
    expect(find(moveItem(layout, 'nope', 'a', 1, 1))).toBe(find(layout));
    expect(findItem(moveItem(layout, 's', 'nope', 1, 1), 'a')).toBe(findItem(layout, 'a'));
  });
});

describe('moveItemToSection', () => {
  it('moves the item with its identity and drops stale override positions', () => {
    const a = { ...item('a', 0, 0, 4, 2, { t: 1 }), ref: 'r', meta: { m: 1 } };
    const layout = layoutOf(
      section('s', [a], {
        rows: 4,
        overrides: { mobile: { items: { a: { x: 1, hidden: true, data: { t: 2 } } } } },
      }),
      section('t', [item('b', 0, 0, 2, 1)], { rows: 6 }),
    );
    const next = moveItemToSection(layout, 's', 'a', 't', { x: 6, y: 2 });
    expect(ids(next)).toEqual([]);
    expect(find(next).overrides).toBeUndefined();
    expect(ids(next, 't')).toEqual(['b', 'a']);
    expect(findItem(next, 'a', 't')).toMatchObject({ x: 6, y: 2, ref: 'r', data: { t: 1 } });
    expect(find(next, 't').overrides?.mobile?.items?.a).toEqual({ hidden: true, data: { t: 2 } });
  });

  it('gives the item a new id when the target already uses it', () => {
    const layout = layoutOf(
      section('s', [item('a', 0, 0, 1, 1)]),
      section('t', [item('a', 0, 0, 1, 1)]),
    );
    const next = moveItemToSection(layout, 's', 'a', 't');
    expect(ids(next, 't')).toHaveLength(2);
    expect(new Set(ids(next, 't')).size).toBe(2);
  });

  it('is a no-op for unknown ids and a plain move within the same section', () => {
    const layout = layoutOf(section('s', [item('a', 0, 0, 1, 1)], { rows: 4 }));
    expect(moveItemToSection(layout, 's', 'a', 'missing')).toBe(layout);
    expect(moveItemToSection(layout, 's', 'a', 's')).toBe(layout);
    expect(findItem(moveItemToSection(layout, 's', 'a', 's', { x: 3 }), 'a')).toMatchObject({
      x: 3,
      y: 0,
    });
  });

  it('writes the target position as an override when dropped on a non-desktop grid', () => {
    const layout = layoutOf(
      section('s', [item('a', 0, 0, 2, 1)]),
      section('t', [item('b', 0, 0, 2, 2)], { rows: 6 }),
    );
    const next = moveItemToSection(layout, 's', 'a', 't', { x: 1, y: 3, breakpoint: 'mobile' });
    expect(findItem(next, 'a', 't')).toMatchObject({ x: 0, y: 2 });
    expect(find(next, 't').overrides?.mobile?.items?.a).toMatchObject({ x: 1, y: 3 });
  });
});

describe('removeItem', () => {
  it('removes the item and its overrides, pruning empty override objects', () => {
    const layout = layoutOf(
      section('s', [item('a', 0, 0, 1, 1), item('b', 0, 1, 1, 1)], {
        overrides: { mobile: { items: { a: { hidden: true } } }, tablet: { columns: 6 } },
      }),
    );
    const next = removeItem(layout, 's', 'a');
    expect(ids(next)).toEqual(['b']);
    expect(find(next).overrides).toEqual({ tablet: { columns: 6 } });
  });
});

describe('layering', () => {
  const layout = layoutOf(
    section('s', [item('a', 0, 0, 1, 1), item('b', 0, 0, 1, 1), item('c', 0, 0, 1, 1)]),
  );

  it('steps forward and backward, stopping at the ends', () => {
    expect(ids(bringItemForward(layout, 's', 'a'))).toEqual(['b', 'a', 'c']);
    expect(ids(bringItemForward(layout, 's', 'c'))).toEqual(['a', 'b', 'c']);
    expect(ids(sendItemBackward(layout, 's', 'c'))).toEqual(['a', 'c', 'b']);
    expect(ids(sendItemBackward(layout, 's', 'a'))).toEqual(['a', 'b', 'c']);
  });

  it('jumps to the front or back', () => {
    expect(ids(bringItemToFront(layout, 's', 'a'))).toEqual(['b', 'c', 'a']);
    expect(ids(sendItemToBack(layout, 's', 'c'))).toEqual(['c', 'a', 'b']);
  });

  it('reorders by index and ignores out-of-range indexes', () => {
    expect(ids(reorderItemAtIndex(layout, 's', 0, 2))).toEqual(['b', 'c', 'a']);
    expect(reorderItemAtIndex(layout, 's', 1, 1)).toBe(layout);
    expect(ids(reorderItemAtIndex(layout, 's', 0, 5))).toEqual(['a', 'b', 'c']);
  });
});

describe('overrides', () => {
  it('hides items on non-desktop breakpoints only', () => {
    const layout = layoutOf(section('s', [item('a', 0, 0, 1, 1)]));
    expect(setItemHidden(layout, 's', 'a', 'desktop', true)).toBe(layout);
    const hidden = setItemHidden(layout, 's', 'a', 'mobile', true);
    expect(resolveItem(findItem(hidden, 'a'), find(hidden), 'mobile').hidden).toBe(true);
    expect(resolveItem(findItem(hidden, 'a'), find(hidden), 'tablet').hidden).toBe(false);
  });

  it('merges item data on desktop and into the override elsewhere', () => {
    const layout = layoutOf(section('s', [item('a', 0, 0, 1, 1, { text: 'x', size: 1 })]));
    const desktop = updateItemData(layout, 's', 'a', { size: 2 });
    expect(findItem(desktop, 'a').data).toEqual({ text: 'x', size: 2 });
    const mobile = updateItemData(
      updateItemData(layout, 's', 'a', { size: 3 }, 'mobile'),
      's',
      'a',
      {
        bold: true,
      },
      'mobile',
    );
    expect(findItem(mobile, 'a').data).toEqual({ text: 'x', size: 1 });
    expect(find(mobile).overrides?.mobile?.items?.a?.data).toEqual({ size: 3, bold: true });
  });

  it('sets and clears section and item overrides', () => {
    const layout = layoutOf(section('s', [item('a', 0, 0, 1, 1)]));
    const set = setSectionOverride(layout, 's', 'mobile', { columns: 4, rowGap: 2 });
    expect(find(set).overrides).toEqual({ mobile: { columns: 4, rowGap: 2 } });
    expect(find(clearSectionOverride(set, 's', 'mobile')).overrides).toBeUndefined();

    const moved = moveItem(layout, 's', 'a', 2, 0, 'tablet');
    expect(find(moved).overrides?.tablet?.items?.a).toBeDefined();
    const cleared = clearItemOverride(moved, 's', 'tablet', 'a');
    // The pinned tablet rows stay; the item override goes.
    expect(find(cleared).overrides?.tablet?.items).toBeUndefined();
  });
});

describe('breakpoint config', () => {
  it('drops overrides and widths of disabled breakpoints', () => {
    const layout = layoutOf(
      section('s', [], { overrides: { tablet: { columns: 6 }, mobile: { columns: 4 } } }),
    );
    const next = setLayoutBreakpoints(layout, ['desktop', 'mobile']);
    expect(next.breakpoints).toEqual(['desktop', 'mobile']);
    expect(next.breakpointWidths).toEqual({ mobile: 640 });
    expect(find(next).overrides).toEqual({ mobile: { columns: 4 } });
    expect(setLayoutBreakpoints(layout, ['mobile']).breakpoints).toEqual(['desktop']);
  });

  it('keeps tablet wider than mobile when widths change', () => {
    const next = setBreakpointWidth(layoutOf(), 'mobile', 1100);
    expect(next.breakpointWidths).toEqual({ mobile: 1100, tablet: 1101 });
    const disabled = setLayoutBreakpoints(layoutOf(), ['desktop']);
    expect(setBreakpointWidth(disabled, 'mobile', 500)).toBe(disabled);
  });
});

describe('autoArrangeBreakpoint', () => {
  const layout = layoutOf(
    section('s', [item('a', 0, 0, 6, 2), item('b', 6, 0, 6, 3), item('c', 0, 4, 12, 1)], {
      overrides: { mobile: { items: { c: { hidden: true } } } },
    }),
  );

  it('scales desktop placement onto the tablet columns', () => {
    const next = autoArrangeBreakpoint(layout, 'tablet');
    expect(find(next).overrides?.tablet).toEqual({
      columns: 8,
      items: {
        a: { x: 0, y: 0, w: 4, h: 2 },
        b: { x: 4, y: 0, w: 4, h: 3 },
        c: { x: 0, y: 4, w: 8, h: 1 },
      },
    });
  });

  it('stacks visible items at full mobile width and keeps hidden flags', () => {
    const next = autoArrangeBreakpoint(layout, 'mobile');
    expect(find(next).overrides?.mobile).toEqual({
      columns: 4,
      items: {
        a: { x: 0, y: 0, w: 4, h: 2 },
        b: { x: 0, y: 2, w: 4, h: 3 },
        c: { hidden: true },
      },
    });
  });

  it('keeps overlapping items together as one group', () => {
    const stacked = layoutOf(
      section('s', [item('img', 0, 0, 12, 4), item('txt', 6, 1, 6, 2), item('foot', 0, 5, 6, 1)]),
    );
    const items = find(autoArrangeBreakpoint(stacked, 'mobile')).overrides?.mobile?.items;
    expect(items).toEqual({
      img: { x: 0, y: 0, w: 4, h: 4 },
      txt: { x: 2, y: 1, w: 2, h: 2 },
      foot: { x: 0, y: 4, w: 4, h: 1 },
    });
  });

  it('can arrange a single section and ignores disabled breakpoints', () => {
    const two = layoutOf(
      section('s', [item('a', 0, 0, 6, 2)]),
      section('t', [item('b', 0, 0, 6, 2)]),
    );
    const next = autoArrangeBreakpoint(two, 'mobile', 't');
    expect(find(next)).toBe(find(two));
    expect(find(next, 't').overrides?.mobile).toBeDefined();
    const desktopOnly = setLayoutBreakpoints(two, ['desktop']);
    expect(autoArrangeBreakpoint(desktopOnly, 'mobile')).toBe(desktopOnly);
  });
});

describe('import / export', () => {
  const registry: ComponentRegistry = {
    counter: {
      component: () => null,
      defaults: { w: 1, h: 1 },
      toPersistedData: (data: { n: number }) => ({ count: String(data.n) }),
      fromPersistedData: (raw) => ({ n: Number((raw as { count: string }).count) }),
      validate: (data: { n: number }) => (Number.isNaN(data.n) ? ['n is NaN'] : undefined),
    },
  };

  it('round-trips kind data through the persisted shape', () => {
    const layout = layoutOf(
      section('s', [{ ...item('a', 0, 0, 2, 2, { n: 3 }), kind: 'counter' }], {
        overrides: { mobile: { items: { a: { data: { n: 5 } } } } },
      }),
    );
    const exported = exportLayout(layout, registry);
    expect(findItem(exported, 'a').data).toEqual({ count: '3' });
    expect(find(exported).overrides?.mobile?.items?.a?.data).toEqual({ count: '5' });
    const imported = importLayout(exported, registry);
    expect(findItem(imported, 'a').data).toEqual({ n: 3 });
    expect(find(imported).overrides?.mobile?.items?.a?.data).toEqual({ n: 5 });
  });

  it('throws when kind validation fails', () => {
    const raw = layoutOf(
      section('s', [{ ...item('a', 0, 0, 1, 1, { count: 'x' }), kind: 'counter' }]),
    );
    expect(() => importLayout(raw, registry)).toThrow(/kind "counter" item "a" invalid: n is NaN/);
  });

  it('clamps placements and drops overrides of disabled breakpoints on import', () => {
    const raw: Layout = {
      ...layoutOf(
        section('s', [item('a', 10, 0, 6, 1)], {
          overrides: {
            tablet: { columns: 6 },
            mobile: { columns: 4, items: { a: { x: 3, w: 9 } } },
          },
        }),
      ),
      breakpoints: ['desktop', 'mobile'],
      breakpointWidths: { mobile: 640 },
      breakpointPreviewWidths: { mobile: 390 },
    };
    const next = importLayout(raw, {});
    expect(findItem(next, 'a')).toMatchObject({ x: 6, w: 6 });
    expect(find(next).overrides).toEqual({
      mobile: { columns: 4, items: { a: { x: 0, y: 0, w: 4, h: 1 } } },
    });
  });
});
