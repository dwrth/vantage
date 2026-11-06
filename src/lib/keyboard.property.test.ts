import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { arbLayout, deepFreeze } from '../test/arbitraries';
import { allItemIds, arrangementViolations } from '../test/layoutInvariants';
import type { Layout } from '../types';
import { getEnabledBreakpoints, resolveItem, resolveSection, sectionRows } from './breakpoint';
import { applyBlockAction, type BlockEditAction } from './keyboard';
import { validateLayout } from './validate';

const RUNS = { numRuns: 150, seed: 20261105 };

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const step = fc.constantFrom(-1, 0, 1);

const arbAction: fc.Arbitrary<BlockEditAction> = fc.oneof(
  fc.record({ type: fc.constant('move' as const), dx: step, dy: step }),
  fc.record({ type: fc.constant('resize' as const), dw: step, dh: step }),
  fc.constantFrom<BlockEditAction>(
    { type: 'bringForward' },
    { type: 'sendBackward' },
    { type: 'delete' },
  ),
);

const arbEdit = fc
  .record({
    type: fc.constantFrom('move' as const, 'resize' as const),
    a: step,
    b: step,
  })
  .map(
    ({ type, a, b }): BlockEditAction =>
      type === 'move' ? { type, dx: a, dy: b } : { type, dw: a, dh: b },
  );

const arbCase = (
  options: Parameters<typeof arbLayout>[0],
  actions: fc.Arbitrary<BlockEditAction>,
) =>
  fc
    .tuple(
      arbLayout(options).filter((layout) => layout.sections.some((s) => s.items.length > 0)),
      fc.nat(),
      fc.nat(),
      fc.nat(),
      actions,
      fc.option(
        fc.record({ w: fc.integer({ min: 1, max: 6 }), h: fc.integer({ min: 1, max: 6 }) }),
        {
          nil: undefined,
        },
      ),
    )
    .map(([layout, s, i, b, action, minSize]) => {
      const enabled = getEnabledBreakpoints(layout);
      const bp = enabled[b % enabled.length]!;
      const sections = layout.sections.filter((section) => section.items.length > 0);
      const section = sections[s % sections.length]!;
      const item = section.items[i % section.items.length]!;
      return {
        layout: deepFreeze(layout) as Layout,
        selection: { sectionId: section.id, itemId: item.id },
        bp,
        action,
        minSize,
      };
    });

type Case = ReturnType<typeof arbCase> extends fc.Arbitrary<infer T> ? T : never;

function checkEdit({ layout, selection, bp, action, minSize }: Case) {
  const enabled = getEnabledBreakpoints(layout);
  const section = layout.sections.find((s) => s.id === selection.sectionId)!;
  const item = section.items.find((i) => i.id === selection.itemId)!;
  const before = resolveItem(item, section, bp, enabled);
  const result = applyBlockAction(layout, selection, action, bp, { minSize });

  if (before.hidden) {
    expect(result).toBeNull();
    return;
  }
  expect(result).not.toBeNull();
  const { layout: next, item: reported } = result!;
  expect(validateLayout(next)).toEqual({ valid: true, errors: [] });
  expect(arrangementViolations(next)).toEqual(arrangementViolations(layout));

  const ids = allItemIds(layout);
  const expectedIds = action.type === 'delete' ? ids.filter((id) => id !== selection.itemId) : ids;
  expect([...allItemIds(next)].sort()).toEqual([...expectedIds].sort());

  for (const other of layout.sections) {
    if (other.id === section.id) continue;
    expect(next.sections.find((s) => s.id === other.id)).toBe(other);
  }

  if (next === layout) {
    expect(reported).toMatchObject({ x: before.x, y: before.y, w: before.w, h: before.h });
  }

  if (section.arrangement || action.type === 'delete') return;
  const nextSection = next.sections.find((s) => s.id === section.id)!;
  const nextItem = nextSection.items.find((i) => i.id === selection.itemId)!;
  const after = resolveItem(nextItem, nextSection, bp, enabled);
  const { columns } = resolveSection(nextSection, bp, enabled);
  const rows = sectionRows(section, bp, enabled);
  expect(after.x + after.w).toBeLessThanOrEqual(columns);
  expect(after.y + after.h).toBeLessThanOrEqual(rows);
  if (action.type === 'move' || action.type === 'resize') {
    expect(reported).toMatchObject({ x: after.x, y: after.y, w: after.w, h: after.h });
  }
  if (action.type === 'move') {
    expect(after.w).toBe(before.w);
    expect(after.h).toBe(before.h);
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  }
  if (action.type === 'resize') {
    expect(after.x).toBe(before.x);
    expect(after.y).toBe(before.y);
    if (after.w < before.w) expect(after.w).toBeGreaterThanOrEqual(minSize?.w ?? 1);
    if (after.h < before.h) expect(after.h).toBeGreaterThanOrEqual(minSize?.h ?? 1);
  }
}

describe('applyBlockAction on generated layouts', () => {
  it('never produces an invalid layout and keeps edits inside the section', () => {
    fc.assert(
      fc.property(arbCase({ maxSections: 3, arrangements: 0.3 }, arbAction), checkEdit),
      RUNS,
    );
  });

  it('reports the placement it wrote for moves and resizes at the section edges', () => {
    fc.assert(
      fc.property(arbCase({ maxSections: 1, maxItems: 2, arrangements: 0 }, arbEdit), checkEdit),
      RUNS,
    );
  });

  it.fails('moves the block where it is shown when the breakpoint is disabled', () => {
    const layout: Layout = {
      sections: [
        {
          id: 's0',
          columns: 1,
          colGap: 8,
          rowGap: 8,
          items: [{ id: 'a', kind: 'text', x: 0, y: 1, w: 1, h: 1 }],
        },
      ],
      breakpoints: ['desktop'],
      breakpointWidths: {},
      breakpointPreviewWidths: {},
    };
    const result = applyBlockAction(
      layout,
      { sectionId: 's0', itemId: 'a' },
      { type: 'move', dx: 0, dy: -1 },
      'tablet',
    )!;
    expect(result.item).toMatchObject({ y: 0 });
    const section = result.layout.sections[0]!;
    expect(resolveItem(section.items[0]!, section, 'tablet', ['desktop'])).toMatchObject({ y: 0 });
  });

  it('returns null for a section that does not exist', () => {
    const layout: Layout = {
      sections: [],
      breakpoints: ['desktop'],
      breakpointWidths: {},
      breakpointPreviewWidths: {},
    };
    expect(
      applyBlockAction(
        layout,
        { sectionId: 'missing', itemId: 'a' },
        { type: 'delete' },
        'desktop',
      ),
    ).toBeNull();
  });
});
