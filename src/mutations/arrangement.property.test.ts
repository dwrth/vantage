import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  defaultColumnsForBreakpoint,
  getEnabledBreakpoints,
  resolveSection,
} from '../lib/breakpoint';
import { validateLayout } from '../lib/validate';
import { arbLayout, arbSectionArrangement, deepFreeze } from '../test/arbitraries';
import {
  arrangementViolations,
  columnBoundsViolations,
  visibleRects,
} from '../test/layoutInvariants';
import { NON_DESKTOP_BREAKPOINTS, type Layout, type Section, type SectionOverride } from '../types';
import { setSectionArrangement } from './arrangement';

const RUNS = { numRuns: 150, seed: 20261105 };

const pickSection = (layout: Layout, n: number) => layout.sections[n % layout.sections.length]!;

const sectionById = (layout: Layout, id: string) => layout.sections.find((s) => s.id === id)!;

function expectOthersKept(before: Layout, after: Layout, sectionId: string) {
  after.sections.forEach((section, i) => {
    if (section.id !== sectionId) expect(section).toBe(before.sections[i]);
  });
}

function sectionFields(override: SectionOverride | undefined, drop: string[] = []) {
  return Object.fromEntries(
    Object.entries(override ?? {}).filter(([key]) => key !== 'items' && !drop.includes(key)),
  );
}

function itemOverrideFlags(section: Section) {
  return NON_DESKTOP_BREAKPOINTS.map((bp) =>
    section.items.map((item) => {
      const ovr = section.overrides?.[bp]?.items?.[item.id];
      return { id: item.id, hidden: ovr?.hidden, data: ovr?.data, align: ovr?.verticalAlign };
    }),
  );
}

describe('setSectionArrangement: free grid to arrangement', () => {
  it('orders blocks by desktop reading order and drops every grid-only field', () => {
    fc.assert(
      fc.property(
        arbLayout({ arrangements: 0 }),
        fc.nat(),
        arbSectionArrangement,
        (start, n, arrangement) => {
          const layout = deepFreeze(start);
          const snapshot = structuredClone(layout);
          const source = pickSection(layout, n);
          const next = setSectionArrangement(layout, source.id, arrangement);
          expect(layout).toEqual(snapshot);
          expectOthersKept(layout, next, source.id);
          const section = sectionById(next, source.id);
          expect(section.arrangement).toBe(arrangement);
          expect(section.columns).toBe(12);
          expect(arrangementViolations(next)).toEqual([]);
          expect(validateLayout(next).errors).toEqual([]);
          expect([...section.items].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
            [...source.items].sort((a, b) => a.id.localeCompare(b.id)),
          );
          section.items.forEach((item) => expect(source.items).toContain(item));
          section.items.slice(1).forEach((item, i) => {
            const prev = section.items[i]!;
            expect(prev.y < item.y || (prev.y === item.y && prev.x <= item.x)).toBe(true);
          });
          const byId = (s: Section) =>
            itemOverrideFlags(s).map((list) => list.sort((a, b) => a.id.localeCompare(b.id)));
          expect(byId(section)).toEqual(byId(source));
          for (const bp of NON_DESKTOP_BREAKPOINTS) {
            expect(sectionFields(section.overrides?.[bp])).toEqual(
              sectionFields(source.overrides?.[bp], ['columns', 'rows']),
            );
          }
        },
      ),
      RUNS,
    );
  });

  it('keeps the block order and item array when only the arrangement changes', () => {
    fc.assert(
      fc.property(
        arbLayout({ arrangements: 1 }),
        fc.nat(),
        arbSectionArrangement,
        (start, n, arrangement) => {
          const layout = deepFreeze(start);
          const source = pickSection(layout, n);
          const next = setSectionArrangement(layout, source.id, arrangement);
          expect(sectionById(next, source.id).items).toBe(source.items);
          expect(sectionById(next, source.id).overrides).toEqual(source.overrides);
        },
      ),
      RUNS,
    );
  });
});

