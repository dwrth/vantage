import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbLayout } from '../test/arbitraries';
import { overlappingPairs } from '../test/layoutInvariants';
import {
  BREAKPOINTS,
  DEFAULT_BREAKPOINT_PREVIEW_WIDTHS,
  DEFAULT_BREAKPOINT_WIDTHS,
  type Breakpoint,
} from '../types';
import {
  getBreakpointPreviewWidths,
  getBreakpointWidths,
  getEnabledBreakpoints,
  isBreakpointEnabled,
  mergeItemOverride,
  resolveBreakpointFromLayout,
  resolveBreakpointFromWidth,
  resolveItem,
  resolveSection,
  sectionContentRows,
  sectionRows,
} from './breakpoint';

const RUNS = { numRuns: 150, seed: 20261105 };

const RANK: Record<Breakpoint, number> = { mobile: 0, tablet: 1, desktop: 2 };

describe('resolved breakpoints of generated layouts', () => {
  it('never overlap in free-grid sections and keep every block inside the columns', () => {
    fc.assert(
      fc.property(arbLayout({ maxSections: 3, arrangements: 0.2 }), (layout) => {
        const enabled = getEnabledBreakpoints(layout);
        for (const section of layout.sections) {
          for (const bp of BREAKPOINTS) {
            const { columns } = resolveSection(section, bp, enabled);
            const resolved = section.items.map((item) => resolveItem(item, section, bp, enabled));
            expect(resolved).toHaveLength(section.items.length);
            for (const r of resolved) {
              expect(r.w).toBeGreaterThanOrEqual(1);
              expect(r.h).toBeGreaterThanOrEqual(1);
              expect(r.x).toBeGreaterThanOrEqual(0);
              expect(r.y).toBeGreaterThanOrEqual(0);
              expect(r.x + r.w).toBeLessThanOrEqual(columns);
            }
            if (!section.arrangement) expect(overlappingPairs(section, bp, enabled)).toEqual([]);
          }
        }
      }),
      RUNS,
    );
  });

  it('clamp stored placements that leave the grid back inside the columns', () => {
    const coord = fc.integer({ min: -6, max: 30 });
    const arbPlacement = fc.record({ x: coord, y: coord, w: coord, h: coord });
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        fc.option(fc.integer({ min: 1, max: 12 }), { nil: undefined }),
        fc.array(fc.tuple(arbPlacement, fc.option(arbPlacement, { nil: undefined })), {
          minLength: 1,
          maxLength: 5,
        }),
        fc.constantFrom(...BREAKPOINTS),
        (columns, tabletColumns, placements, bp) => {
          const items = placements.map(([p], index) => ({ id: `i${index}`, kind: 'text', ...p }));
          const overrideItems = Object.fromEntries(
            placements.flatMap(([, o], index) => (o ? [[`i${index}`, o]] : [])),
          );
          const section = {
            id: 's',
            columns,
            colGap: 8,
            rowGap: 8,
            items,
            overrides: {
              tablet: { columns: tabletColumns, items: overrideItems },
              mobile: { items: overrideItems },
            },
          };
          const resolvedColumns = resolveSection(section, bp).columns;
          for (const item of items) {
            const r = resolveItem(item, section, bp);
            expect(r.w).toBeGreaterThanOrEqual(1);
            expect(r.h).toBeGreaterThanOrEqual(1);
            expect(r.x).toBeGreaterThanOrEqual(0);
            expect(r.y).toBeGreaterThanOrEqual(0);
            expect(r.x + r.w).toBeLessThanOrEqual(resolvedColumns);
          }
        },
      ),
      RUNS,
    );
  });

  it('hide a block only where it is flagged hidden', () => {
    fc.assert(
      fc.property(arbLayout({ maxSections: 3 }), (layout) => {
        const enabled = getEnabledBreakpoints(layout);
        for (const section of layout.sections) {
          for (const item of section.items) {
            for (const bp of BREAKPOINTS) {
              const active = bp !== 'desktop' && enabled.includes(bp);
              const expected = active
                ? section.overrides?.[bp]?.items?.[item.id]?.hidden === true
                : item.hidden === true;
              expect(resolveItem(item, section, bp, enabled).hidden).toBe(expected);
            }
          }
        }
      }),
      RUNS,
    );
  });

  it('fall back to desktop on disabled breakpoints', () => {
    fc.assert(
      fc.property(arbLayout({ maxSections: 2 }), (layout) => {
        const enabled = getEnabledBreakpoints(layout);
        for (const bp of BREAKPOINTS.filter((b) => !enabled.includes(b))) {
          for (const section of layout.sections) {
            expect(resolveSection(section, bp, enabled)).toEqual(
              resolveSection(section, 'desktop', enabled),
            );
            for (const item of section.items) {
              expect(resolveItem(item, section, bp, enabled)).toEqual(
                resolveItem(item, section, 'desktop', enabled),
              );
            }
          }
        }
      }),
      RUNS,
    );
  });

  it('give every section room for its content and its fixed rows', () => {
    fc.assert(
      fc.property(arbLayout({ maxSections: 3 }), (layout) => {
        const enabled = getEnabledBreakpoints(layout);
        for (const section of layout.sections) {
          for (const bp of enabled) {
            const rows = sectionRows(section, bp, enabled);
            expect(rows).toBeGreaterThanOrEqual(1);
            expect(rows).toBeGreaterThanOrEqual(sectionContentRows(section, bp, enabled));
            const fixed = resolveSection(section, bp, enabled).rows;
            if (fixed !== undefined) expect(rows).toBeGreaterThanOrEqual(fixed);
          }
        }
      }),
      RUNS,
    );
  });
});

