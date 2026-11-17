import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { getEnabledBreakpoints, resolveItem, resolveSection, sectionRows } from '../lib/breakpoint';
import { validateLayout } from '../lib/validate';
import { arbLayout, deepFreeze } from '../test/arbitraries';
import { danglingOverrideKeys, visibleRects } from '../test/layoutInvariants';
import type { Breakpoint, Layout, Section } from '../types';
import {
  alignItems,
  clampGroupDelta,
  GROUP_ALIGNMENTS,
  groupBounds,
  groupMoveRange,
  moveItems,
  moveItemsToSection,
  removeItems,
} from './group';
import { removeItem } from './layout';

const RUNS = { numRuns: 150, seed: 20261105 };

type GroupPick = {
  layout: Layout;
  section: Section;
  ids: string[];
  bp: Breakpoint;
  enabled: Breakpoint[];
};

const arbGroupPick: fc.Arbitrary<GroupPick> = fc
  .tuple(arbLayout({ arrangements: 0 }), fc.nat(), fc.nat(), fc.array(fc.nat(), { maxLength: 5 }))
  .map(([layout, s, b, picks]) => {
    const section = layout.sections[s % layout.sections.length]!;
    const enabled = getEnabledBreakpoints(layout);
    const ids = section.items.length
      ? [...new Set(picks.map((p) => section.items[p % section.items.length]!.id))]
      : [];
    return { layout: deepFreeze(layout), section, ids, bp: enabled[b % enabled.length]!, enabled };
  });

function placements(layout: Layout, sectionId: string, bp: Breakpoint, enabled: Breakpoint[]) {
  const section = layout.sections.find((s) => s.id === sectionId)!;
  return Object.fromEntries(
    section.items.map((item) => [item.id, resolveItem(item, section, bp, enabled)]),
  );
}

function visibleMembers(pick: GroupPick) {
  const ids = new Set(pick.ids);
  return visibleRects(pick.section, pick.bp, pick.enabled).filter((r) => ids.has(r.id));
}

const isFullBleed = (section: Section, id: string) =>
  section.items.find((i) => i.id === id)!.fullBleed === true;

describe('group bounds and range', () => {
  it('bound every shown block tightly and give a range that contains zero', () => {
    fc.assert(
      fc.property(arbGroupPick, (pick) => {
        const { section, ids, bp, enabled } = pick;
        const members = visibleMembers(pick);
        const bounds = groupBounds(section, ids, bp, enabled);
        const range = groupMoveRange(section, ids, bp, enabled);
        if (members.length === 0) {
          expect(bounds).toBeNull();
          expect(range).toBeNull();
          return;
        }
        const box = bounds!;
        for (const r of members) {
          expect(r.x).toBeGreaterThanOrEqual(box.x);
          expect(r.y).toBeGreaterThanOrEqual(box.y);
          expect(r.x + r.w).toBeLessThanOrEqual(box.x + box.w);
          expect(r.y + r.h).toBeLessThanOrEqual(box.y + box.h);
        }
        expect(Math.min(...members.map((r) => r.x))).toBe(box.x);
        expect(Math.min(...members.map((r) => r.y))).toBe(box.y);
        expect(Math.max(...members.map((r) => r.x + r.w))).toBe(box.x + box.w);
        expect(Math.max(...members.map((r) => r.y + r.h))).toBe(box.y + box.h);
        const { minDx, maxDx, minDy, maxDy } = range!;
        expect(minDx).toBeLessThanOrEqual(0);
        expect(minDy).toBeLessThanOrEqual(0);
        expect(maxDx).toBeGreaterThanOrEqual(0);
        expect(maxDy).toBeGreaterThanOrEqual(0);
        expect(clampGroupDelta(range!, 0, 0)).toEqual({ dx: 0, dy: 0 });
      }),
      RUNS,
    );
  });
});

