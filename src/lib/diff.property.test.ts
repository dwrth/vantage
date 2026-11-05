import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { moveSection } from '../mutations/layout';
import { arbLayout, deepFreeze } from '../test/arbitraries';
import { applyLayoutOp, arbLayoutOp } from '../test/layoutOps';
import type { GridItem, Layout, Section } from '../types';
import { diffLayouts, emitLayoutChange, type LayoutChangeset } from './diff';

const RUNS = { numRuns: 150, seed: 20261105 };

const CHROME_KEYS = [
  'label',
  'columns',
  'colGap',
  'rowGap',
  'paddingTop',
  'paddingBottom',
  'rows',
  'background',
  'overrides',
  'arrangement',
  'meta',
] as const;

const TOP_LEVEL_KEYS = [
  'breakpoints',
  'breakpointWidths',
  'breakpointPreviewWidths',
  'meta',
] as const;

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const arbTransition: fc.Arbitrary<{ prev: Layout; next: Layout }> = fc
  .tuple(arbLayout({ maxSections: 3 }), fc.array(arbLayoutOp(), { minLength: 1, maxLength: 3 }))
  .map(([layout, ops]) => {
    const prev = deepFreeze(layout);
    const next = ops.reduce((current, op) => applyLayoutOp(current, op).layout, prev);
    return { prev, next };
  });

function isEmpty(changes: LayoutChangeset) {
  const { layoutUpdated, ...lists } = changes;
  return layoutUpdated === null && Object.values(lists).every((list) => list.length === 0);
}

type Rebuilt = { chrome: Pick<Section, (typeof CHROME_KEYS)[number]>; items: GridItem[] };

/** Replays a changeset onto `prev`, using only what the changeset carries. */
function applyChangeset(prev: Layout, changes: LayoutChangeset) {
  const sections = new Map<string, Rebuilt>();
  const chromeOf = (section: Section) =>
    Object.fromEntries(CHROME_KEYS.map((key) => [key, section[key]])) as Rebuilt['chrome'];
  for (const section of prev.sections) {
    sections.set(section.id, { chrome: chromeOf(section), items: [...section.items] });
  }
  for (const { sectionId } of changes.sectionsRemoved) sections.delete(sectionId);
  for (const { section } of changes.sectionsAdded) {
    sections.set(section.id, { chrome: chromeOf(section), items: [] });
  }
  for (const { section } of changes.sectionsUpdated) {
    sections.get(section.id)!.chrome = chromeOf(section);
  }
  const drop = (sectionId: string, itemId: string) => {
    const target = sections.get(sectionId);
    if (target) target.items = target.items.filter((item) => item.id !== itemId);
  };
  for (const { sectionId, itemId } of changes.itemsRemoved) drop(sectionId, itemId);
  for (const { fromSectionId, toSectionId, item } of changes.itemsMoved) {
    drop(fromSectionId, item.id);
    sections.get(toSectionId)!.items.push(item);
  }
  for (const { sectionId, item } of changes.itemsAdded) sections.get(sectionId)!.items.push(item);
  for (const { sectionId, item } of changes.itemsUpdated) {
    const target = sections.get(sectionId)!;
    target.items = target.items.map((current) => (current.id === item.id ? item : current));
  }
  for (const { sectionId, itemIds } of changes.itemsReordered) {
    const target = sections.get(sectionId)!;
    const byId = new Map(target.items.map((item) => [item.id, item]));
    target.items = itemIds.map((id) => byId.get(id)!);
  }
  const top = changes.layoutUpdated?.layout ?? prev;
  return {
    sections,
    top: Object.fromEntries(TOP_LEVEL_KEYS.map((key) => [key, top[key]])),
  };
}