describe('resolveBreakpointFromLayout', () => {
  it('only moves to wider breakpoints as the viewport grows and returns enabled ones', () => {
    fc.assert(
      fc.property(
        arbLayout({ maxSections: 1, maxItems: 0 }),
        fc.array(fc.integer({ min: 0, max: 2000 }), { minLength: 2, maxLength: 8 }),
        (layout, widths) => {
          const enabled = getEnabledBreakpoints(layout);
          const sorted = [...widths].sort((a, b) => a - b);
          const resolved = sorted.map((w) => resolveBreakpointFromLayout(w, layout));
          for (const bp of resolved) expect(enabled).toContain(bp);
          for (let k = 1; k < resolved.length; k += 1) {
            expect(RANK[resolved[k]!]).toBeGreaterThanOrEqual(RANK[resolved[k - 1]!]);
          }
          expect(resolveBreakpointFromLayout(2001, layout)).toBe('desktop');
        },
      ),
      RUNS,
    );
  });
});

describe('breakpoint helpers', () => {
  it('isBreakpointEnabled follows the normalized list', () => {
    expect(isBreakpointEnabled({ breakpoints: ['desktop', 'mobile'] }, 'mobile')).toBe(true);
    expect(isBreakpointEnabled({ breakpoints: ['desktop', 'mobile'] }, 'tablet')).toBe(false);
    expect(isBreakpointEnabled({ breakpoints: ['mobile'] }, 'mobile')).toBe(false);
    expect(isBreakpointEnabled({ breakpoints: ['mobile'] }, 'desktop')).toBe(true);
  });

  it('falls back to the default widths when the maps are missing', () => {
    const layout = { breakpoints: ['desktop', 'tablet', 'mobile'] as Breakpoint[] };
    expect(getBreakpointWidths(layout as never)).toEqual(DEFAULT_BREAKPOINT_WIDTHS);
    expect(getBreakpointPreviewWidths(layout as never)).toEqual(DEFAULT_BREAKPOINT_PREVIEW_WIDTHS);
    expect(
      getBreakpointPreviewWidths({ ...layout, breakpointPreviewWidths: { tablet: 700 } }),
    ).toEqual({ tablet: 700, mobile: DEFAULT_BREAKPOINT_PREVIEW_WIDTHS.mobile });
  });

  it('skips enabled breakpoints without a cut-off', () => {
    const all: Breakpoint[] = ['desktop', 'tablet', 'mobile'];
    expect(resolveBreakpointFromWidth(500, all, { mobile: 640 })).toBe('mobile');
    expect(resolveBreakpointFromWidth(700, all, { mobile: 640 })).toBe('desktop');
    expect(resolveBreakpointFromWidth(500, all, { tablet: 900 })).toBe('tablet');
    expect(resolveBreakpointFromWidth(500, all, {})).toBe('desktop');
  });

  it('mergeItemOverride lets the patch win and keeps the rest', () => {
    expect(mergeItemOverride({ x: 1, hidden: true }, { x: 3, w: 2 })).toEqual({
      x: 3,
      w: 2,
      hidden: true,
    });
    expect(mergeItemOverride(undefined, { h: 4 })).toEqual({ h: 4 });
  });
});