describe('moveItems', () => {
  it('moves shown blocks by one clamped delta, inside the section, and nothing else', () => {
    fc.assert(
      fc.property(
        arbGroupPick,
        fc.double({ min: -14, max: 14, noNaN: true }),
        fc.double({ min: -10, max: 10, noNaN: true }),
        (pick, dx, dy) => {
          const { layout, section, ids, bp, enabled } = pick;
          const snapshot = structuredClone(layout);
          const next = moveItems(layout, section.id, ids, dx, dy, bp);
          expect(layout).toEqual(snapshot);
          const range = groupMoveRange(section, ids, bp, enabled);
          const delta = range && clampGroupDelta(range, Math.round(dx), Math.round(dy));
          if (!delta || (delta.dx === 0 && delta.dy === 0)) {
            expect(next).toBe(layout);
            return;
          }
          expect(validateLayout(next).errors).toEqual([]);
          const before = placements(layout, section.id, bp, enabled);
          const after = placements(next, section.id, bp, enabled);
          const moved = new Set(visibleMembers(pick).map((r) => r.id));
          const { columns } = resolveSection(section, bp, enabled);
          const rows = sectionRows(section, bp, enabled);
          for (const [id, was] of Object.entries(before)) {
            const now = after[id]!;
            if (!moved.has(id)) {
              expect(now).toEqual(was);
              continue;
            }
            const stepX = isFullBleed(section, id) ? 0 : delta.dx;
            expect(now).toEqual({ ...was, x: was.x + stepX, y: was.y + delta.dy });
            expect(now.x + now.w).toBeLessThanOrEqual(columns);
            expect(now.y + now.h).toBeLessThanOrEqual(rows);
            expect(now.x).toBeGreaterThanOrEqual(0);
            expect(now.y).toBeGreaterThanOrEqual(0);
          }
        },
      ),
      RUNS,
    );
  });

  it('moving back by the applied delta restores every placement', () => {
    fc.assert(
      fc.property(
        arbGroupPick,
        fc.integer({ min: -14, max: 14 }),
        fc.integer({ min: -10, max: 10 }),
        (pick, dx, dy) => {
          const { layout, section, ids, bp, enabled } = pick;
          const range = groupMoveRange(section, ids, bp, enabled);
          fc.pre(range !== null);
          const delta = clampGroupDelta(range!, dx, dy);
          const moved = moveItems(layout, section.id, ids, dx, dy, bp);
          const back = moveItems(moved, section.id, ids, -delta.dx, -delta.dy, bp);
          expect(placements(back, section.id, bp, enabled)).toEqual(
            placements(layout, section.id, bp, enabled),
          );
        },
      ),
      RUNS,
    );
  });
});

describe('alignItems', () => {
  it('aligns movable blocks to the group box, keeps sizes; edge alignments are idempotent', () => {
    fc.assert(
      fc.property(arbGroupPick, fc.constantFrom(...GROUP_ALIGNMENTS), (pick, alignment) => {
        const { layout, section, ids, bp, enabled } = pick;
        const next = alignItems(layout, section.id, ids, alignment, bp);
        const members = visibleMembers(pick);
        const horizontal = ['left', 'center', 'right'].includes(alignment);
        const movable = members.filter((r) => !horizontal || !isFullBleed(section, r.id));
        if (members.length < 2 || movable.length === 0) {
          expect(next).toBe(layout);
          return;
        }
        if (alignment !== 'center' && alignment !== 'middle') {
          expect(alignItems(next, section.id, ids, alignment, bp)).toBe(next);
        }
        const left = Math.min(...movable.map((r) => r.x));
        const right = Math.max(...movable.map((r) => r.x + r.w));
        const top = Math.min(...movable.map((r) => r.y));
        const bottom = Math.max(...movable.map((r) => r.y + r.h));
        const before = placements(layout, section.id, bp, enabled);
        const after = placements(next, section.id, bp, enabled);
        const movableIds = new Set(movable.map((r) => r.id));
        for (const [id, was] of Object.entries(before)) {
          const now = after[id]!;
          if (!movableIds.has(id)) {
            expect(now).toEqual(was);
            continue;
          }
          expect({ w: now.w, h: now.h, hidden: now.hidden }).toEqual({
            w: was.w,
            h: was.h,
            hidden: was.hidden,
          });
          const expected = {
            left: { x: left, y: was.y },
            right: { x: right - was.w, y: was.y },
            center: { x: left + Math.floor((right - left - was.w) / 2), y: was.y },
            top: { x: was.x, y: top },
            bottom: { x: was.x, y: bottom - was.h },
            middle: { x: was.x, y: top + Math.floor((bottom - top - was.h) / 2) },
          }[alignment];
          expect({ x: now.x, y: now.y }).toEqual(expected);
        }
      }),
      RUNS,
    );
  });
});

