import { describe, expect, it } from 'vitest';
import { diffLayouts } from '../lib/diff';
import { resolveItem, sectionRows } from '../lib/breakpoint';
import type { Breakpoint, GridItem, Layout, Section } from '../types';
import { moveItemsToSection } from './group';

const item = (id: string, x: number, y: number, w = 2, h = 1, extra: Partial<GridItem> = {}) => ({
  id,
  kind: 'block',
  x,
  y,
  w,
  h,
  ...extra,
});

const section = (id: string, items: GridItem[], extra: Partial<Section> = {}): Section => ({
  id,
  columns: 12,
  colGap: 8,
  rowGap: 8,
  rows: 4,
  items,
  ...extra,
});

const layoutOf = (...sections: Section[]): Layout => ({
  breakpoints: ['desktop', 'tablet', 'mobile'],
  breakpointWidths: {},
  breakpointPreviewWidths: {},
  sections,
});

const sectionOf = (layout: Layout, id: string) => layout.sections.find((s) => s.id === id)!;

const at = (layout: Layout, sectionId: string, id: string, bp: Breakpoint = 'desktop') => {
  const s = sectionOf(layout, sectionId);
  const { x, y, w, h } = resolveItem(s.items.find((i) => i.id === id)!, s, bp);
  return { x, y, w, h };
};

