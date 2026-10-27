import { describe, expect, it } from 'vitest';
import { sectionRows } from '../lib/breakpoint';
import { diffLayouts } from '../lib/diff';
import { clampItem, resizeByHandle } from '../lib/grid';
import { snapSectionRows } from '../lib/rowMetrics';
import { isValidLayout } from '../lib/validate';
import type { GridItem, Layout, Section } from '../types';
import { addItem, moveItem, moveItemToSection, resizeItem, resizeSection } from './layout';

function item(id: string, x: number, y: number, w: number, h: number): GridItem {
  return { id, x, y, w, h, kind: 'block' };
}

function section(id: string, items: GridItem[], extra: Partial<Section> = {}): Section {
  return { id, columns: 12, colGap: 8, rowGap: 8, items, ...extra };
}

function layoutOf(...sections: Section[]): Layout {
  return {
    sections,
    breakpoints: ['desktop', 'mobile'],
    breakpointWidths: { mobile: 640 },
    breakpointPreviewWidths: { mobile: 390 },
  };
}

const find = (layout: Layout, sectionId: string) =>
  layout.sections.find((s) => s.id === sectionId)!;
const findItem = (layout: Layout, sectionId: string, itemId: string) =>
  find(layout, sectionId).items.find((i) => i.id === itemId)!;

describe('dragging blocks never resizes the section', () => {
  it('stops a block moved past the bottom at the last row', () => {
    const layout = layoutOf(section('s', [item('a', 0, 0, 3, 2)], { rows: 4 }));
    const next = moveItem(layout, 's', 'a', 0, 10);
    expect(findItem(next, 's', 'a')).toMatchObject({ y: 2, h: 2 });
    expect(find(next, 's').rows).toBe(4);
    expect(sectionRows(find(next, 's'), 'desktop')).toBe(4);
  });

  it('pins an auto-height section so moves can neither grow nor shrink it', () => {
    const layout = layoutOf(section('s', [item('a', 0, 0, 3, 2), item('b', 0, 3, 3, 2)]));
    expect(find(layout, 's').rows).toBeUndefined();

    const down = moveItem(layout, 's', 'b', 0, 20);
    expect(findItem(down, 's', 'b').y).toBe(3);
    expect(find(down, 's').rows).toBe(5);

    const up = moveItem(layout, 's', 'b', 0, 0);
    expect(findItem(up, 's', 'b').y).toBe(0);
    expect(sectionRows(find(up, 's'), 'desktop')).toBe(5);
  });

  it('clamps per breakpoint and pins only that breakpoint', () => {
    const layout = layoutOf(section('s', [item('a', 0, 0, 3, 2)], { rows: 4 }));
    const next = moveItem(layout, 's', 'a', 0, 9, 'mobile');
    const s = find(next, 's');
    expect(s.overrides?.mobile?.items?.a).toMatchObject({ y: 2 });
    expect(s.rows).toBe(4);
    expect(s.overrides?.mobile?.rows).toBeUndefined(); // inherited 4 already fits
    expect(findItem(next, 's', 'a').y).toBe(0);
  });

  it('keeps both sections the same height when a block crosses over', () => {
    const layout = layoutOf(
      section('from', [item('a', 0, 0, 3, 2), item('tall', 0, 2, 3, 6)]),
      section('to', [], { rows: 4 }),
    );
    const next = moveItemToSection(layout, 'from', 'tall', 'to', { x: 0, y: 3 });
    // Too tall for the target: shrinks to fit, like a too-wide block shrinks to the columns.
    expect(findItem(next, 'to', 'tall')).toMatchObject({ y: 0, h: 4 });
    expect(find(next, 'to').rows).toBe(4);
    expect(sectionRows(find(next, 'from'), 'desktop')).toBe(8);
  });

  it('drops a palette block inside the section but still appends past it without a position', () => {
    const layout = layoutOf(section('s', [item('a', 0, 0, 3, 2)], { rows: 4 }));
    const dropped = addItem(layout, 's', 'block', { x: 0, y: 7, w: 3, h: 2 });
    expect(find(dropped, 's').items.at(-1)).toMatchObject({ y: 2, h: 2 });
    expect(sectionRows(find(dropped, 's'), 'desktop')).toBe(4);

    const appended = addItem(layout, 's', 'block', { w: 3, h: 3 });
    expect(find(appended, 's').items.at(-1)).toMatchObject({ y: 2, h: 3 });
    expect(sectionRows(find(appended, 's'), 'desktop')).toBe(5);
  });

  it('stops a block resize at the section bottom', () => {
    const layout = layoutOf(section('s', [item('a', 0, 1, 3, 2)], { rows: 4 }));
    // The south handle anchors the top edge and stops at the bottom row.
    expect(resizeByHandle({ x: 0, y: 1, w: 3, h: 2 }, 's', 0, 7, 12, 4)).toEqual({
      x: 0,
      y: 1,
      w: 3,
      h: 3,
    });
    // A rect that cannot fit is clamped like clampItem: shrunk to the rows, then shifted up.
    const next = resizeItem(layout, 's', 'a', 0, 1, 3, 9);
    expect(findItem(next, 's', 'a')).toMatchObject({ y: 0, h: 4 });
    expect(find(next, 's').rows).toBe(4);
  });
});

