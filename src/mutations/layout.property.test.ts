import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnabledBreakpoints, resolveItem, resolveSection, sectionRows } from '../lib/breakpoint';
import { validateLayout } from '../lib/validate';
import { arbLayout, deepFreeze } from '../test/arbitraries';
import {
  allItemIds,
  arrangementViolations,
  columnBoundsViolations,
  danglingOverrideKeys,
  overlappingPairs,
  overlapViolations,
  overridePlacementViolations,
} from '../test/layoutInvariants';
import {
  applyLayoutOp,
  arbLayoutOp,
  LAYOUT_OP_NAMES,
  type LayoutOp,
  type LayoutOpName,
  type Touched,
} from '../test/layoutOps';
import { NON_DESKTOP_BREAKPOINTS, type Breakpoint, type Layout, type Section } from '../types';
import {
  addItem,
  autoArrangeBreakpoint,
  bringItemForward,
  copyItems,
  duplicateSection,
  exportLayout,
  importLayout,
  moveItem,
  moveItemBelowOverlaps,
  moveItemToIndex,
  moveItemToSection,
  moveSection,
  pasteItems,
  removeItem,
  removeSection,
  reorderItemAtIndex,
  resizeSection,
  sendItemBackward,
  setBreakpointPreviewWidth,
  setBreakpointWidth,
  setItemAllowOverlap,
  setItemFullBleed,
  setItemHidden,
  setItemVerticalAlign,
} from './layout';
import { removeItems } from './group';

const RUNS = { numRuns: 150, seed: 20261105 };

const arbOps = (names?: readonly LayoutOpName[], maxLength = 12) =>
  fc.array(arbLayoutOp(names), { minLength: 1, maxLength });

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function runOps(
  start: Layout,
  ops: LayoutOp[],
  check: (before: Layout, after: Layout, op: LayoutOp, touched: Touched) => void,
): Layout {
  let layout = deepFreeze(start);
  for (const op of ops) {
    const snapshot = structuredClone(layout);
    const { layout: next, touched } = applyLayoutOp(layout, op);
    expect(layout).toEqual(snapshot);
    check(layout, next, op, touched);
    layout = deepFreeze(next);
  }
  return layout;
}

function expectUntouchedSectionsKept(before: Layout, after: Layout, touched: Touched) {
  if (touched === 'all') return;
  for (const section of after.sections) {
    if (touched.includes(section.id)) continue;
    const previous = before.sections.find((s) => s.id === section.id);
    if (previous) expect(section).toBe(previous);
  }
}

function expectStructurallySound(layout: Layout) {
  expect(validateLayout(layout).errors).toEqual([]);
  expect(danglingOverrideKeys(layout)).toEqual([]);
  expect(columnBoundsViolations(layout)).toEqual([]);
  expect(overridePlacementViolations(layout)).toEqual([]);
  const ids = allItemIds(layout);
  expect(new Set(ids).size).toBe(ids.length);
}

type ItemFlags = Record<string, { hidden?: boolean; data?: unknown; verticalAlign?: string }>;

/** Raw `hidden` / `data` / `verticalAlign` of every item, keyed `${itemId}@${breakpoint}`. */
function itemFlags(layout: Layout, breakpoints: Breakpoint[]): ItemFlags {
  const flags: ItemFlags = {};
  for (const section of layout.sections) {
    for (const item of section.items) {
      for (const bp of breakpoints) {
        const source = bp === 'desktop' ? item : section.overrides?.[bp]?.items?.[item.id];
        flags[`${item.id}@${bp}`] = {
          hidden: source?.hidden,
          data: source?.data,
          verticalAlign: source?.verticalAlign,
        };
      }
    }
  }
  return flags;
}

const FLAG_WRITERS: ReadonlySet<LayoutOpName> = new Set([
  'setItemHidden',
  'updateItemData',
  'setItemVerticalAlign',
  'clearItemOverride',
  'clearSectionOverride',
]);

function sectionOf(layout: Layout, sectionId: string): Section {
  return layout.sections.find((s) => s.id === sectionId)!;
}

function placementAt(layout: Layout, sectionId: string, itemId: string, bp: Breakpoint) {
  const section = sectionOf(layout, sectionId);
  const item = section.items.find((i) => i.id === itemId)!;
  return resolveItem(item, section, bp, getEnabledBreakpoints(layout));
}

