// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { createRef, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BuilderContext, type BuilderContextValue } from '../context/BuilderContext';
import { DEFAULT_LABELS } from '../lib/defaultLabels';
import { DEFAULT_BLOCK_ANNOUNCEMENTS, DEFAULT_BLOCK_LABELS } from '../lib/keyboardLabels';
import type { ItemClipboard } from '../mutations/layout';
import type { Breakpoint, GridItem, Layout, ResolvedComponentRegistry } from '../types';
import { useBuilderActions } from './useBuilderActions';

const item = (id: string, x: number, y: number, extra: Partial<GridItem> = {}): GridItem => ({
  id,
  kind: 'block',
  label: id.toUpperCase(),
  x,
  y,
  w: 2,
  h: 2,
  ...extra,
});

const layout: Layout = {
  breakpoints: ['desktop', 'mobile'],
  breakpointWidths: { mobile: 390 },
  breakpointPreviewWidths: {},
  sections: [
    {
      id: 's',
      columns: 12,
      colGap: 8,
      rowGap: 8,
      rows: 6,
      items: [item('a', 0, 0), item('b', 4, 0), item('c', 0, 3)],
    },
    { id: 't', columns: 12, colGap: 8, rowGap: 8, rows: 4, items: [] },
  ],
};

const components: ResolvedComponentRegistry = {
  block: { component: () => null, defaults: { w: 1, h: 1 } },
  card: {
    component: () => null,
    defaults: { w: 5, h: 3, label: 'Card', data: { title: 'x' } },
  },
};

function setup(overrides: Partial<BuilderContextValue> = {}, base: Layout = layout) {
  const onChange = vi.fn<(next: Layout) => void>();
  const value = {
    layout: base,
    onChange,
    components,
    activeBreakpoint: 'desktop' as Breakpoint,
    defaultLabels: DEFAULT_LABELS,
    blockLabels: DEFAULT_BLOCK_LABELS,
    announcements: DEFAULT_BLOCK_ANNOUNCEMENTS,
    minSizesRef: createRef() as BuilderContextValue['minSizesRef'],
    ...overrides,
  } as BuilderContextValue;
  const view = renderHook(() => useBuilderActions(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>
    ),
  });
  const next = () => onChange.mock.lastCall![0];
  const items = (sectionId = 's') => next().sections.find((s) => s.id === sectionId)!.items;
  const find = (id: string, sectionId = 's') => items(sectionId).find((i) => i.id === id)!;
  return { actions: () => view.result.current, onChange, next, items, find, view };
}

describe('useBuilderActions sections', () => {
  it('addSection appends a section labelled from the default labels', () => {
    const { actions, next } = setup({
      defaultLabels: { ...DEFAULT_LABELS, section: (n) => `Bereich ${n}` },
    });
    const id = actions().addSection();
    expect(next().sections.map((s) => s.id)).toEqual(['s', 't', id]);
    expect(next().sections[2]!.label).toBe('Bereich 3');
  });

  it('insertSection places the section at the index', () => {
    const { actions, next } = setup();
    const id = actions().insertSection(1);
    expect(next().sections.map((s) => s.id)).toEqual(['s', id, 't']);
    expect(next().sections[1]!.label).toBe('Section 3');
  });

  it('moveSection and moveSectionBy reorder sections', () => {
    const { actions, next } = setup();
    actions().moveSection('s', 1);
    expect(next().sections.map((s) => s.id)).toEqual(['t', 's']);
    actions().moveSectionBy('s', 1);
    expect(next().sections.map((s) => s.id)).toEqual(['t', 's']);
  });

  it('duplicateSection returns the new id and clones the items', () => {
    const { actions, next } = setup();
    const id = actions().duplicateSection('s');
    expect(next().sections.map((s) => s.id)).toEqual(['s', id, 't']);
    expect(next().sections[1]!.items).toHaveLength(3);
  });

  it('removeSection, updateSection and resizeSection edit one section', () => {
    const { actions, next } = setup();
    actions().removeSection('t');
    expect(next().sections.map((s) => s.id)).toEqual(['s']);
    actions().updateSection('s', { label: 'Hero' });
    expect(next().sections[0]!.label).toBe('Hero');
    actions().resizeSection('s', 9);
    expect(next().sections[0]!.rows).toBe(9);
  });

  it('resizeSection targets the active breakpoint unless one is passed', () => {
    const { actions, next } = setup({ activeBreakpoint: 'mobile' });
    actions().resizeSection('s', 10);
    expect(next().sections[0]!.overrides?.mobile?.rows).toBe(10);
    expect(next().sections[0]!.rows).toBe(6);
    actions().resizeSection('s', 8, 'desktop');
    expect(next().sections[0]!.rows).toBe(8);
  });

  it('meta updaters merge into layout, section and item meta', () => {
    const { actions, next } = setup();
    actions().updateLayoutMeta({ title: 'Page' });
    expect(next().meta).toEqual({ title: 'Page' });
    actions().updateSectionMeta('s', { theme: 'dark' });
    expect(next().sections[0]!.meta).toEqual({ theme: 'dark' });
    actions().updateItemMeta('s', 'a', { pinned: true });
    expect(next().sections[0]!.items[0]!.meta).toEqual({ pinned: true });
  });
});