describe('setSectionArrangement: arrangement to free grid', () => {
  it('writes in-bounds placement on every breakpoint and keeps flags', () => {
    fc.assert(
      fc.property(arbLayout({ arrangements: 1 }), fc.nat(), (start, n) => {
        const layout = deepFreeze(start);
        const snapshot = structuredClone(layout);
        const source = pickSection(layout, n);
        const next = setSectionArrangement(layout, source.id, null);
        expect(layout).toEqual(snapshot);
        expectOthersKept(layout, next, source.id);
        const section = sectionById(next, source.id);
        expect(section.arrangement).toBeUndefined();
        expect(section.items.map((i) => i.id)).toEqual(source.items.map((i) => i.id));
        expect(itemOverrideFlags(section)).toEqual(itemOverrideFlags(source));
        expect(validateLayout(next).errors).toEqual([]);
        expect(columnBoundsViolations({ ...next, sections: [section] })).toEqual([]);
        const enabled = getEnabledBreakpoints(next);
        for (const bp of enabled) {
          const { columns } = resolveSection(section, bp, enabled);
          for (const item of section.items) {
            const ovr = bp === 'desktop' ? item : section.overrides?.[bp]?.items?.[item.id];
            if (!visibleRects(section, bp, enabled).some((r) => r.id === item.id)) continue;
            expect(ovr?.x).toBeDefined();
            expect(ovr!.x! + ovr!.w!).toBeLessThanOrEqual(columns);
          }
        }
      }),
      RUNS,
    );
  });

  it('gets the columns of a free-grid section with the same desktop columns', () => {
    fc.assert(
      fc.property(arbLayout({ arrangements: 1 }), fc.nat(), (start, n) => {
        const source = pickSection(start, n);
        const section = sectionById(setSectionArrangement(start, source.id, null), source.id);
        expect(section.columns).toBe(source.columns);
        for (const bp of NON_DESKTOP_BREAKPOINTS) {
          expect(section.overrides?.[bp]?.columns).toBe(
            defaultColumnsForBreakpoint(source.columns, bp),
          );
        }
      }),
      RUNS,
    );
  });

  it('keeps every block and the free-grid columns over repeated round trips', () => {
    fc.assert(
      fc.property(
        arbLayout({ arrangements: 0 }),
        fc.nat(),
        fc.array(arbSectionArrangement, { minLength: 1, maxLength: 4 }),
        (start, n, arrangements) => {
          const source = pickSection(start, n);
          let layout = start;
          for (const arrangement of arrangements) {
            layout = setSectionArrangement(layout, source.id, arrangement);
            layout = setSectionArrangement(layout, source.id, null);
          }
          const section = sectionById(layout, source.id);
          expect(section.columns).toBe(12);
          for (const bp of NON_DESKTOP_BREAKPOINTS) {
            expect(section.overrides?.[bp]?.columns).toBe(defaultColumnsForBreakpoint(12, bp));
          }
          expect(section.items.map((i) => i.id).sort()).toEqual(
            source.items.map((i) => i.id).sort(),
          );
          expect(validateLayout(layout).errors).toEqual([]);
          expect(columnBoundsViolations({ ...layout, sections: [section] })).toEqual([]);
        },
      ),
      RUNS,
    );
  });

  it('round-trips back to the same arrangement with the same order and overrides', () => {
    fc.assert(
      fc.property(arbLayout({ arrangements: 1, hidden: false }), fc.nat(), (start, n) => {
        const layout = deepFreeze(start);
        const source = pickSection(layout, n);
        const free = setSectionArrangement(layout, source.id, null);
        const back = setSectionArrangement(free, source.id, source.arrangement!);
        const section = sectionById(back, source.id);
        expect(section.items.map((i) => i.id)).toEqual(source.items.map((i) => i.id));
        expect(section.overrides).toEqual(source.overrides);
        expect(section.arrangement).toEqual(source.arrangement);
        expect(section.rows).toBeUndefined();
      }),
      RUNS,
    );
  });

  it('returns a free-grid section unchanged and ignores unknown sections', () => {
    fc.assert(
      fc.property(arbLayout({ arrangements: 0 }), fc.nat(), (start, n) => {
        const layout = deepFreeze(start);
        const source = pickSection(layout, n);
        const next = setSectionArrangement(layout, source.id, null);
        next.sections.forEach((section, i) => expect(section).toBe(layout.sections[i]));
        const unknown = setSectionArrangement(layout, 'missing', { preset: 'two' });
        unknown.sections.forEach((section, i) => expect(section).toBe(layout.sections[i]));
      }),
      RUNS,
    );
  });
});

describe('setSectionArrangement: examples', () => {
  it('keeps the items order for blocks that share a desktop cell', () => {
    const layout: Layout = {
      breakpoints: ['desktop'],
      breakpointWidths: {},
      breakpointPreviewWidths: {},
      sections: [
        {
          id: 's',
          columns: 12,
          colGap: 8,
          rowGap: 8,
          items: [
            { id: 'b', kind: 'text', x: 2, y: 1, w: 2, h: 1 },
            { id: 'a', kind: 'text', x: 2, y: 1, w: 2, h: 1 },
            { id: 'c', kind: 'text', x: 0, y: 1, w: 2, h: 1 },
          ],
        },
      ],
    };
    const next = setSectionArrangement(layout, 's', { preset: 'three' });
    expect(next.sections[0]!.items.map((i) => i.id)).toEqual(['c', 'b', 'a']);
  });
});