describe('diffLayouts', () => {
  it('is empty for the same layout and for copies that share every part', () => {
    fc.assert(
      fc.property(arbLayout({ maxSections: 4 }), (layout) => {
        expect(isEmpty(diffLayouts(layout, layout))).toBe(true);
        expect(isEmpty(diffLayouts(layout, { ...layout, sections: [...layout.sections] }))).toBe(
          true,
        );
      }),
      RUNS,
    );
  });

  it('replays onto the previous layout to rebuild the next one', () => {
    fc.assert(
      fc.property(arbTransition, ({ prev, next }) => {
        const changes = diffLayouts(prev, next);
        const rebuilt = applyChangeset(prev, changes);
        expect([...rebuilt.sections.keys()].sort()).toEqual(next.sections.map((s) => s.id).sort());
        for (const section of next.sections) {
          const got = rebuilt.sections.get(section.id)!;
          for (const key of CHROME_KEYS) expect(got.chrome[key]).toBe(section[key]);
          expect(new Map(got.items.map((item) => [item.id, item]))).toEqual(
            new Map(section.items.map((item) => [item.id, item])),
          );
          const prevSection = prev.sections.find((s) => s.id === section.id);
          const sameMembers =
            prevSection !== undefined &&
            [...prevSection.items.map((i) => i.id)].sort().join() ===
              [...section.items.map((i) => i.id)].sort().join();
          if (sameMembers)
            expect(got.items.map((i) => i.id)).toEqual(section.items.map((i) => i.id));
        }
        for (const key of TOP_LEVEL_KEYS) expect(rebuilt.top[key]).toBe(next[key]);
      }),
      RUNS,
    );
  });

  it('reports each changed item once, in exactly one list', () => {
    fc.assert(
      fc.property(arbTransition, ({ prev, next }) => {
        const changes = diffLayouts(prev, next);
        const ids = [
          ...changes.itemsAdded.map((e) => e.item.id),
          ...changes.itemsRemoved.map((e) => e.itemId),
          ...changes.itemsUpdated.map((e) => e.item.id),
          ...changes.itemsMoved.map((e) => e.item.id),
        ];
        expect(new Set(ids).size).toBe(ids.length);
      }),
      RUNS,
    );
  });

  it('does not report a reorder when one block is swapped for another', () => {
    const block = (id: string): GridItem => ({ id, kind: 'text', x: 0, y: 0, w: 1, h: 1 });
    const section: Section = {
      id: 's',
      columns: 4,
      colGap: 8,
      rowGap: 8,
      items: [block('a'), block('b')],
    };
    const prev: Layout = {
      sections: [section],
      breakpoints: ['desktop'],
      breakpointWidths: {},
      breakpointPreviewWidths: {},
    };
    const next: Layout = { ...prev, sections: [{ ...section, items: [block('c'), block('a')] }] };
    const changes = diffLayouts(prev, next);
    expect(changes.itemsReordered).toEqual([]);
    expect(changes.itemsAdded.map((e) => e.item.id)).toEqual(['c']);
    expect(changes.itemsRemoved.map((e) => e.itemId)).toEqual(['b']);
    expect(changes.itemsUpdated.map((e) => e.item.id)).toEqual(['a']);
  });

  it.fails('reports a change when only the section order changes', () => {
    const empty = (id: string): Section => ({ id, columns: 4, colGap: 8, rowGap: 8, items: [] });
    const prev: Layout = {
      sections: [empty('s0'), empty('s1')],
      breakpoints: ['desktop'],
      breakpointWidths: {},
      breakpointPreviewWidths: {},
    };
    const next = moveSection(prev, 's1', 0);
    expect(next.sections.map((s) => s.id)).toEqual(['s1', 's0']);
    expect(isEmpty(diffLayouts(prev, next))).toBe(false);
  });
});

describe('emitLayoutChange', () => {
  it('passes the next layout, its changeset and the options to onChange', () => {
    const prev: Layout = {
      sections: [],
      breakpoints: ['desktop'],
      breakpointWidths: {},
      breakpointPreviewWidths: {},
    };
    const next: Layout = { ...prev, meta: { page: 'home' } };
    const onChange = vi.fn();
    emitLayoutChange(prev, next, onChange, { mergeKey: 'meta' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(next, diffLayouts(prev, next), { mergeKey: 'meta' });
    expect(onChange.mock.calls[0]![1].layoutUpdated).toEqual({ layout: next, prev });
  });
});
