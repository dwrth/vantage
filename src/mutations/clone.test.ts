import { describe, expect, it } from 'vitest';
import { resolveItem } from '../lib/breakpoint';
import { isValidLayout } from '../lib/validate';
import type { GridItem, Layout, Section } from '../types';
import {
  copyItems,
  duplicateItem,
  duplicateItems,
  duplicateSection,
  insertSection,
  isItemClipboard,
  moveSection,
  moveSectionBy,
  pasteItems,
} from './layout';

function item(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  extra: Partial<GridItem> = {},
): GridItem {
  return { id, x, y, w, h, kind: 'block', ...extra };
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

const find = (layout: Layout, sectionId: string) =>
  layout.sections.find((s) => s.id === sectionId)!;
const sectionIds = (layout: Layout) => layout.sections.map((s) => s.id);

describe('section order', () => {
  const base = layoutOf(section('a', []), section('b', []), section('c', []));

  it('inserts an empty section between two others', () => {
    const { layout, sectionId } = insertSection(base, 1);
    expect(sectionIds(layout)).toEqual(['a', sectionId, 'b', 'c']);
    expect(find(layout, sectionId).items).toEqual([]);
    expect(isValidLayout(layout)).toBe(true);
  });

  it('clamps the insert index', () => {
    expect(sectionIds(insertSection(base, -3).layout)[0]).not.toBe('a');
    expect(sectionIds(insertSection(base, 99).layout).slice(0, 3)).toEqual(['a', 'b', 'c']);
  });

  it('moves a section to an index', () => {
    expect(sectionIds(moveSection(base, 'a', 2))).toEqual(['b', 'c', 'a']);
    expect(sectionIds(moveSection(base, 'c', 0))).toEqual(['c', 'a', 'b']);
    expect(moveSection(base, 'b', 1)).toBe(base);
    expect(moveSection(base, 'missing', 0)).toBe(base);
  });

  it('moves a section up and down, stopping at the ends', () => {
    expect(sectionIds(moveSectionBy(base, 'b', -1))).toEqual(['b', 'a', 'c']);
    expect(sectionIds(moveSectionBy(base, 'b', 1))).toEqual(['a', 'c', 'b']);
    expect(moveSectionBy(base, 'a', -1)).toBe(base);
    expect(moveSectionBy(base, 'c', 1)).toBe(base);
  });
});

describe('duplicateSection', () => {
  const source = section('a', [item('i1', 0, 0, 4, 2, { ref: 'e1', data: { text: 'x' } })], {
    label: 'Hero',
    rows: 6,
    background: { color: '#fff' },
    overrides: {
      mobile: { columns: 4, rows: 8, items: { i1: { x: 0, y: 1, w: 4, h: 2, hidden: true } } },
    },
  });
  const base = layoutOf(source, section('b', []));

  it('inserts a copy after the original with new section and item ids', () => {
    const { layout, sectionId, ids } = duplicateSection(base, 'a');
    expect(sectionIds(layout)).toEqual(['a', sectionId, 'b']);
    const copy = find(layout, sectionId!);
    expect(copy.label).toBe('Hero');
    expect(copy.rows).toBe(6);
    expect(copy.background).toEqual({ color: '#fff' });
    expect(ids.i1).not.toBe('i1');
    expect(copy.items[0]).toMatchObject({
      id: ids.i1,
      ref: 'e1',
      x: 0,
      y: 0,
      w: 4,
      h: 2,
      data: { text: 'x' },
    });
    expect(copy.overrides?.mobile).toEqual({
      columns: 4,
      rows: 8,
      items: { [ids.i1]: { x: 0, y: 1, w: 4, h: 2, hidden: true } },
    });
    expect(isValidLayout(layout)).toBe(true);
  });

  it('lets the host choose the copies ids and refs', () => {
    const { layout, sectionId } = duplicateSection(base, 'a', {
      cloneItem: (src) => ({ id: `${src.id}-copy`, ref: `${src.ref}-copy` }),
    });
    expect(find(layout, sectionId!).items[0]).toMatchObject({ id: 'i1-copy', ref: 'e1-copy' });
  });

  it('does not share nested objects with the original', () => {
    const { layout, sectionId } = duplicateSection(base, 'a');
    (find(layout, sectionId!).items[0].data as { text: string }).text = 'changed';
    expect(source.items[0].data).toEqual({ text: 'x' });
  });

  it('leaves the layout alone for an unknown section', () => {
    expect(duplicateSection(base, 'missing')).toEqual({ layout: base, ids: {}, sectionId: null });
  });
});

describe('copy and paste items', () => {
  const base = layoutOf(
    section(
      's',
      [
        item('a', 0, 0, 4, 2, { ref: 'ea', meta: { note: 1 } }),
        item('b', 6, 1, 3, 3, { ref: 'eb' }),
        item('c', 0, 4, 12, 1),
      ],
      {
        overrides: {
          mobile: {
            columns: 4,
            items: { a: { x: 0, y: 0, w: 4, h: 2 }, b: { x: 0, y: 2, w: 4, h: 3, hidden: true } },
          },
          tablet: { items: { b: { data: { tone: 'dark' } } } },
        },
      },
    ),
    section('t', [item('z', 0, 0, 6, 3)], { columns: 6 }),
  );

  it('copies items with their overrides into a serialisable clipboard', () => {
    const clipboard = copyItems(base, 's', ['b', 'a', 'missing'])!;
    expect(isItemClipboard(clipboard)).toBe(true);
    expect(JSON.parse(JSON.stringify(clipboard))).toEqual(clipboard);
    expect(clipboard.columns).toBe(12);
    expect(clipboard.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(clipboard.overrides).toEqual({
      tablet: { b: { data: { tone: 'dark' } } },
      mobile: { a: { x: 0, y: 0, w: 4, h: 2 }, b: { x: 0, y: 2, w: 4, h: 3, hidden: true } },
    });
    expect(copyItems(base, 's', ['missing'])).toBeNull();
    expect(copyItems(base, 'missing', ['a'])).toBeNull();
    expect(isItemClipboard({ type: 'other' })).toBe(false);
  });

  it('pastes below the content with new ids, keeping relative positions and overrides', () => {
    const clipboard = copyItems(base, 's', ['a', 'b'])!;
    const { layout, ids } = pasteItems(base, 's', clipboard);
    const s = find(layout, 's');
    expect(s.items).toHaveLength(5);
    expect(new Set(s.items.map((i) => i.id)).size).toBe(5);
    const [pa, pb] = [s.items[3], s.items[4]];
    expect(pa).toMatchObject({ id: ids.a, ref: 'ea', x: 0, y: 5, w: 4, h: 2, meta: { note: 1 } });
    expect(pb).toMatchObject({ id: ids.b, ref: 'eb', x: 6, y: 6, w: 3, h: 3 });
    // Mobile: below the mobile content (row 5), same offsets; hidden flag carried.
    expect(resolveItem(pa, s, 'mobile')).toMatchObject({ y: 5, hidden: false });
    expect(resolveItem(pb, s, 'mobile')).toMatchObject({ y: 7, hidden: true });
    expect(s.overrides?.tablet?.items?.[ids.b]).toEqual({ data: { tone: 'dark' } });
    expect(isValidLayout(layout)).toBe(true);
  });

  it('pastes into another section, clamped to its columns', () => {
    const clipboard = copyItems(base, 's', ['b', 'c'])!;
    const { layout, ids } = pasteItems(base, 't', clipboard, {
      cloneItem: (src) => ({ id: `${src.id}2`, ref: `new-${src.id}` }),
    });
    const t = find(layout, 't');
    expect(ids).toEqual({ b: 'b2', c: 'c2' });
    expect(t.items.map((i) => [i.id, i.ref, i.x, i.y, i.w, i.h])).toEqual([
      ['z', undefined, 0, 0, 6, 3],
      ['b2', 'new-b', 3, 3, 3, 3],
      ['c2', 'new-c', 0, 6, 6, 1],
    ]);
    expect(find(layout, 's')).toBe(find(base, 's'));
  });

  it('replaces a chosen id that is already taken', () => {
    const clipboard = copyItems(base, 's', ['a'])!;
    const { ids } = pasteItems(base, 's', clipboard, { cloneItem: () => ({ id: 'c' }) });
    expect(ids.a).not.toBe('c');
  });

  it('drops overrides of breakpoints the target layout does not enable', () => {
    const clipboard = copyItems(base, 's', ['a'])!;
    const desktopOnly = { ...base, breakpoints: ['desktop' as const] };
    const { layout } = pasteItems(desktopOnly, 't', clipboard);
    expect(find(layout, 't').overrides).toBeUndefined();
  });

  it('duplicates items within their section', () => {
    const { layout, ids } = duplicateItems(base, 's', ['a']);
    expect(find(layout, 's').items.at(-1)).toMatchObject({ id: ids.a, ref: 'ea', y: 5 });
    const single = duplicateItem(base, 's', 'c');
    expect(find(single.layout, 's').items.at(-1)).toMatchObject({ id: single.itemId, y: 5, w: 12 });
    expect(duplicateItem(base, 's', 'missing')).toEqual({ layout: base, itemId: null });
  });
});

describe('copies of fill-screen sections and full-bleed items', () => {
  const hero = section(
    'a',
    [item('i1', 0, 0, 12, 4, { fullBleed: true }), item('i2', 0, 4, 4, 2)],
    {
      fillScreen: true,
      verticalAlign: 'center',
    },
  );
  const base = layoutOf(hero, section('b', []));

  it('keeps fillScreen and verticalAlign on a duplicated section', () => {
    const { layout, sectionId } = duplicateSection(base, 'a');
    const copy = find(layout, sectionId!);
    expect(copy.fillScreen).toBe(true);
    expect(copy.verticalAlign).toBe('center');
    expect(copy.items[0].fullBleed).toBe(true);
    expect(copy.items[1].fullBleed).toBeUndefined();
    expect(isValidLayout(layout)).toBe(true);
  });

  it('keeps fullBleed when duplicating an item', () => {
    const { layout, itemId } = duplicateItem(base, 'a', 'i1');
    const copy = find(layout, 'a').items.find((i) => i.id === itemId)!;
    expect(copy.fullBleed).toBe(true);
    expect(isValidLayout(layout)).toBe(true);
  });

  it('keeps fullBleed when pasting into another section', () => {
    const clipboard = copyItems(base, 'a', ['i1', 'i2'])!;
    const { layout, ids } = pasteItems(base, 'b', clipboard);
    const target = find(layout, 'b');
    expect(target.items.find((i) => i.id === ids.i1)?.fullBleed).toBe(true);
    expect(target.items.find((i) => i.id === ids.i2)?.fullBleed).toBeUndefined();
    expect(target.fillScreen).toBeUndefined();
    expect(isValidLayout(layout)).toBe(true);
  });
});
