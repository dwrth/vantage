import { describe, expect, it } from 'vitest';
import type { Breakpoint, GridItem, Section } from '../types';
import {
  defaultColumnsForBreakpoint,
  getBreakpointWidths,
  getEnabledBreakpoints,
  hasItemOverride,
  mergeBreakpointItemData,
  resolveBreakpointFromLayout,
  resolveBreakpointFromWidth,
  resolveItem,
  resolveSection,
  sectionContentRows,
  sectionRows,
} from './breakpoint';

function item(id: string, x: number, y: number, w: number, h: number, data?: unknown): GridItem {
  return { id, x, y, w, h, kind: 'block', data };
}

function section(items: GridItem[], extra: Partial<Section> = {}): Section {
  return { id: 's', columns: 12, colGap: 8, rowGap: 8, items, ...extra };
}

describe('resolveItem', () => {
  const a = item('a', 6, 2, 6, 3);

  it('uses the desktop placement on desktop, ignoring overrides', () => {
    const s = section([a], { overrides: { mobile: { items: { a: { x: 0, hidden: true } } } } });
    expect(resolveItem(a, s, 'desktop')).toEqual({ x: 6, y: 2, w: 6, h: 3, hidden: false });
  });

  it('applies each override field on top of the desktop placement', () => {
    const s = section([a], {
      overrides: { tablet: { items: { a: { y: 0 } } }, mobile: { items: { a: { x: 0, w: 2 } } } },
    });
    expect(resolveItem(a, s, 'tablet')).toEqual({ x: 6, y: 0, w: 6, h: 3, hidden: false });
    // Mobile inherits 12 columns here (no columns override).
    expect(resolveItem(a, s, 'mobile')).toEqual({ x: 0, y: 2, w: 2, h: 3, hidden: false });
  });

  it('clamps the inherited placement to the breakpoint columns', () => {
    const s = section([a], { overrides: { mobile: { columns: 4 } } });
    expect(resolveItem(a, s, 'mobile')).toEqual({ x: 0, y: 2, w: 4, h: 3, hidden: false });
  });

  it('reads hidden only from non-desktop overrides', () => {
    const s = section([a], { overrides: { mobile: { items: { a: { hidden: true } } } } });
    expect(resolveItem(a, s, 'mobile').hidden).toBe(true);
    expect(resolveItem(a, s, 'tablet').hidden).toBe(false);
    expect(resolveItem(a, s, 'desktop').hidden).toBe(false);
  });

  it('falls back to desktop for a breakpoint that is not enabled', () => {
    const s = section([a], {
      overrides: { mobile: { columns: 4, items: { a: { x: 0, hidden: true } } } },
    });
    expect(resolveItem(a, s, 'mobile', ['desktop', 'tablet'])).toEqual({
      x: 6,
      y: 2,
      w: 6,
      h: 3,
      hidden: false,
    });
  });
});

describe('resolveSection', () => {
  it('fills padding defaults and inherits desktop values per field', () => {
    const s = section([], {
      rows: 5,
      paddingTop: 10,
      overrides: { mobile: { columns: 4, rowGap: 2, rows: 9 } },
    });
    expect(resolveSection(s, 'desktop')).toEqual({
      columns: 12,
      colGap: 8,
      rowGap: 8,
      paddingTop: 10,
      paddingBottom: 24,
      rows: 5,
    });
    expect(resolveSection(s, 'mobile')).toEqual({
      columns: 4,
      colGap: 8,
      rowGap: 2,
      paddingTop: 10,
      paddingBottom: 24,
      rows: 9,
    });
    expect(resolveSection(s, 'tablet').rows).toBe(5);
  });
});