describe('moveItemsToSection', () => {
  it('moves the group into a tall enough target without growing it', () => {
    const layout = layoutOf(
      section('a', [item('g1', 1, 0), item('g2', 4, 1, 2, 2), item('stay', 8, 0)]),
      section('b', [item('t', 0, 0)], { rows: 6 }),
    );
    const next = moveItemsToSection(layout, 'a', ['g1', 'g2'], 'b', { x: 5, y: 2 });
    expect(sectionOf(next, 'a').items.map((i) => i.id)).toEqual(['stay']);
    expect(sectionOf(next, 'b').items.map((i) => i.id)).toEqual(['t', 'g1', 'g2']);
    expect(at(next, 'b', 'g1')).toEqual({ x: 5, y: 2, w: 2, h: 1 });
    expect(at(next, 'b', 'g2')).toEqual({ x: 8, y: 3, w: 2, h: 2 });
    expect(sectionOf(next, 'b').rows).toBe(6);
    expect(sectionOf(next, 'a').rows).toBe(4);
  });

  it('grows the target by exactly the rows the group needs', () => {
    const layout = layoutOf(
      section('a', [item('g1', 0, 0), item('g2', 0, 2, 2, 2)], { rows: 6 }),
      section('b', [], { rows: 3 }),
    );
    // Box is 4 rows tall, anchored at row 2: needs 6 rows.
    const next = moveItemsToSection(layout, 'a', ['g1', 'g2'], 'b', { x: 0, y: 2 });
    expect(sectionOf(next, 'b').rows).toBe(6);
    expect(at(next, 'b', 'g1')).toMatchObject({ y: 2 });
    expect(at(next, 'b', 'g2')).toMatchObject({ y: 4, h: 2 });
    expect(sectionOf(next, 'a').rows).toBe(6);
  });

  it('grows a content-sized target and leaves its height when it fits', () => {
    const layout = layoutOf(
      section('a', [item('g1', 0, 0), item('g2', 3, 1)]),
      section('b', [item('t', 0, 0, 2, 3)], { rows: undefined }),
    );
    const fits = moveItemsToSection(layout, 'a', ['g1', 'g2'], 'b', { x: 4, y: 0 });
    expect(sectionRows(sectionOf(fits, 'b'), 'desktop')).toBe(3);
    const grows = moveItemsToSection(layout, 'a', ['g1', 'g2'], 'b', { x: 4, y: 2 });
    expect(sectionRows(sectionOf(grows, 'b'), 'desktop')).toBe(4);
  });

  it('shifts the group left as a unit to fit the target columns', () => {
    const layout = layoutOf(
      section('a', [item('g1', 6, 0, 3, 1), item('g2', 9, 1, 3, 1)]),
      section('b', [], { columns: 8 }),
    );
    const next = moveItemsToSection(layout, 'a', ['g1', 'g2'], 'b', { x: 7, y: 0 });
    expect(at(next, 'b', 'g1')).toEqual({ x: 2, y: 0, w: 3, h: 1 });
    expect(at(next, 'b', 'g2')).toEqual({ x: 5, y: 1, w: 3, h: 1 });
  });

  it('keeps the stacking order of the group on top of the target', () => {
    const layout = layoutOf(
      section('a', [item('back', 0, 0, 4, 2), item('other', 6, 0), item('front', 1, 0)]),
      section('b', [item('t', 0, 0)]),
    );
    const next = moveItemsToSection(layout, 'a', ['front', 'back'], 'b', { x: 0, y: 0 });
    expect(sectionOf(next, 'b').items.map((i) => i.id)).toEqual(['t', 'back', 'front']);
  });

  it('gives a colliding block a new id and keeps the rest', () => {
    const layout = layoutOf(
      section('a', [item('dup', 0, 0), item('g2', 3, 0)]),
      section('b', [item('dup', 6, 2)]),
    );
    const next = moveItemsToSection(layout, 'a', ['dup', 'g2'], 'b', { x: 0, y: 0 });
    const ids = sectionOf(next, 'b').items.map((i) => i.id);
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe('dup');
    expect(ids[1]).not.toBe('dup');
    expect(ids[2]).toBe('g2');
    expect(new Set(ids).size).toBe(3);
  });

  it('carries per-breakpoint flags and data and cleans the source overrides', () => {
    const layout = layoutOf(
      section('a', [item('g1', 0, 0), item('g2', 3, 0)], {
        overrides: {
          tablet: { items: { g1: { hidden: true, x: 4 } } },
          mobile: { items: { g2: { verticalAlign: 'end', data: { size: 'sm' } } } },
        },
      }),
      section('b', []),
    );
    const next = moveItemsToSection(layout, 'a', ['g1', 'g2'], 'b', { x: 0, y: 0 });
    expect(sectionOf(next, 'a').overrides).toBeUndefined();
    const target = sectionOf(next, 'b');
    expect(target.overrides?.tablet?.items?.g1).toEqual({ hidden: true });
    expect(target.overrides?.mobile?.items?.g2).toEqual({
      verticalAlign: 'end',
      data: { size: 'sm' },
    });
  });

  it('writes the placement and the growth to the active breakpoint off desktop', () => {
    const layout = layoutOf(
      section('a', [item('g1', 0, 0), item('g2', 0, 1, 2, 2)], { rows: 6 }),
      section('b', [item('t', 0, 0)], { rows: 3 }),
    );
    const next = moveItemsToSection(layout, 'a', ['g1', 'g2'], 'b', {
      x: 1,
      y: 1,
      breakpoint: 'tablet',
    });
    const target = sectionOf(next, 'b');
    expect(target.overrides?.tablet?.rows).toBe(4);
    expect(target.rows).toBe(3);
    expect(at(next, 'b', 'g1', 'tablet')).toMatchObject({ x: 1, y: 1 });
    expect(at(next, 'b', 'g2', 'tablet')).toMatchObject({ x: 1, y: 2 });
    // Desktop gets free slots below the content, not the tablet cells.
    expect(at(next, 'b', 'g1').y).toBeGreaterThanOrEqual(1);
    expect(at(next, 'b', 'g2').y).toBeGreaterThanOrEqual(1);
  });

  it('leaves blocks hidden at the breakpoint in the source', () => {
    const layout = layoutOf(
      section('a', [item('g1', 0, 0), item('hid', 3, 0, 2, 1, { hidden: true }), item('g2', 6, 1)]),
      section('b', []),
    );
    const next = moveItemsToSection(layout, 'a', ['g1', 'hid', 'g2'], 'b', { x: 0, y: 0 });
    expect(sectionOf(next, 'a').items.map((i) => i.id)).toEqual(['hid']);
    expect(at(next, 'b', 'g1')).toMatchObject({ x: 0, y: 0 });
    expect(at(next, 'b', 'g2')).toMatchObject({ x: 6, y: 1 });
  });

  it('inserts into an arrangement target by index, in stacking order', () => {
    const layout = layoutOf(
      section('a', [item('g1', 0, 0), item('g2', 3, 0)]),
      section('b', [item('t1', 0, 0), item('t2', 0, 0)], {
        rows: undefined,
        arrangement: { preset: 'three' },
      }),
    );
    const next = moveItemsToSection(layout, 'a', ['g2', 'g1'], 'b', { index: 1 });
    expect(sectionOf(next, 'b').items.map((i) => i.id)).toEqual(['t1', 'g1', 'g2', 't2']);
  });

  it('moves within the section like moveItems', () => {
    const layout = layoutOf(section('a', [item('g1', 0, 0), item('g2', 3, 1)]));
    const next = moveItemsToSection(layout, 'a', ['g1', 'g2'], 'a', { x: 2, y: 1 });
    expect(at(next, 'a', 'g1')).toMatchObject({ x: 2, y: 1 });
    expect(at(next, 'a', 'g2')).toMatchObject({ x: 5, y: 2 });
  });

  it('returns the same layout when nothing moves', () => {
    const layout = layoutOf(
      section('a', [item('g1', 0, 0), item('hid', 3, 0, 2, 1, { hidden: true })]),
      section('b', []),
    );
    expect(moveItemsToSection(layout, 'a', ['hid'], 'b', { x: 0, y: 0 })).toBe(layout);
    expect(moveItemsToSection(layout, 'a', ['nope'], 'b')).toBe(layout);
    expect(moveItemsToSection(layout, 'a', ['g1'], 'missing')).toBe(layout);
    expect(moveItemsToSection(layout, 'a', ['g1'], 'a', { x: 0, y: 0 })).toBe(layout);
  });

  it('reports every moved block and the grown section in one changeset', () => {
    const layout = layoutOf(
      section('a', [item('g1', 0, 0), item('g2', 0, 1, 2, 2)]),
      section('b', [], { rows: 2 }),
    );
    const next = moveItemsToSection(layout, 'a', ['g1', 'g2'], 'b', { x: 0, y: 1 });
    const changes = diffLayouts(layout, next);
    expect(changes.itemsMoved.map((m) => [m.item.id, m.fromSectionId, m.toSectionId])).toEqual([
      ['g1', 'a', 'b'],
      ['g2', 'a', 'b'],
    ]);
    const updated = changes.sectionsUpdated.find((u) => u.section.id === 'b');
    expect(updated?.section.rows).toBe(4);
  });
});