/** A layout with at least one free-grid section that has items, and a pick among them. */
const arbFreeGridPick = fc
  .tuple(arbLayout({ arrangements: 0 }), fc.nat(), fc.nat(), fc.nat())
  .filter(([layout]) => layout.sections.some((s) => s.items.length > 0))
  .map(([layout, s, i, b]) => {
    const withItems = layout.sections.filter((section) => section.items.length > 0);
    const section = withItems[s % withItems.length]!;
    const item = section.items[i % section.items.length]!;
    const enabled = getEnabledBreakpoints(layout);
    return { layout: deepFreeze(layout), section, item, bp: enabled[b % enabled.length]! };
  });

describe('layout mutations: random sequences', () => {
  it('stay valid, pure, in bounds, and keep untouched sections by reference', () => {
    fc.assert(
      fc.property(arbLayout(), arbOps(), (start, ops) => {
        runOps(start, ops, (before, after, _op, touched) => {
          expectStructurallySound(after);
          expectUntouchedSectionsKept(before, after, touched);
        });
      }),
      RUNS,
    );
  });

  it('keep per-breakpoint hidden, data and vertical align of items they do not target', () => {
    fc.assert(
      fc.property(arbLayout(), arbOps(), (start, ops) => {
        runOps(start, ops, (before, after, op) => {
          const shared = getEnabledBreakpoints(before).filter((bp) =>
            getEnabledBreakpoints(after).includes(bp),
          );
          const was = itemFlags(before, shared);
          const now = itemFlags(after, shared);
          const target = FLAG_WRITERS.has(op.name)
            ? before.sections[op.section % before.sections.length]
            : undefined;
          const targeted = new Set(target?.items.map((item) => item.id) ?? []);
          for (const [key, flags] of Object.entries(now)) {
            const id = key.slice(0, key.lastIndexOf('@'));
            if (key in was && !targeted.has(id)) expect(flags).toEqual(was[key]);
          }
        });
      }),
      RUNS,
    );
  });

  const ARRANGEMENT_SAFE = LAYOUT_OP_NAMES.filter((name) => name !== 'pasteItems');

  it('never give arrangement sections rows, columns or placement overrides', () => {
    fc.assert(
      fc.property(arbLayout({ arrangements: 0.6 }), arbOps(ARRANGEMENT_SAFE), (start, ops) => {
        runOps(start, ops, (_before, after) => {
          expect(arrangementViolations(after)).toEqual([]);
        });
      }),
      RUNS,
    );
  });

  const OVERLAP_SAFE_EVERYWHERE: LayoutOpName[] = [
    'addSection',
    'insertSection',
    'moveSection',
    'moveSectionBy',
    'duplicateSection',
    'removeSection',
    'updateSection',
    'updateLayoutMeta',
    'updateSectionMeta',
    'updateItemMeta',
    'updateItemData',
    'setSectionOverride',
    'clearSectionOverride',
    'setItemVerticalAlign',
    'setItemAllowOverlap',
    'moveItemBelowOverlaps',
    'removeItem',
    'removeItems',
    'bringItemForward',
    'sendItemBackward',
    'bringItemToFront',
    'sendItemToBack',
    'reorderItemAtIndex',
    'moveItemToIndex',
    'setLayoutBreakpoints',
    'setBreakpointWidth',
    'setBreakpointPreviewWidth',
    'importExport',
  ];

  it('keep free-grid sections overlap-free on every breakpoint under non-placing ops', () => {
    fc.assert(
      fc.property(arbLayout(), arbOps(OVERLAP_SAFE_EVERYWHERE), (start, ops) => {
        runOps(start, ops, (_before, after) => {
          expect(overlapViolations(after)).toEqual([]);
        });
      }),
      RUNS,
    );
  });

  const DESKTOP_PLACING: LayoutOpName[] = [
    'addItem',
    'duplicateItem',
    'duplicateItems',
    'pasteItems',
  ];

  it('place new, duplicated and pasted blocks below the desktop content without overlap', () => {
    const desktopOps = fc
      .array(arbLayoutOp([...OVERLAP_SAFE_EVERYWHERE, ...DESKTOP_PLACING]), {
        minLength: 1,
        maxLength: 12,
      })
      .map((ops) => ops.map((op) => ({ ...op, place: false, breakpoint: 0 })));
    fc.assert(
      fc.property(arbLayout(), desktopOps, (start, ops) => {
        runOps(start, ops, (_before, after) => {
          expect(overlapViolations(after, ['desktop'])).toEqual([]);
        });
      }),
      RUNS,
    );
  });
});