describe('section height', () => {
  it('measures content from visible items only', () => {
    const s = section([item('a', 0, 0, 2, 2), item('b', 0, 4, 2, 3)], {
      overrides: { mobile: { items: { b: { hidden: true } } } },
    });
    expect(sectionContentRows(s, 'desktop')).toBe(7);
    expect(sectionContentRows(s, 'mobile')).toBe(2);
  });

  it('follows content without rows, with a default for empty sections', () => {
    expect(sectionRows(section([item('a', 0, 1, 2, 2)]), 'desktop')).toBe(3);
    expect(sectionRows(section([]), 'desktop')).toBe(4);
  });

  it('uses rows but grows to fit content', () => {
    expect(sectionRows(section([item('a', 0, 0, 2, 2)], { rows: 6 }), 'desktop')).toBe(6);
    expect(sectionRows(section([item('a', 0, 5, 2, 3)], { rows: 6 }), 'desktop')).toBe(8);
  });
});

describe('mergeBreakpointItemData', () => {
  it('shallow-merges object override data over the base', () => {
    const a = item('a', 0, 0, 1, 1, { text: 'hi', size: 1 });
    const s = section([a], { overrides: { mobile: { items: { a: { data: { size: 2 } } } } } });
    expect(mergeBreakpointItemData(a, s, 'mobile')).toEqual({ text: 'hi', size: 2 });
    expect(mergeBreakpointItemData(a, s, 'desktop')).toBe(a.data);
    expect(mergeBreakpointItemData(a, s, 'tablet')).toBe(a.data);
  });

  it('replaces non-object data outright', () => {
    const a = item('a', 0, 0, 1, 1, 'base');
    const s = section([a], { overrides: { mobile: { items: { a: { data: 'mobile' } } } } });
    expect(mergeBreakpointItemData(a, s, 'mobile')).toBe('mobile');
  });
});

describe('hasItemOverride', () => {
  it('is true only for placement, data or hidden: true', () => {
    const s = section([], {
      overrides: { mobile: { items: { a: { hidden: false }, b: { h: 2 }, c: { hidden: true } } } },
    });
    expect(hasItemOverride(s, 'mobile', 'a')).toBe(false);
    expect(hasItemOverride(s, 'mobile', 'b')).toBe(true);
    expect(hasItemOverride(s, 'mobile', 'c')).toBe(true);
    expect(hasItemOverride(s, 'mobile', 'missing')).toBe(false);
    expect(hasItemOverride(s, 'desktop', 'b')).toBe(false);
  });
});

describe('breakpoint selection', () => {
  it('always keeps desktop and orders breakpoints canonically', () => {
    expect(getEnabledBreakpoints({ breakpoints: ['mobile', 'desktop'] })).toEqual([
      'desktop',
      'mobile',
    ]);
    expect(getEnabledBreakpoints({ breakpoints: ['mobile'] })).toEqual(['desktop']);
  });

  it('picks the narrowest breakpoint whose cutoff the width fits under', () => {
    const widths = { mobile: 640, tablet: 1023 };
    expect(resolveBreakpointFromWidth(640, undefined, widths)).toBe('mobile');
    expect(resolveBreakpointFromWidth(641, undefined, widths)).toBe('tablet');
    expect(resolveBreakpointFromWidth(1024, undefined, widths)).toBe('desktop');
    expect(resolveBreakpointFromWidth(300, ['desktop', 'tablet'], widths)).toBe('tablet');
  });

  it('uses default widths for enabled breakpoints that have none', () => {
    const layout = { breakpoints: ['desktop', 'mobile'] as Breakpoint[], breakpointWidths: {} };
    expect(getBreakpointWidths(layout)).toEqual({ mobile: 640 });
    expect(resolveBreakpointFromLayout(640, layout)).toBe('mobile');
    expect(resolveBreakpointFromLayout(800, layout)).toBe('desktop');
  });

  it('derives default columns per breakpoint', () => {
    expect(defaultColumnsForBreakpoint(12, 'tablet')).toBe(8);
    expect(defaultColumnsForBreakpoint(1, 'tablet')).toBe(1);
    expect(defaultColumnsForBreakpoint(12, 'mobile')).toBe(4);
  });
});
