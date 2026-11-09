import { describe, expect, it } from 'vitest';
import type { GridItem, Layout, Section } from '../types';
import { ARRANGEMENT_PRESETS, STACKED_TRACK } from './arrangement';
import {
  DROP_PREVIEW_ID,
  arrangementDropLayout,
  arrangementDropPreview,
  itemsIndexOf,
  previewInsertionIndex,
  readingOrder,
  trailingSlot,
} from './arrangementPreview';

const item = (id: string, extra: Partial<GridItem> = {}): GridItem => ({
  id,
  kind: 'text',
  x: 0,
  y: 0,
  w: 3,
  h: 2,
  ...extra,
});

const flow = (id: string, ids: string[], extra: Partial<Section> = {}): Section => ({
  id,
  columns: 12,
  colGap: 0,
  rowGap: 0,
  arrangement: { preset: 'three' },
  items: ids.map((i) => item(i)),
  ...extra,
});

const grid: Section = { id: 'g', columns: 12, colGap: 0, rowGap: 0, rows: 4, items: [item('x')] };

const layout: Layout = {
  breakpoints: ['desktop', 'tablet', 'mobile'],
  breakpointWidths: {},
  breakpointPreviewWidths: {},
  sections: [flow('s', ['a', 'b', 'c']), flow('t', ['d']), grid],
};

const ids = (l: Layout, sectionId: string) =>
  l.sections.find((s) => s.id === sectionId)!.items.map((i) => i.id);

describe('arrangementDropLayout', () => {
  it('reorders a block of the same section', () => {
    const next = arrangementDropLayout(
      layout,
      's',
      { type: 'block', sectionId: 's', itemId: 'a' },
      2,
    );
    expect(ids(next, 's')).toEqual(['b', 'c', 'a']);
  });

  it('moves a block in from another section', () => {
    const next = arrangementDropLayout(
      layout,
      's',
      { type: 'block', sectionId: 'g', itemId: 'x' },
      1,
    );
    expect(ids(next, 's')).toEqual(['a', 'x', 'b', 'c']);
    expect(ids(next, 'g')).toEqual([]);
  });

  it('inserts a stand-in for a new block', () => {
    const next = arrangementDropLayout(layout, 's', { type: 'new', w: 4, h: 3 }, 0);
    const added = next.sections[0]!.items[0]!;
    expect(added).toMatchObject({ id: DROP_PREVIEW_ID, kind: DROP_PREVIEW_ID, w: 4, h: 3 });
  });
});

describe('arrangementDropPreview', () => {
  it('lays out the section as the drop would, with the dropped block in its slot', () => {
    const preview = arrangementDropPreview(layout, 's', { type: 'new', w: 3, h: 2 }, 1, 'desktop')!;
    expect(preview.droppedId).toBe(DROP_PREVIEW_ID);
    expect(preview.order).toEqual(['a', DROP_PREVIEW_ID, 'b', 'c']);
    expect(preview.slots.get(DROP_PREVIEW_ID)).toEqual({ col: 4, span: 4, row: 0 });
    expect(preview.slots.get('c')).toEqual({ col: 0, span: 4, row: 1 });
  });

  it('keeps the id of a block moved within the section', () => {
    const source = { type: 'block', sectionId: 's', itemId: 'c' } as const;
    const preview = arrangementDropPreview(layout, 's', source, 0, 'desktop')!;
    expect(preview.droppedId).toBe('c');
    expect(preview.order).toEqual(['c', 'a', 'b']);
  });

  it('follows the reversed stack on mobile', () => {
    const reversed: Layout = {
      ...layout,
      sections: [
        flow('s', ['a', 'b'], { arrangement: { preset: 'two', mobileOrder: 'reversed' } }),
      ],
    };
    const preview = arrangementDropPreview(
      reversed,
      's',
      { type: 'new', w: 1, h: 1 },
      2,
      'mobile',
    )!;
    expect(preview.order).toEqual([DROP_PREVIEW_ID, 'b', 'a']);
  });

  it('gives a dropped block hidden on the breakpoint no slot', () => {
    const hidden: Layout = {
      ...layout,
      sections: [
        flow('s', ['a']),
        flow('t', ['d'], { overrides: { mobile: { items: { d: { hidden: true } } } } }),
      ],
    };
    const source = { type: 'block', sectionId: 't', itemId: 'd' } as const;
    const preview = arrangementDropPreview(hidden, 's', source, 0, 'mobile')!;
    expect(preview.droppedId).toBe('d');
    expect(preview.slots.has('d')).toBe(false);
    expect(preview.order).toEqual(['a']);
  });

  it('is null for a free grid, an unknown section or an unknown block', () => {
    const newBlock = { type: 'new', w: 1, h: 1 } as const;
    expect(arrangementDropPreview(layout, 'g', newBlock, 0, 'desktop')).toBeNull();
    expect(arrangementDropPreview(layout, 'zz', newBlock, 0, 'desktop')).toBeNull();
    const missing = { type: 'block', sectionId: 's', itemId: 'zz' } as const;
    expect(arrangementDropPreview(layout, 's', missing, 0, 'desktop')).toBeNull();
    const elsewhere = { type: 'block', sectionId: 't', itemId: 'zz' } as const;
    expect(arrangementDropPreview(layout, 's', elsewhere, 0, 'desktop')).toBeNull();
  });
});