describe('resizeSection', () => {
  const base = layoutOf(section('s', [item('a', 0, 0, 3, 2), item('b', 0, 2, 3, 3)], { rows: 6 }));

  it('grows and shrinks the section', () => {
    expect(find(resizeSection(base, 's', 9), 's').rows).toBe(9);
    expect(find(resizeSection(base, 's', 5), 's').rows).toBe(5);
  });

  it('never shrinks below the content', () => {
    expect(find(resizeSection(base, 's', 2), 's').rows).toBe(5);
  });

  it('never shrinks an empty section below the minimum', () => {
    const empty = layoutOf(section('s', [], { rows: 4 }));
    expect(find(resizeSection(empty, 's', 0), 's').rows).toBe(1);
    expect(find(resizeSection(empty, 's', -3), 's').rows).toBe(1);
  });

  it('writes non-desktop sizes to that breakpoint override', () => {
    const next = resizeSection(base, 's', 12, 'mobile');
    const s = find(next, 's');
    expect(s.rows).toBe(6);
    expect(s.overrides?.mobile?.rows).toBe(12);
    expect(sectionRows(s, 'mobile')).toBe(12);
    expect(sectionRows(s, 'desktop')).toBe(6);
  });

  it('keeps references when nothing changes', () => {
    const next = resizeSection(base, 's', 6);
    expect(find(next, 's')).toBe(find(base, 's'));
  });

  it('is a section update in the changeset and survives validation', () => {
    const next = resizeSection(base, 's', 8);
    const changes = diffLayouts(base, next);
    expect(changes.sectionsUpdated).toHaveLength(1);
    expect(changes.itemsUpdated).toHaveLength(0);
    expect(isValidLayout(next)).toBe(true);
    expect(isValidLayout(layoutOf(section('s', [], { rows: 0 })))).toBe(false);
  });
});

describe('grid helpers', () => {
  it('clampItem keeps items inside the given rows', () => {
    expect(clampItem({ x: 0, y: 5, w: 3, h: 2 }, 12, 4)).toEqual({ x: 0, y: 2, w: 3, h: 2 });
    expect(clampItem({ x: 0, y: 1, w: 3, h: 9 }, 12, 4)).toEqual({ x: 0, y: 0, w: 3, h: 4 });
    expect(clampItem({ x: 0, y: 5, w: 3, h: 2 }, 12)).toEqual({ x: 0, y: 5, w: 3, h: 2 });
  });

  it('snapSectionRows snaps the bottom edge to row boundaries', () => {
    const steps = [40, 40, 80, 40];
    expect(snapSectionRows(4, 0, steps, 40, 1)).toBe(4);
    expect(snapSectionRows(4, 25, steps, 40, 1)).toBe(5); // past the half-way point
    expect(snapSectionRows(4, 15, steps, 40, 1)).toBe(4);
    expect(snapSectionRows(4, -50, steps, 40, 1)).toBe(3); // tall third row
    expect(snapSectionRows(4, -1000, steps, 40, 2)).toBe(2);
  });
});
