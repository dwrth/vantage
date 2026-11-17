import { describe, expect, it, vi } from 'vitest';
import { diffLayouts } from '../lib/diff';
import { resolveItem, sectionRows } from '../lib/breakpoint';
import type { Breakpoint, GridItem, Layout, Section } from '../types';
import { addItem, moveItemToSection } from './layout';

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

const grow = { grow: true } as const;

describe('moveItemToSection with grow', () => {
  it('leaves a tall enough target unchanged', () => {
    const layout = layoutOf(section('a', [item('m', 0, 0, 2, 2)]), section('b', [], { rows: 4 }));
    const next = moveItemToSection(layout, 'a', 'm', 'b', { x: 3, y: 2, ...grow });
    expect(at(next, 'b', 'm')).toEqual({ x: 3, y: 2, w: 2, h: 2 });
    expect(sectionOf(next, 'b').rows).toBe(4);
    expect(sectionOf(next, 'a').rows).toBe(4);
  });

  it('grows the target by exactly the rows the block needs', () => {
    const layout = layoutOf(
      section('a', [item('m', 0, 0, 2, 3)], { rows: 3 }),
      section('b', [item('t', 0, 0)], { rows: 2 }),
    );
    const next = moveItemToSection(layout, 'a', 'm', 'b', { x: 4, y: 1, ...grow });
    expect(at(next, 'b', 'm')).toEqual({ x: 4, y: 1, w: 2, h: 3 });
    expect(sectionOf(next, 'b').rows).toBe(4);
    expect(sectionOf(next, 'a').rows).toBe(3);
  });

  it('clamps into the current height without grow, as before', () => {
    const layout = layoutOf(section('a', [item('m', 0, 0, 2, 3)]), section('b', [], { rows: 2 }));
    const next = moveItemToSection(layout, 'a', 'm', 'b', { x: 0, y: 1 });
    expect(sectionOf(next, 'b').rows).toBe(2);
    expect(at(next, 'b', 'm')).toEqual({ x: 0, y: 0, w: 2, h: 2 });
  });

  it('grows a content-sized target and clamps horizontal overflow to its columns', () => {
    const layout = layoutOf(
      section('a', [item('m', 0, 0, 4, 2)]),
      section('b', [item('t', 0, 0, 2, 2)], { rows: undefined, columns: 6 }),
    );
    const next = moveItemToSection(layout, 'a', 'm', 'b', { x: 5, y: 2, ...grow });
    expect(at(next, 'b', 'm')).toEqual({ x: 2, y: 2, w: 4, h: 2 });
    expect(sectionRows(sectionOf(next, 'b'), 'desktop')).toBe(4);
    expect(sectionOf(next, 'b').rows).toBe(4);
  });

  it('writes placement, shown size and growth to the active breakpoint off desktop', () => {
    const layout = layoutOf(
      section('a', [item('m', 0, 0, 4, 1)], {
        overrides: { tablet: { items: { m: { x: 1, y: 0, w: 3, h: 2 } } } },
      }),
      section('b', [item('t', 0, 0)], {
        rows: 3,
        overrides: { mobile: { rows: 5 } },
      }),
    );
    const next = moveItemToSection(layout, 'a', 'm', 'b', {
      x: 2,
      y: 2,
      breakpoint: 'tablet',
      ...grow,
    });
    const b = sectionOf(next, 'b');
    expect(b.overrides?.tablet?.rows).toBe(4);
    expect(b.rows).toBe(3);
    expect(b.overrides?.mobile?.rows).toBe(5);
    expect(at(next, 'b', 'm', 'tablet')).toEqual({ x: 2, y: 2, w: 3, h: 2 });
    // Desktop gets a free slot below the content, not the tablet cell.
    expect(at(next, 'b', 'm')).toMatchObject({ y: 1, w: 4, h: 1 });
    expect(sectionOf(next, 'a').overrides).toBeUndefined();
  });

  it('carries per-breakpoint flags and data along', () => {
    const layout = layoutOf(
      section('a', [item('m', 0, 0)], {
        overrides: { mobile: { items: { m: { hidden: true, data: { size: 'sm' } } } } },
      }),
      section('b', [], { rows: 1 }),
    );
    const next = moveItemToSection(layout, 'a', 'm', 'b', { x: 0, y: 2, ...grow });
    expect(sectionOf(next, 'b').overrides?.mobile?.items?.m).toEqual({
      hidden: true,
      data: { size: 'sm' },
    });
    expect(sectionOf(next, 'b').rows).toBe(3);
  });

  it('gives a colliding block a new id', () => {
    const layout = layoutOf(section('a', [item('dup', 0, 0)]), section('b', [item('dup', 0, 0)]));
    const next = moveItemToSection(layout, 'a', 'dup', 'b', { x: 0, y: 5, ...grow });
    const moved = sectionOf(next, 'b').items[1]!;
    expect(moved.id).not.toBe('dup');
    expect(moved).toMatchObject({ x: 0, y: 5 });
    expect(sectionOf(next, 'b').rows).toBe(6);
  });

  it('does not grow an arrangement target and places by index', () => {
    const layout = layoutOf(
      section('a', [item('m', 0, 0, 2, 5)]),
      section('b', [item('t1', 0, 0), item('t2', 0, 0)], {
        rows: undefined,
        arrangement: { preset: 'three' },
      }),
    );
    const next = moveItemToSection(layout, 'a', 'm', 'b', { x: 0, y: 9, index: 1, ...grow });
    const b = sectionOf(next, 'b');
    expect(b.items.map((i) => i.id)).toEqual(['t1', 'm', 't2']);
    expect(b.rows).toBeUndefined();
  });

  it('moves within the section like moveItem, without growing it', () => {
    const layout = layoutOf(section('a', [item('m', 0, 0, 2, 2)], { rows: 3 }));
    const next = moveItemToSection(layout, 'a', 'm', 'a', { x: 1, y: 5, ...grow });
    expect(sectionOf(next, 'a').rows).toBe(3);
    expect(at(next, 'a', 'm')).toEqual({ x: 1, y: 1, w: 2, h: 2 });
  });

  it('returns the same layout when nothing moves', () => {
    const layout = layoutOf(section('a', [item('m', 0, 0)]), section('b', []));
    expect(moveItemToSection(layout, 'a', 'nope', 'b', { y: 3, ...grow })).toBe(layout);
    expect(moveItemToSection(layout, 'a', 'm', 'missing', { y: 3, ...grow })).toBe(layout);
  });

  it('reports the moved block and the grown section in one changeset', () => {
    const layout = layoutOf(section('a', [item('m', 0, 0, 2, 2)]), section('b', [], { rows: 2 }));
    const next = moveItemToSection(layout, 'a', 'm', 'b', { x: 0, y: 1, ...grow });
    const changes = diffLayouts(layout, next);
    expect(changes.itemsMoved.map((m) => [m.item.id, m.fromSectionId, m.toSectionId])).toEqual([
      ['m', 'a', 'b'],
    ]);
    expect(changes.sectionsUpdated.find((u) => u.section.id === 'b')?.section.rows).toBe(3);
  });
});