describe('useBuilderActions clones', () => {
  it('duplicateItems returns the id map and adds the copies', () => {
    const { actions, items } = setup();
    const ids = actions().duplicateItems('s', ['a']);
    expect(Object.keys(ids)).toEqual(['a']);
    expect(items()).toHaveLength(4);
    expect(items().some((i) => i.id === ids.a)).toBe(true);
  });

  it('pasteItems places clipboard items into the target section', () => {
    const { actions, items } = setup();
    const clipboard: ItemClipboard = {
      type: 'vantage/items',
      version: 1,
      columns: 12,
      items: [item('z', 0, 0)],
      overrides: {},
    };
    const ids = actions().pasteItems('t', clipboard);
    expect(items('t')).toHaveLength(1);
    expect(items('t')[0]!.id).toBe(ids.z);
  });
});

describe('useBuilderActions breakpoints', () => {
  it('stores breakpoint configuration', () => {
    const { actions, next } = setup();
    actions().setLayoutBreakpoints(['desktop', 'tablet', 'mobile']);
    expect(next().breakpoints).toEqual(['desktop', 'tablet', 'mobile']);
    actions().setBreakpointWidth('mobile', 400.4);
    expect(next().breakpointWidths.mobile).toBe(400);
    actions().setBreakpointPreviewWidth('mobile', 420);
    expect(next().breakpointPreviewWidths.mobile).toBe(420);
  });

  it('sets and clears section overrides', () => {
    const { actions, next } = setup();
    actions().setSectionOverride('s', 'mobile', { columns: 4 });
    expect(next().sections[0]!.overrides?.mobile?.columns).toBe(4);
    actions().clearSectionOverride('s', 'mobile');
    expect(next().sections[0]!.overrides?.mobile).toBeUndefined();
  });

  it('clearItemOverride drops an item override on that breakpoint', () => {
    const withOverride: Layout = {
      ...layout,
      sections: [
        {
          ...layout.sections[0]!,
          overrides: { mobile: { items: { a: { x: 1, y: 5 } } } },
        },
      ],
    };
    const { actions, next } = setup({}, withOverride);
    actions().clearItemOverride('s', 'mobile', 'a');
    expect(next().sections[0]!.overrides?.mobile?.items?.a).toBeUndefined();
  });
});

describe('useBuilderActions items', () => {
  it('addItem applies descriptor defaults and the block label formatter', () => {
    const { actions, items } = setup();
    actions().addItem('t', 'card');
    expect(items('t')).toHaveLength(1);
    expect(items('t')[0]).toMatchObject({
      kind: 'card',
      w: 5,
      h: 3,
      label: 'Card 1',
      data: { title: 'x' },
    });
  });

  it('addItem falls back to the kind name for an unregistered kind', () => {
    const { actions, items } = setup();
    actions().addItem('t', 'mystery');
    expect(items('t')[0]).toMatchObject({ kind: 'mystery', label: 'Mystery 1' });
  });

  it('moveItem and resizeItem use the desktop grid by default', () => {
    const { actions, find } = setup();
    actions().moveItem('s', 'a', 3, 1);
    expect(find('a')).toMatchObject({ x: 3, y: 1 });
    actions().resizeItem('s', 'a', 0, 0, 4, 3);
    expect(find('a')).toMatchObject({ x: 0, y: 0, w: 4, h: 3 });
  });

  it('moveItem and resizeItem write an override on the active breakpoint', () => {
    const { actions, next, find } = setup({ activeBreakpoint: 'mobile' });
    actions().moveItem('s', 'a', 1, 4);
    expect(next().sections[0]!.overrides?.mobile?.items?.a).toMatchObject({ x: 1, y: 4 });
    expect(find('a')).toMatchObject({ x: 0, y: 0 });
    actions().resizeItem('s', 'b', 0, 6, 3, 2);
    expect(next().sections[0]!.overrides?.mobile?.items?.b).toMatchObject({ w: 3, h: 2 });
  });

  it('an explicit breakpoint wins over the active one', () => {
    const { actions, find } = setup({ activeBreakpoint: 'mobile' });
    actions().moveItem('s', 'a', 5, 0, 'desktop');
    expect(find('a').x).toBe(5);
  });

  it('removeItem deletes the block', () => {
    const { actions, items } = setup();
    actions().removeItem('s', 'a');
    expect(items().map((i) => i.id)).toEqual(['b', 'c']);
  });

  it('updateItemData merges into desktop data, or the active breakpoint override', () => {
    const base: Layout = {
      ...layout,
      sections: [
        { ...layout.sections[0]!, items: [item('a', 0, 0, { data: { title: 'A', size: 1 } })] },
      ],
    };
    const desktop = setup({}, base);
    desktop.actions().updateItemData('s', 'a', { title: 'B' });
    expect(desktop.find('a').data).toEqual({ title: 'B', size: 1 });

    const mobile = setup({ activeBreakpoint: 'mobile' }, base);
    mobile.actions().updateItemData('s', 'a', { size: 2 });
    expect(mobile.find('a').data).toEqual({ title: 'A', size: 1 });
    expect(mobile.next().sections[0]!.overrides?.mobile?.items?.a?.data).toEqual({ size: 2 });

    mobile.actions().updateItemData('s', 'a', { title: 'D' }, 'desktop');
    expect(mobile.find('a').data).toEqual({ title: 'D', size: 1 });
  });

  it('setItemHidden hides on the active breakpoint, or an explicit one', () => {
    const desktop = setup();
    desktop.actions().setItemHidden('s', 'a', true);
    expect(desktop.find('a').hidden).toBe(true);

    const mobile = setup({ activeBreakpoint: 'mobile' });
    mobile.actions().setItemHidden('s', 'a', true);
    expect(mobile.next().sections[0]!.overrides?.mobile?.items?.a?.hidden).toBe(true);
    expect(mobile.find('a').hidden).toBeUndefined();
    mobile.actions().setItemHidden('s', 'a', true, 'desktop');
    expect(mobile.find('a').hidden).toBe(true);
  });
});