describe('autoArrangeBreakpoint', () => {
  const arbWithBreakpoint = (bp: Exclude<Breakpoint, 'desktop'>) =>
    arbLayout({ arrangements: 0, breakpoints: fc.constant<Breakpoint[]>(['desktop', bp]) });

  it('stacks every free-grid section overlap-free at full mobile width', () => {
    fc.assert(
      fc.property(arbWithBreakpoint('mobile'), (start) => {
        const layout = deepFreeze(start);
        const arranged = autoArrangeBreakpoint(layout, 'mobile');
        expect(overlapViolations(arranged)).toEqual([]);
        expect(itemFlags(arranged, ['mobile'])).toEqual(itemFlags(layout, ['mobile']));
        expect(validateLayout(arranged).errors).toEqual([]);
      }),
      RUNS,
    );
  });

  it('scales tablet placements inside the tablet columns, keeping flags', () => {
    fc.assert(
      fc.property(arbWithBreakpoint('tablet'), (start) => {
        const layout = deepFreeze(start);
        const arranged = autoArrangeBreakpoint(layout, 'tablet');
        expect(itemFlags(arranged, ['tablet'])).toEqual(itemFlags(layout, ['tablet']));
        for (const section of arranged.sections) {
          const { columns } = resolveSection(section, 'tablet');
          for (const item of section.items) {
            const ovr = section.overrides?.tablet?.items?.[item.id];
            if (ovr?.hidden || ovr?.x === undefined) continue;
            expect(ovr.x + ovr.w!).toBeLessThanOrEqual(columns);
          }
        }
      }),
      RUNS,
    );
  });

  it.fails('keeps desktop-disjoint blocks disjoint when scaling onto tablet columns', () => {
    const layout: Layout = {
      sections: [
        {
          id: 's0',
          columns: 12,
          colGap: 8,
          rowGap: 8,
          items: [
            { id: 'a', kind: 'text', x: 1, y: 0, w: 1, h: 1 },
            { id: 'b', kind: 'text', x: 2, y: 0, w: 1, h: 1 },
          ],
        },
      ],
      breakpoints: ['desktop', 'tablet'],
      breakpointWidths: { tablet: 1023 },
      breakpointPreviewWidths: { tablet: 768 },
    };
    expect(overlapViolations(layout)).toEqual([]);
    expect(overlapViolations(autoArrangeBreakpoint(layout, 'tablet'))).toEqual([]);
  });
});