describe('readingOrder', () => {
  it('sorts by row, then column', () => {
    const slots = new Map([
      ['c', { col: 0, span: 6, row: 1 }],
      ['b', { col: 6, span: 6, row: 0 }],
      ['a', { col: 0, span: 6, row: 0 }],
    ]);
    expect(readingOrder(slots)).toEqual(['a', 'b', 'c']);
  });
});

describe('trailingSlot', () => {
  const three = ARRANGEMENT_PRESETS.three.desktop;
  const twoPerRow = ARRANGEMENT_PRESETS.three.tablet;

  it('is the first slot of an empty section', () => {
    expect(trailingSlot(0, three)).toEqual({ col: 0, span: 4, row: 0 });
    expect(trailingSlot(0, STACKED_TRACK)).toEqual({ col: 0, span: 1, row: 0 });
  });

  it('is the next free slot of the last row', () => {
    expect(trailingSlot(1, three)).toEqual({ col: 4, span: 4, row: 0 });
    expect(trailingSlot(3, three)).toEqual({ col: 0, span: 4, row: 1 });
    expect(trailingSlot(2, STACKED_TRACK)).toEqual({ col: 0, span: 1, row: 2 });
  });

  it('starts a new row when a lone last block fills its row', () => {
    expect(trailingSlot(1, twoPerRow)).toEqual({ col: 0, span: 2, row: 1 });
  });

  it('starts a new row when the last row is centered', () => {
    expect(trailingSlot(1, three, 'center')).toEqual({ col: 4, span: 4, row: 1 });
    expect(trailingSlot(1, three, 'end')).toEqual({ col: 8, span: 4, row: 1 });
  });
});

describe('previewInsertionIndex', () => {
  const row = [0, 1, 2, 3].map((i) => ({
    left: i * 100,
    top: 0,
    right: i * 100 + 100,
    bottom: 50,
  }));

  it('keeps the index over the slot', () => {
    expect(previewInsertionIndex(row, 1, { x: 110, y: 20 })).toBe(1);
    expect(previewInsertionIndex(row, 1, { x: 190, y: 20 })).toBe(1);
  });

  it('counts blocks before and after the slot without it', () => {
    expect(previewInsertionIndex(row, 1, { x: 20, y: 20 })).toBe(0);
    expect(previewInsertionIndex(row, 1, { x: 80, y: 20 })).toBe(1);
    expect(previewInsertionIndex(row, 1, { x: 220, y: 20 })).toBe(1);
    expect(previewInsertionIndex(row, 1, { x: 280, y: 20 })).toBe(2);
    expect(previewInsertionIndex(row, 1, { x: 390, y: 20 })).toBe(3);
  });
});

describe('itemsIndexOf', () => {
  it('is the index itself when every block is visible', () => {
    expect(itemsIndexOf(['a', 'b'], ['a', 'b'], 0)).toBe(0);
    expect(itemsIndexOf(['a', 'b'], ['a', 'b'], 2)).toBe(2);
  });

  it('lands in front of the visible block at that index, after hidden ones before it', () => {
    expect(itemsIndexOf(['h', 'a', 'h2', 'b'], ['a', 'b'], 0)).toBe(1);
    expect(itemsIndexOf(['h', 'a', 'h2', 'b'], ['a', 'b'], 1)).toBe(3);
  });

  it('lands right after the last visible block at the end, and clamps', () => {
    expect(itemsIndexOf(['a', 'b', 'h'], ['a', 'b'], 2)).toBe(2);
    expect(itemsIndexOf(['a', 'b', 'h'], ['a', 'b'], 9)).toBe(2);
    expect(itemsIndexOf(['a', 'b', 'h'], ['a', 'b'], -3)).toBe(0);
  });

  it('appends when nothing is visible', () => {
    expect(itemsIndexOf(['h'], [], 0)).toBe(1);
  });
});