describe('useBuilderActions overlap and layering', () => {
  const overlapping: Layout = {
    ...layout,
    sections: [
      { ...layout.sections[0]!, items: [item('a', 0, 0), item('b', 1, 1), item('c', 8, 0)] },
    ],
  };

  it('moveItemBelowOverlaps moves the block under what it overlaps', () => {
    const { actions, find } = setup({}, overlapping);
    actions().moveItemBelowOverlaps('s', 'b');
    expect(find('b').y).toBe(2);
  });

  it('setItemAllowOverlap sets the flag', () => {
    const { actions, find, onChange } = setup({}, overlapping);
    actions().setItemAllowOverlap('s', 'b', true);
    expect(find('b').allowOverlap).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('reorders the stacking order, each call starting from the same layout', () => {
    const { actions, items } = setup();
    const ids = () => items().map((i) => i.id);
    actions().bringItemForward('s', 'a');
    expect(ids()).toEqual(['b', 'a', 'c']);
    actions().sendItemBackward('s', 'c');
    expect(ids()).toEqual(['a', 'c', 'b']);
    actions().bringItemToFront('s', 'a');
    expect(ids()).toEqual(['b', 'c', 'a']);
    actions().sendItemToBack('s', 'c');
    expect(ids()).toEqual(['c', 'a', 'b']);
  });
});

describe('useBuilderActions groups', () => {
  it('moveItems moves the group as a unit', () => {
    const { actions, find } = setup();
    actions().moveItems('s', ['a', 'b'], 1, 1);
    expect(find('a')).toMatchObject({ x: 1, y: 1 });
    expect(find('b')).toMatchObject({ x: 5, y: 1 });
  });

  it('moveItems on the active breakpoint writes overrides', () => {
    const { actions, next } = setup({ activeBreakpoint: 'mobile' });
    actions().moveItems('s', ['a', 'b'], 0, 3);
    expect(next().sections[0]!.overrides?.mobile?.items?.a).toMatchObject({ y: 3 });
  });

  it('moveItems that changes nothing does not emit a change', () => {
    const { actions, onChange } = setup();
    actions().moveItems('s', ['a'], 0, 0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('alignItems aligns over the bounding box', () => {
    const { actions, find } = setup();
    actions().alignItems('s', ['b', 'c'], 'left');
    expect(find('b').x).toBe(0);
    expect(find('c').x).toBe(0);
  });

  it('alignItems that changes nothing does not emit a change', () => {
    const { actions, onChange } = setup();
    actions().alignItems('s', ['a'], 'left');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removeItems removes the group in one change', () => {
    const { actions, items, onChange } = setup();
    actions().removeItems('s', ['a', 'b']);
    expect(items().map((i) => i.id)).toEqual(['c']);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('removeItems without matches does not emit a change', () => {
    const { actions, onChange } = setup();
    actions().removeItems('s', []);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('useBuilderActions import and clear', () => {
  it('importLayout runs the layout through the import normalisation', () => {
    const { actions, next } = setup();
    actions().importLayout({
      ...layout,
      sections: [{ ...layout.sections[0]!, items: [item('a', 0, 0)] }],
    });
    expect(next().sections[0]!.items.map((i) => i.id)).toEqual(['a']);
  });

  it('clear resets to an empty layout', () => {
    const { actions, next } = setup();
    actions().clear();
    expect(next().sections).toEqual([]);
  });

  it('keeps the same actions object while the context is unchanged', () => {
    const { view } = setup();
    const first = view.result.current;
    view.rerender();
    expect(view.result.current).toBe(first);
  });
});
