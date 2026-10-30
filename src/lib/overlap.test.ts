import { describe, expect, it } from 'vitest';
import type { GridItem, Section } from '../types';
import { findOverlaps, overlappingItems, rowBelowOverlaps } from './overlap';

function section(items: Partial<GridItem>[], extra: Partial<Section> = {}): Section {
  return {
    id: 's',
    columns: 12,
    colGap: 8,
    rowGap: 8,
    rows: 8,
    items: items.map((item, i) => ({
      id: `i${i}`,
      kind: 'block',
      x: 0,
      y: 0,
      w: 4,
      h: 2,
      ...item,
    })),
    ...extra,
  };
}

describe('findOverlaps', () => {
  it('finds blocks sharing a cell, lower stack entry first', () => {
    const s = section([{}, { x: 3, y: 1 }, { x: 8 }]);
    expect(findOverlaps(s, 'desktop')).toEqual([{ below: 'i0', above: 'i1' }]);
  });

  it('ignores blocks that only touch', () => {
    const s = section([{}, { x: 4 }, { y: 2 }]);
    expect(findOverlaps(s, 'desktop')).toEqual([]);
  });

  it('skips hidden blocks per breakpoint', () => {
    const s = section([{}, { x: 2, hidden: true }], {
      overrides: { mobile: { items: { i0: { hidden: true } } } },
    });
    expect(findOverlaps(s, 'desktop')).toEqual([]);
    // Desktop `hidden` does not carry over; on mobile i0 is hidden instead.
    expect(findOverlaps(s, 'mobile')).toEqual([]);
    expect(findOverlaps(s, 'tablet')).toEqual([{ below: 'i0', above: 'i1' }]);
  });

  it('uses breakpoint placement', () => {
    const s = section([{}, { x: 6 }], {
      overrides: { mobile: { columns: 4, items: { i1: { x: 0, y: 1, w: 4, h: 2 } } } },
    });
    expect(findOverlaps(s, 'desktop')).toEqual([]);
    expect(findOverlaps(s, 'mobile')).toEqual([{ below: 'i0', above: 'i1' }]);
  });

  it('treats full-bleed blocks as spanning the row', () => {
    const s = section([
      { x: 0, w: 2 },
      { x: 10, w: 2, fullBleed: true },
    ]);
    expect(findOverlaps(s, 'desktop')).toEqual([{ below: 'i0', above: 'i1' }]);
  });

  it('ignores intended layering (allowOverlap)', () => {
    const s = section([
      { w: 12, h: 4 },
      { x: 2, y: 1, allowOverlap: true },
      { x: 8, y: 1 },
    ]);
    expect(findOverlaps(s, 'desktop')).toEqual([{ below: 'i0', above: 'i2' }]);
    expect(overlappingItems(s, 'desktop')).toEqual(
      new Map([
        ['i0', ['i2']],
        ['i2', ['i0']],
      ]),
    );
  });
});

describe('rowBelowOverlaps', () => {
  it('is the bottom of the overlapped block when that space is free', () => {
    const s = section([{ h: 3 }, { x: 2, y: 1 }]);
    expect(rowBelowOverlaps(s, 'i1', 'desktop')).toBe(3);
    expect(rowBelowOverlaps(s, 'i0', 'desktop')).toBe(3);
  });

  it('skips further blocks in the way', () => {
    const s = section([{ h: 3 }, { x: 2, y: 1 }, { x: 3, y: 3, w: 2, h: 2 }]);
    expect(rowBelowOverlaps(s, 'i1', 'desktop')).toBe(5);
  });

  it('is null without an overlap or for hidden blocks', () => {
    expect(rowBelowOverlaps(section([{}, { x: 4 }]), 'i1', 'desktop')).toBeNull();
    expect(rowBelowOverlaps(section([{}, { x: 2, hidden: true }]), 'i1', 'desktop')).toBeNull();
    expect(rowBelowOverlaps(section([{}]), 'missing', 'desktop')).toBeNull();
  });
});