describe('addItem with a drop position', () => {
  it('leaves a tall enough section unchanged', () => {
    const layout = layoutOf(section('a', [], { rows: 4 }));
    const next = addItem(layout, 'a', 'block', { id: 'n', x: 2, y: 2, w: 2, h: 2, ...grow });
    expect(at(next, 'a', 'n')).toEqual({ x: 2, y: 2, w: 2, h: 2 });
    expect(sectionOf(next, 'a').rows).toBe(4);
  });

  it('grows the section by exactly the rows the block needs', () => {
    const layout = layoutOf(section('a', [item('t', 0, 0)], { rows: 2 }));
    const next = addItem(layout, 'a', 'block', { id: 'n', x: 11, y: 2, w: 3, h: 2, ...grow });
    expect(at(next, 'a', 'n')).toEqual({ x: 9, y: 2, w: 3, h: 2 });
    expect(sectionOf(next, 'a').rows).toBe(4);
  });

  it('clamps into the current height without grow, as before', () => {
    const layout = layoutOf(section('a', [], { rows: 2 }));
    const next = addItem(layout, 'a', 'block', { id: 'n', x: 0, y: 3, w: 2, h: 3 });
    expect(sectionOf(next, 'a').rows).toBe(2);
    expect(at(next, 'a', 'n')).toEqual({ x: 0, y: 0, w: 2, h: 2 });
  });

  it('places and grows on the given breakpoint, keeping other breakpoints', () => {
    const layout = layoutOf(
      section('a', [item('t', 0, 0, 4, 1)], {
        rows: 3,
        overrides: { tablet: { rows: 2 }, mobile: { rows: 6, columns: 4 } },
      }),
    );
    const next = addItem(layout, 'a', 'block', {
      id: 'n',
      x: 1,
      y: 2,
      w: 3,
      h: 2,
      breakpoint: 'tablet',
      ...grow,
    });
    const a = sectionOf(next, 'a');
    expect(a.overrides?.tablet?.rows).toBe(4);
    expect(a.rows).toBe(3);
    expect(a.overrides?.mobile?.rows).toBe(6);
    expect(at(next, 'a', 'n', 'tablet')).toEqual({ x: 1, y: 2, w: 3, h: 2 });
    // Desktop gets the next free slot below the content.
    expect(at(next, 'a', 'n')).toEqual({ x: 0, y: 1, w: 3, h: 2 });
  });

  it('clamps into the breakpoint height without grow', () => {
    const layout = layoutOf(section('a', [], { rows: 3, overrides: { mobile: { rows: 2 } } }));
    const next = addItem(layout, 'a', 'block', {
      id: 'n',
      x: 0,
      y: 4,
      w: 2,
      h: 1,
      breakpoint: 'mobile',
    });
    expect(sectionOf(next, 'a').overrides?.mobile?.rows).toBe(2);
    expect(at(next, 'a', 'n', 'mobile')).toMatchObject({ y: 1 });
  });

  it('does not grow an arrangement section and inserts by index', () => {
    const layout = layoutOf(
      section('a', [item('t1', 0, 0), item('t2', 0, 0)], {
        rows: undefined,
        arrangement: { preset: 'three' },
      }),
    );
    const next = addItem(layout, 'a', 'block', { id: 'n', y: 8, h: 4, index: 1, ...grow });
    const a = sectionOf(next, 'a');
    expect(a.items.map((i) => i.id)).toEqual(['t1', 'n', 't2']);
    expect(a.rows).toBeUndefined();
  });

  it('ignores grow without an explicit row', () => {
    const layout = layoutOf(section('a', [item('t', 0, 0, 12, 4)], { rows: 4 }));
    const next = addItem(layout, 'a', 'block', { id: 'n', w: 2, h: 2, ...grow });
    expect(at(next, 'a', 'n')).toEqual({ x: 0, y: 4, w: 2, h: 2 });
    expect(sectionOf(next, 'a').rows).toBe(4);
  });

  it('falls back to a new id on a collision', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const layout = layoutOf(section('a', [item('t', 0, 0)], { rows: 1 }));
    const next = addItem(layout, 'a', 'block', { id: 't', x: 0, y: 1, ...grow });
    const added = sectionOf(next, 'a').items[1]!;
    expect(added.id).not.toBe('t');
    expect(sectionOf(next, 'a').rows).toBe(3);
    warn.mockRestore();
  });

  it('reports the added block and the grown section in one changeset', () => {
    const layout = layoutOf(section('a', [], { rows: 2 }));
    const next = addItem(layout, 'a', 'block', { id: 'n', x: 0, y: 2, w: 2, h: 1, ...grow });
    const changes = diffLayouts(layout, next);
    expect(changes.itemsAdded.map((e) => e.item.id)).toEqual(['n']);
    expect(changes.sectionsUpdated.find((u) => u.section.id === 'a')?.section.rows).toBe(3);
  });
});