describe('layout mutations: inverses and no-ops', () => {
  it('moveSection there and back restores the section order', () => {
    fc.assert(
      fc.property(
        arbLayout({ maxSections: 5 }),
        fc.nat(),
        fc.integer({ min: -2, max: 7 }),
        (start, s, to) => {
          const layout = deepFreeze(start);
          const section = layout.sections[s % layout.sections.length]!;
          const from = layout.sections.indexOf(section);
          const moved = moveSection(layout, section.id, to);
          const back = moveSection(moved, section.id, from);
          expect(back.sections).toEqual(layout.sections);
          back.sections.forEach((sec, i) => expect(sec).toBe(layout.sections[i]));
          if (moved.sections.indexOf(section) === from) expect(moved).toBe(layout);
        },
      ),
      RUNS,
    );
  });

  it('moveItem there and back restores the placement on that breakpoint', () => {
    fc.assert(
      fc.property(arbFreeGridPick, fc.nat(), fc.nat(), ({ layout, section, item, bp }, rx, ry) => {
        const enabled = getEnabledBreakpoints(layout);
        const before = resolveItem(item, section, bp, enabled);
        const { columns } = resolveSection(section, bp, enabled);
        const rows = sectionRows(section, bp, enabled);
        fc.pre(before.y + before.h <= rows);
        const x = rx % (columns - before.w + 1);
        const y = ry % (rows - before.h + 1);
        const moved = moveItem(layout, section.id, item.id, x, y, bp);
        expect(placementAt(moved, section.id, item.id, bp)).toEqual({ ...before, x, y });
        const back = moveItem(moved, section.id, item.id, before.x, before.y, bp);
        expect(placementAt(back, section.id, item.id, bp)).toEqual(before);
        for (const other of section.items) {
          if (other.id === item.id) continue;
          for (const b of enabled) {
            expect(placementAt(back, section.id, other.id, b)).toEqual(
              placementAt(layout, section.id, other.id, b),
            );
          }
        }
      }),
      RUNS,
    );
  });

  it('moveItemToIndex there and back restores the order; the current index is a no-op', () => {
    fc.assert(
      fc.property(
        arbLayout(),
        fc.nat(),
        fc.nat(),
        fc.integer({ min: -1, max: 8 }),
        (start, s, i, to) => {
          const layout = deepFreeze(start);
          const section = layout.sections[s % layout.sections.length]!;
          fc.pre(section.items.length > 0);
          const from = i % section.items.length;
          const id = section.items[from]!.id;
          expect(moveItemToIndex(layout, section.id, id, from)).toBe(layout);
          expect(reorderItemAtIndex(layout, section.id, from, from)).toBe(layout);
          const moved = moveItemToIndex(layout, section.id, id, to);
          const back = moveItemToIndex(moved, section.id, id, from);
          sectionOf(back, section.id).items.forEach((entry, n) =>
            expect(entry).toBe(section.items[n]),
          );
        },
      ),
      RUNS,
    );
  });

  it('bringItemForward then sendItemBackward restores the stack', () => {
    fc.assert(
      fc.property(arbFreeGridPick, ({ layout, section, item }) => {
        fc.pre(section.items.indexOf(item) < section.items.length - 1);
        const back = sendItemBackward(
          bringItemForward(layout, section.id, item.id),
          section.id,
          item.id,
        );
        expect(sectionOf(back, section.id).items).toEqual(section.items);
      }),
      RUNS,
    );
  });

  it('addItem then removeItem restores the layout', () => {
    fc.assert(
      fc.property(
        arbLayout(),
        fc.nat(),
        fc.option(fc.integer({ min: 0, max: 20 }), { nil: undefined }),
        (start, s, index) => {
          const layout = deepFreeze(start);
          const section = layout.sections[s % layout.sections.length]!;
          const added = addItem(layout, section.id, 'text', { id: 'fresh', w: 2, h: 1, index });
          expect(sectionOf(added, section.id).items).toHaveLength(section.items.length + 1);
          expect(removeItem(added, section.id, 'fresh')).toEqual(layout);
        },
      ),
      RUNS,
    );
  });

  it('duplicateSection then removing the copy restores the layout', () => {
    fc.assert(
      fc.property(arbLayout(), fc.nat(), (start, s) => {
        const layout = deepFreeze(start);
        const section = layout.sections[s % layout.sections.length]!;
        const copy = duplicateSection(layout, section.id);
        const copied = sectionOf(copy.layout, copy.sectionId!);
        expect(copied.items.map((i) => i.id)).toEqual(section.items.map((i) => copy.ids[i.id]));
        for (const bp of getEnabledBreakpoints(layout)) {
          section.items.forEach((item) => {
            const original = resolveItem(item, section, bp);
            const clone = copied.items.find((i) => i.id === copy.ids[item.id])!;
            expect(resolveItem(clone, copied, bp)).toEqual(original);
          });
        }
        expect(removeSection(copy.layout, copy.sectionId!)).toEqual(layout);
      }),
      RUNS,
    );
  });

  it('pasting a copy into the same section and removing it restores the layout', () => {
    fc.assert(
      fc.property(arbFreeGridPick, ({ layout, section, item }) => {
        const clipboard = copyItems(layout, section.id, [item.id])!;
        const pasted = pasteItems(layout, section.id, clipboard);
        expect(removeItems(pasted.layout, section.id, Object.values(pasted.ids))).toEqual(layout);
      }),
      RUNS,
    );
  });

  it('desktop flag setters toggled on and off restore the item', () => {
    fc.assert(
      fc.property(arbFreeGridPick, ({ layout, section, item }) => {
        const plain = { ...item };
        delete plain.hidden;
        delete plain.fullBleed;
        delete plain.allowOverlap;
        const start = deepFreeze({
          ...layout,
          sections: layout.sections.map((s) =>
            s.id !== section.id
              ? s
              : { ...s, items: s.items.map((i) => (i.id === item.id ? plain : i)) },
          ),
        });
        const toggles = [
          (l: Layout, on: boolean) => setItemHidden(l, section.id, item.id, 'desktop', on),
          (l: Layout, on: boolean) => setItemFullBleed(l, section.id, item.id, on),
          (l: Layout, on: boolean) => setItemAllowOverlap(l, section.id, item.id, on),
        ];
        for (const toggle of toggles) expect(toggle(toggle(start, true), false)).toEqual(start);
      }),
      RUNS,
    );
  });

  it('setItemVerticalAlign on a breakpoint and cleared again restores the layout', () => {
    fc.assert(
      fc.property(arbFreeGridPick, ({ layout, section, item, bp }) => {
        fc.pre(bp !== 'desktop');
        const nd = bp as Exclude<Breakpoint, 'desktop'>;
        fc.pre(section.overrides?.[nd]?.items?.[item.id]?.verticalAlign === undefined);
        const set = setItemVerticalAlign(layout, section.id, item.id, 'center', nd);
        expect(sectionOf(set, section.id).overrides?.[nd]?.items?.[item.id]?.verticalAlign).toBe(
          'center',
        );
        expect(setItemVerticalAlign(set, section.id, item.id, undefined, nd)).toEqual(layout);
      }),
      RUNS,
    );
  });

  it('moveItemToSection there and back keeps the item and its breakpoint flags', () => {
    fc.assert(
      fc.property(arbLayout({ minSections: 2 }), fc.nat(), fc.nat(), fc.nat(), (start, a, b, i) => {
        const layout = deepFreeze(start);
        const from = layout.sections[a % layout.sections.length]!;
        const to =
          layout.sections[(a + 1 + (b % (layout.sections.length - 1))) % layout.sections.length]!;
        fc.pre(from.items.length > 0);
        const item = from.items[i % from.items.length]!;
        const there = moveItemToSection(layout, from.id, item.id, to.id);
        const back = moveItemToSection(there, to.id, item.id, from.id);
        expect(allItemIds(there).sort()).toEqual(allItemIds(layout).sort());
        expect(allItemIds(back).sort()).toEqual(allItemIds(layout).sort());
        const returned = sectionOf(back, from.id).items.find((entry) => entry.id === item.id)!;
        expect({ ...returned, x: 0, y: 0, w: 0, h: 0 }).toEqual({
          ...item,
          x: 0,
          y: 0,
          w: 0,
          h: 0,
        });
        for (const bp of NON_DESKTOP_BREAKPOINTS) {
          const was = from.overrides?.[bp]?.items?.[item.id];
          const now = sectionOf(back, from.id).overrides?.[bp]?.items?.[item.id];
          expect(now?.hidden).toEqual(was?.hidden);
          expect(now?.data).toEqual(was?.data);
          expect(now?.verticalAlign).toEqual(was?.verticalAlign);
        }
      }),
      RUNS,
    );
  });

  it('export then import keeps every resolved placement and hidden flag', () => {
    fc.assert(
      fc.property(arbLayout(), (start) => {
        const layout = deepFreeze(start);
        const round = importLayout(exportLayout(layout, {}), {});
        const enabled = getEnabledBreakpoints(layout);
        expect(round.breakpoints).toEqual(layout.breakpoints);
        layout.sections.forEach((section, s) => {
          section.items.forEach((item, i) => {
            for (const bp of enabled) {
              expect(
                resolveItem(round.sections[s]!.items[i]!, round.sections[s]!, bp, enabled),
              ).toEqual(resolveItem(item, section, bp, enabled));
            }
          });
        });
      }),
      RUNS,
    );
  });

  it('return the same layout for no-op inputs', () => {
    fc.assert(
      fc.property(arbLayout(), (start) => {
        const layout = deepFreeze(start);
        expect(moveSection(layout, 'missing', 0)).toBe(layout);
        expect(duplicateSection(layout, 'missing').layout).toBe(layout);
        expect(moveItemBelowOverlaps(layout, 'missing', 'x')).toBe(layout);
        for (const bp of NON_DESKTOP_BREAKPOINTS) {
          if (layout.breakpoints.includes(bp)) continue;
          expect(setBreakpointWidth(layout, bp, 500)).toBe(layout);
          expect(setBreakpointPreviewWidth(layout, bp, 500)).toBe(layout);
          expect(autoArrangeBreakpoint(layout, bp)).toBe(layout);
        }
        const enabled = getEnabledBreakpoints(layout);
        for (const section of layout.sections) {
          expect(moveItemToSection(layout, section.id, 'missing', section.id)).toBe(layout);
          for (const item of section.items) {
            if (!section.arrangement) {
              expect(moveItemToSection(layout, section.id, item.id, section.id)).toBe(layout);
            }
            for (const bp of enabled) {
              if (section.arrangement) continue;
              expect(moveItemBelowOverlaps(layout, section.id, item.id, bp)).toBe(layout);
            }
          }
          for (const bp of enabled) {
            const rows = resolveSection(section, bp, enabled).rows;
            if (rows !== sectionRows(section, bp, enabled) || section.arrangement) continue;
            expect(sectionOf(resizeSection(layout, section.id, rows, bp), section.id)).toBe(
              section,
            );
          }
        }
      }),
      RUNS,
    );
  });

  it('moveItemBelowOverlaps clears every overlap of the item, keeping its column and size', () => {
    fc.assert(
      fc.property(arbFreeGridPick, fc.nat(), ({ layout, section, item, bp }, o) => {
        const enabled = getEnabledBreakpoints(layout);
        fc.pre(section.items.length > 1);
        const others = section.items.filter((i) => i.id !== item.id);
        const target = resolveItem(others[o % others.length]!, section, bp, enabled);
        const collided = moveItem(layout, section.id, item.id, target.x, target.y, bp);
        const before = placementAt(collided, section.id, item.id, bp);
        const resolved = moveItemBelowOverlaps(collided, section.id, item.id, bp);
        const after = placementAt(resolved, section.id, item.id, bp);
        expect({ ...after, y: 0 }).toEqual({ ...before, y: 0 });
        const next = sectionOf(resolved, section.id);
        expect(
          overlappingPairs(next, bp, enabled).filter((pair) => pair.includes(item.id)),
        ).toEqual([]);
        expect(sectionRows(next, bp, enabled)).toBeGreaterThanOrEqual(after.y + after.h);
        expect(validateLayout(resolved).valid).toBe(true);
      }),
      RUNS,
    );
  });
});

