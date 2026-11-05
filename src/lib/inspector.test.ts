import { describe, expect, it } from 'vitest';
import type { ComponentRegistry, GridItem, Layout, Section } from '../types';
import { resolveSelectedItem } from './inspector';

const Comp = () => null;

const registry: ComponentRegistry = {
  text: { component: Comp, defaults: { w: 2, h: 2 } },
};

const items: GridItem[] = [
  { id: 'i1', x: 0, y: 0, w: 2, h: 2, kind: 'text', data: { a: 1, b: 1 }, ref: 'e1' },
  { id: 'i2', x: 2, y: 0, w: 2, h: 2, kind: 'unregistered' },
];

const section: Section = {
  id: 's1',
  columns: 12,
  colGap: 8,
  rowGap: 8,
  items,
  overrides: { tablet: { items: { i1: { data: { b: 2 } } } } },
};

const layout: Layout = {
  sections: [section, { ...section, id: 's2', items: [], overrides: undefined }],
  breakpoints: ['desktop', 'tablet'],
  breakpointWidths: {},
  breakpointPreviewWidths: {},
};

const select = (sectionId: string, itemId: string) => ({ sectionId, itemId });

describe('resolveSelectedItem', () => {
  it('returns null without a selection', () => {
    expect(resolveSelectedItem(layout, null, registry, 'desktop')).toBeNull();
  });

  it('returns null for an unknown section or item', () => {
    expect(resolveSelectedItem(layout, select('x', 'i1'), registry, 'desktop')).toBeNull();
    expect(resolveSelectedItem(layout, select('s1', 'x'), registry, 'desktop')).toBeNull();
    expect(resolveSelectedItem(layout, select('s2', 'i1'), registry, 'desktop')).toBeNull();
  });

  it('bundles section, item, descriptor, data and breakpoint', () => {
    const result = resolveSelectedItem(layout, select('s1', 'i1'), registry, 'desktop');
    expect(result?.section).toBe(section);
    expect(result?.item).toBe(items[0]);
    expect(result?.descriptor).toBe(registry.text);
    expect(result?.resolvedData).toEqual({ a: 1, b: 1 });
    expect(result?.activeBreakpoint).toBe('desktop');
  });

  it('applies the breakpoint override to the resolved data', () => {
    const result = resolveSelectedItem(layout, select('s1', 'i1'), registry, 'tablet');
    expect(result?.resolvedData).toEqual({ a: 1, b: 2 });
    expect(result?.activeBreakpoint).toBe('tablet');
  });

  it('respects the layout breakpoints when merging', () => {
    const noTablet: Layout = { ...layout, breakpoints: ['desktop'] };
    const result = resolveSelectedItem(noTablet, select('s1', 'i1'), registry, 'tablet');
    expect(result?.resolvedData).toEqual({ a: 1, b: 1 });
  });

  it('merges entity data under layout data', () => {
    const result = resolveSelectedItem(layout, select('s1', 'i1'), registry, 'tablet', {
      a: 0,
      z: 9,
    });
    expect(result?.resolvedData).toEqual({ a: 1, b: 2, z: 9 });
  });

  it('has an undefined descriptor for unregistered kinds', () => {
    const result = resolveSelectedItem(layout, select('s1', 'i2'), registry, 'desktop');
    expect(result?.item).toBe(items[1]);
    expect(result?.descriptor).toBeUndefined();
    expect(result?.resolvedData).toBeUndefined();
  });
});