describe('removeItems', () => {
  it('equals removing each present block in turn and returns the layout when none exists', () => {
    fc.assert(
      fc.property(arbGroupPick, (pick) => {
        const { layout, section, ids } = pick;
        const next = removeItems(layout, section.id, [...ids, 'missing']);
        if (ids.length === 0) {
          expect(next).toBe(layout);
          return;
        }
        const sequential = ids.reduce((l, id) => removeItem(l, section.id, id), layout);
        expect(next).toEqual(sequential);
        const remaining = next.sections.find((s) => s.id === section.id)!.items.map((i) => i.id);
        expect(remaining).toEqual(section.items.map((i) => i.id).filter((id) => !ids.includes(id)));
        expect(danglingOverrideKeys(next)).toEqual([]);
        expect(removeItems(layout, 'missing', ids)).toBe(layout);
      }),
      RUNS,
    );
  });
});

type CrossPick = GroupPick & { target: Section };

const arbCrossPick: fc.Arbitrary<CrossPick> = fc
  .tuple(
    arbLayout({ arrangements: 0, minSections: 2 }),
    fc.nat(),
    fc.nat(),
    fc.nat(),
    fc.array(fc.nat(), { maxLength: 5 }),
  )
  .map(([layout, s, t, b, picks]) => {
    const count = layout.sections.length;
    const section = layout.sections[s % count]!;
    const target = layout.sections[(s + 1 + (t % (count - 1))) % count]!;
    const enabled = getEnabledBreakpoints(layout);
    const ids = section.items.length
      ? [...new Set(picks.map((p) => section.items[p % section.items.length]!.id))]
      : [];
    return {
      layout: deepFreeze(layout),
      section,
      target,
      ids,
      bp: enabled[b % enabled.length]!,
      enabled,
    };
  });

describe('moveItemsToSection', () => {
  it('moves the shown blocks inside the target, keeping their arrangement, growing it minimally', () => {
    fc.assert(
      fc.property(
        arbCrossPick,
        fc.integer({ min: -4, max: 16 }),
        fc.integer({ min: -4, max: 12 }),
        (pick, x, y) => {
          const { layout, section, target, ids, bp, enabled } = pick;
          const snapshot = structuredClone(layout);
          const next = moveItemsToSection(layout, section.id, ids, target.id, {
            x,
            y,
            breakpoint: bp,
          });
          expect(layout).toEqual(snapshot);
          const members = visibleMembers(pick);
          if (members.length === 0) {
            expect(next).toBe(layout);
            return;
          }
          expect(validateLayout(next).errors).toEqual([]);
          expect(danglingOverrideKeys(next)).toEqual([]);

          const from = next.sections.find((s) => s.id === section.id)!;
          const to = next.sections.find((s) => s.id === target.id)!;
          const memberIds = new Set(members.map((r) => r.id));
          expect(from.items.map((i) => i.id)).toEqual(
            section.items.map((i) => i.id).filter((id) => !memberIds.has(id)),
          );
          expect(sectionRows(from, bp, enabled)).toBe(sectionRows(section, bp, enabled));

          const added = to.items.slice(target.items.length);
          expect(added).toHaveLength(members.length);
          const { columns } = resolveSection(to, bp, enabled);
          const rows = sectionRows(to, bp, enabled);
          const box = groupBounds(section, ids, bp, enabled)!;
          const anchorX = Math.max(0, Math.min(x, columns - box.w));
          const anchorY = Math.max(0, y);
          expect(rows).toBe(Math.max(sectionRows(target, bp, enabled), anchorY + box.h));

          // Added blocks follow the source stacking order.
          const ordered = section.items.filter((i) => memberIds.has(i.id));
          added.forEach((moved, k) => {
            const was = resolveItem(ordered[k]!, section, bp, enabled);
            const now = resolveItem(moved, to, bp, enabled);
            expect(now.hidden).toBeFalsy();
            expect(now.x).toBeGreaterThanOrEqual(0);
            expect(now.y).toBeGreaterThanOrEqual(0);
            expect(now.x + now.w).toBeLessThanOrEqual(columns);
            expect(now.y + now.h).toBeLessThanOrEqual(rows);
            expect(now.y - anchorY).toBe(was.y - box.y);
            expect(now.h).toBe(was.h);
            if (!ordered[k]!.fullBleed && box.w <= columns) {
              expect({ x: now.x - anchorX, w: now.w }).toEqual({ x: was.x - box.x, w: was.w });
            }
          });
        },
      ),
      RUNS,
    );
  });
});