describe('layout mutations: known issues (shrunk counterexamples)', () => {
  const arrangementOnly: Section = {
    id: 's0',
    columns: 12,
    colGap: 8,
    rowGap: 8,
    items: [],
    arrangement: { preset: 'single' },
  };

  it('autoArrangeBreakpoint over the whole layout leaves arrangement sections alone', () => {
    const layout: Layout = {
      sections: [arrangementOnly],
      breakpoints: ['desktop', 'mobile'],
      breakpointWidths: { mobile: 1 },
      breakpointPreviewWidths: { mobile: 1 },
    };
    expect(arrangementViolations(autoArrangeBreakpoint(layout, 'mobile'))).toEqual([]);
  });

  it('pasteItems into an arrangement section drops grid placement overrides', () => {
    const layout: Layout = {
      sections: [
        arrangementOnly,
        {
          id: 's1',
          columns: 1,
          colGap: 8,
          rowGap: 8,
          items: [{ id: 's1-i0', kind: 'text', x: 0, y: 0, w: 1, h: 1 }],
          overrides: { tablet: { items: { 's1-i0': { x: 0, y: 0, w: 1, h: 1 } } } },
        },
      ],
      breakpoints: ['desktop', 'tablet', 'mobile'],
      breakpointWidths: { mobile: 248, tablet: 640 },
      breakpointPreviewWidths: { mobile: 10, tablet: 738 },
    };
    const clipboard = copyItems(layout, 's1', ['s1-i0'])!;
    expect(arrangementViolations(pasteItems(layout, 's0', clipboard).layout)).toEqual([]);
  });

  it.fails('moveItemToSection without a position lands in a free slot of the target', () => {
    const block = (id: string) => ({ id, kind: 'text', x: 0, y: 0, w: 1, h: 1 });
    const layout: Layout = {
      sections: [
        { id: 's0', columns: 1, colGap: 8, rowGap: 8, items: [block('a')] },
        { id: 's1', columns: 1, colGap: 8, rowGap: 8, items: [block('b')] },
      ],
      breakpoints: ['desktop'],
      breakpointWidths: {},
      breakpointPreviewWidths: {},
    };
    expect(overlapViolations(moveItemToSection(layout, 's1', 'b', 's0'))).toEqual([]);
  });

  it.fails('export then import keeps a valid tablet width when mobile is disabled', () => {
    const layout: Layout = {
      sections: [],
      breakpoints: ['desktop', 'tablet'],
      breakpointWidths: { tablet: 1 },
      breakpointPreviewWidths: { tablet: 1 },
    };
    expect(validateLayout(layout).valid).toBe(true);
    expect(importLayout(exportLayout(layout, {}), {}).breakpointWidths).toEqual({ tablet: 1 });
  });
});
