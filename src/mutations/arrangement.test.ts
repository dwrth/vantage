import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ARRANGEMENT_PRESET_IDS } from '../lib/arrangement';
import { applyBlockAction } from '../lib/keyboard';
import { validateLayout } from '../lib/validate';
import { VantagePreview } from '../components/VantagePreview';
import type { ComponentRegistry, Layout, Section } from '../types';
import { setSectionArrangement } from './arrangement';
import {
  addItem,
  addSection,
  createEmptyLayout,
  importLayout,
  moveItemToIndex,
  moveItemToSection,
  setItemHidden,
  setLayoutBreakpoints,
} from './layout';

const registry: ComponentRegistry = {
  block: { component: () => null, defaults: { w: 3, h: 2 } },
};

function arrangementLayout(count = 3, preset: 'three' | 'two' = 'three') {
  let layout = setLayoutBreakpoints(createEmptyLayout(), ['desktop', 'tablet', 'mobile']);
  const created = addSection(layout, { arrangement: { preset } });
  layout = created.layout;
  for (let i = 0; i < count; i += 1) {
    layout = addItem(layout, created.sectionId, 'block', { id: `i${i}` });
  }
  return { layout, sectionId: created.sectionId };
}

const order = (layout: Layout, sectionId: string) =>
  layout.sections.find((s) => s.id === sectionId)!.items.map((i) => i.id);

describe('arrangement sections', () => {
  it('are created from a preset with the 12 column grid', () => {
    const { layout, sectionId } = arrangementLayout(0);
    const section = layout.sections.find((s) => s.id === sectionId)!;
    expect(section.arrangement).toEqual({ preset: 'three' });
    expect(section.columns).toBe(12);
    expect(validateLayout(layout).errors).toEqual([]);
  });

  it('appends added blocks, or inserts them at an index, without placing them on a grid', () => {
    const { layout, sectionId } = arrangementLayout(2);
    expect(order(layout, sectionId)).toEqual(['i0', 'i1']);
    const inserted = addItem(layout, sectionId, 'block', { id: 'x', index: 1, x: 7, y: 9 });
    expect(order(inserted, sectionId)).toEqual(['i0', 'x', 'i1']);
    const added = inserted.sections[0]!.items[1]!;
    expect(added).toMatchObject({ x: 0, y: 0 });
    expect(inserted.sections[0]!.rows).toBeUndefined();
  });

  it('move a block to an index among the other blocks', () => {
    const { layout, sectionId } = arrangementLayout(4);
    expect(order(moveItemToIndex(layout, sectionId, 'i0', 2), sectionId)).toEqual([
      'i1',
      'i2',
      'i0',
      'i3',
    ]);
    expect(order(moveItemToIndex(layout, sectionId, 'i3', 0), sectionId)).toEqual([
      'i3',
      'i0',
      'i1',
      'i2',
    ]);
    expect(order(moveItemToIndex(layout, sectionId, 'i1', 99), sectionId)).toEqual([
      'i0',
      'i2',
      'i3',
      'i1',
    ]);
    expect(moveItemToIndex(layout, sectionId, 'i1', 1)).toBe(layout);
  });

  it('reorder within the section through moveItemToSection and keep every block', () => {
    const { layout, sectionId } = arrangementLayout(3);
    const next = moveItemToSection(layout, sectionId, 'i2', sectionId, { index: 0 });
    expect(order(next, sectionId)).toEqual(['i2', 'i0', 'i1']);
  });

  it('take a block from a free grid at an index', () => {
    const { layout, sectionId } = arrangementLayout(2);
    const free = addSection(layout);
    const withItem = addItem(free.layout, free.sectionId, 'block', { id: 'g' });
    const next = moveItemToSection(withItem, free.sectionId, 'g', sectionId, {
      index: 1,
      x: 5,
      y: 5,
    });
    expect(order(next, sectionId)).toEqual(['i0', 'g', 'i1']);
    expect(next.sections.find((s) => s.id === sectionId)!.rows).toBeUndefined();
  });

  it('are valid only with a known preset and options', () => {
    const { layout } = arrangementLayout(1);
    const broken = (arrangement: unknown) => ({
      ...layout,
      sections: [{ ...layout.sections[0]!, arrangement } as Section],
    });
    expect(validateLayout(broken({ preset: 'nope' })).valid).toBe(false);
    expect(validateLayout(broken({ preset: 'two', align: 'left' })).valid).toBe(false);
    expect(validateLayout(broken({ preset: 'two', equalHeight: 'yes' })).valid).toBe(false);
    expect(validateLayout(broken({ preset: 'two', stackOn: 'desktop' })).valid).toBe(false);
    expect(validateLayout(broken({ preset: 'two', mobileOrder: 'x' })).valid).toBe(false);
    expect(validateLayout(broken('two')).valid).toBe(false);
    expect(
      validateLayout(
        broken({
          preset: 'two',
          align: 'center',
          verticalAlign: 'end',
          equalHeight: true,
          stackOn: 'tablet',
          mobileOrder: 'reversed',
        }),
      ).valid,
    ).toBe(true);
  });

  it('survive import', () => {
    const { layout, sectionId } = arrangementLayout(2);
    const imported = importLayout(layout, registry);
    expect(imported.sections.find((s) => s.id === sectionId)!.arrangement).toEqual({
      preset: 'three',
    });
  });
});

describe('setSectionArrangement', () => {
  it('keeps 14 columns through an arrangement and scales the 12 column track onto them', () => {
    const spans = (preset: 'two' | 'three' | 'four', count: number) => {
      let layout = setLayoutBreakpoints(createEmptyLayout(), ['desktop', 'tablet', 'mobile']);
      const created = addSection(layout, { columns: 14 });
      layout = created.layout;
      for (let i = 0; i < count; i += 1) {
        layout = addItem(layout, created.sectionId, 'block', { id: `i${i}`, x: i * 3, y: 0 });
      }
      const arranged = setSectionArrangement(layout, created.sectionId, { preset });
      expect(arranged.sections[0]!.columns).toBe(14);
      const free = setSectionArrangement(arranged, created.sectionId, null).sections[0]!;
      expect(free.columns).toBe(14);
      expect(free.overrides?.tablet?.columns).toBe(9);
      return free.items.map((i) => [i.x, i.w]);
    };
    expect(spans('two', 2)).toEqual([
      [0, 7],
      [7, 7],
    ]);
    expect(spans('three', 3)).toEqual([
      [0, 5],
      [5, 4],
      [9, 5],
    ]);
    expect(spans('four', 4)).toEqual([
      [0, 4],
      [4, 3],
      [7, 4],
      [11, 3],
    ]);
  });

  it('switches a free grid to an arrangement ordered by reading order and drops grid placement', () => {
    let layout = createEmptyLayout();
    const created = addSection(layout);
    layout = addItem(created.layout, created.sectionId, 'block', { id: 'late', x: 6, y: 4 });
    layout = addItem(layout, created.sectionId, 'block', { id: 'right', x: 6, y: 0 });
    layout = addItem(layout, created.sectionId, 'block', { id: 'left', x: 0, y: 0 });
    const next = setSectionArrangement(layout, created.sectionId, { preset: 'two' });
    expect(order(next, created.sectionId)).toEqual(['left', 'right', 'late']);
    const section = next.sections[0]!;
    expect(section.arrangement).toEqual({ preset: 'two' });
    expect(section.rows).toBeUndefined();
  });

  it('changes the preset without touching the order', () => {
    const { layout, sectionId } = arrangementLayout(3);
    const next = setSectionArrangement(layout, sectionId, { preset: 'two' });
    expect(order(next, sectionId)).toEqual(['i0', 'i1', 'i2']);
    expect(next.sections[0]!.arrangement).toEqual({ preset: 'two' });
  });

  it('writes the arrangement out as grid placement when switching to a free grid', () => {
    const { layout, sectionId } = arrangementLayout(4, 'two');
    const next = setSectionArrangement(layout, sectionId, null);
    const section = next.sections[0]!;
    expect(section.arrangement).toBeUndefined();
    expect(section.items.map((i) => [i.x, i.w])).toEqual([
      [0, 6],
      [6, 6],
      [0, 6],
      [6, 6],
    ]);
    expect(section.items[2]!.y).toBe(section.items[0]!.h);
    expect(section.columns).toBe(12);
    expect(section.overrides?.mobile?.columns).toBe(4);
    expect(section.overrides?.mobile?.items?.i1).toMatchObject({ x: 0, w: 4, y: 2 });
    expect(section.overrides?.tablet?.columns).toBe(8);
    expect(section.overrides?.tablet?.items?.i1).toMatchObject({ x: 4, w: 4, y: 0 });
  });

  it.each(ARRANGEMENT_PRESET_IDS)(
    'switches preset %s back to the free grid of a new section (12 / 8 / 4 columns)',
    (preset) => {
      const { layout, sectionId } = arrangementLayout(5);
      const arranged = setSectionArrangement(layout, sectionId, { preset });
      const section = setSectionArrangement(arranged, sectionId, null).sections[0]!;
      const expected = { desktop: 12, tablet: 8, mobile: 4 } as const;
      expect(section.columns).toBe(expected.desktop);
      expect(section.overrides?.tablet?.columns).toBe(expected.tablet);
      expect(section.overrides?.mobile?.columns).toBe(expected.mobile);
      for (const bp of ['desktop', 'tablet', 'mobile'] as const) {
        const placed = section.items.map((item) =>
          bp === 'desktop' ? item : section.overrides![bp]!.items![item.id]!,
        );
        expect(placed).toHaveLength(5);
        for (const p of placed) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.w).toBeGreaterThanOrEqual(1);
          expect(p.x! + p.w!).toBeLessThanOrEqual(expected[bp]);
        }
      }
      expect(section.overrides?.mobile?.items?.i0).toMatchObject({ x: 0, w: 4 });
    },
  );

  it('keeps the free-grid columns over repeated switching', () => {
    let { layout } = arrangementLayout(3);
    const sectionId = layout.sections[0]!.id;
    for (const preset of ['single', 'two', 'single'] as const) {
      layout = setSectionArrangement(layout, sectionId, null);
      layout = setSectionArrangement(layout, sectionId, { preset });
    }
    const section = setSectionArrangement(layout, sectionId, null).sections[0]!;
    expect(section.columns).toBe(12);
    expect(section.overrides?.tablet?.columns).toBe(8);
    expect(section.overrides?.mobile?.columns).toBe(4);
    expect(section.items.map((i) => [i.x, i.w])).toEqual([
      [0, 12],
      [0, 12],
      [0, 12],
    ]);
  });

  it('scales the arrangement onto a section with other desktop columns', () => {
    const { layout, sectionId } = arrangementLayout(2, 'two');
    const wide: Layout = {
      ...layout,
      sections: layout.sections.map((s) => ({ ...s, columns: 24 })),
    };
    const section = setSectionArrangement(wide, sectionId, null).sections[0]!;
    expect(section.columns).toBe(24);
    expect(section.items.map((i) => [i.x, i.w])).toEqual([
      [0, 12],
      [12, 12],
    ]);
    expect(section.overrides?.tablet?.columns).toBe(16);
  });

  it('is a no-op for a free grid switched to free grid', () => {
    const created = addSection(createEmptyLayout());
    const next = setSectionArrangement(created.layout, created.sectionId, null);
    expect(next.sections[0]).toEqual(created.layout.sections[0]);
  });
});

describe('keyboard in an arrangement', () => {
  it('reorders with arrows over visible blocks and ignores resize and layer keys', () => {
    const { layout, sectionId } = arrangementLayout(3);
    const hidden = setItemHidden(layout, sectionId, 'i1', 'mobile', true);
    const selection = { sectionId, itemId: 'i0' };
    const later = applyBlockAction(hidden, selection, { type: 'move', dx: 1, dy: 0 }, 'desktop')!;
    expect(order(later.layout, sectionId)).toEqual(['i1', 'i0', 'i2']);
    const onMobile = applyBlockAction(hidden, selection, { type: 'move', dx: 0, dy: 1 }, 'mobile')!;
    expect(order(onMobile.layout, sectionId)).toEqual(['i1', 'i2', 'i0']);
    const edge = applyBlockAction(layout, selection, { type: 'move', dx: -1, dy: 0 }, 'desktop')!;
    expect(edge.layout).toBe(layout);
    const resized = applyBlockAction(
      layout,
      selection,
      { type: 'resize', dw: 1, dh: 0 },
      'desktop',
    )!;
    expect(resized.layout).toBe(layout);
    const removed = applyBlockAction(layout, selection, { type: 'delete' }, 'desktop')!;
    expect(order(removed.layout, sectionId)).toEqual(['i1', 'i2']);
  });
});

describe('VantagePreview of an arrangement', () => {
  const html = (layout: Layout, breakpoint?: 'desktop' | 'tablet' | 'mobile') =>
    renderToStaticMarkup(
      createElement(VantagePreview, { value: layout, components: registry, breakpoint }),
    );

  it('lays blocks out by slot with content-sized rows', () => {
    const { layout } = arrangementLayout(4);
    const desktop = html(layout, 'desktop');
    expect(desktop).toContain('grid-column:2 / span 4');
    expect(desktop).toContain('grid-column:6 / span 4');
    expect(desktop).toContain('grid-column:10 / span 4');
    expect(desktop).toContain('grid-row:2');
    expect(desktop).toContain('--rows-tpl:none');
    expect(desktop).toContain('--flow');
  });

  it('stacks on mobile and pairs blocks on tablet', () => {
    const { layout } = arrangementLayout(3);
    const mobile = html(layout, 'mobile');
    expect(mobile).toContain('--cols:1');
    expect(mobile).toContain('grid-row:3');
    const tablet = html(layout, 'tablet');
    expect(tablet).toContain('--cols:2');
    expect(tablet).toContain('grid-column:2 / span 2');
  });

  it('hides a block where it is hidden and closes the gap', () => {
    const { layout, sectionId } = arrangementLayout(3);
    const hidden = setItemHidden(layout, sectionId, 'i0', 'mobile', true);
    const mobile = html(hidden, 'mobile');
    expect(mobile).not.toContain('grid-row:3');
    expect(html(hidden, 'desktop')).toContain('grid-column:2 / span 4');
  });

  it('emits per-breakpoint slots without a forced breakpoint', () => {
    const { layout } = arrangementLayout(3);
    const out = html(layout);
    expect(out).toContain('--vp-desktop-col:2 / span 4');
    expect(out).toContain('--vp-tablet-col:2 / span 1');
    expect(out).toContain('--vp-mobile-row:3');
  });

  it('applies alignment, equal height and the aspect ratio of a kind', () => {
    const aspect: ComponentRegistry = {
      block: {
        component: () => null,
        defaults: { w: 1, h: 1 },
        arrangementAspectRatio: () => 1.5,
      },
    };
    const { layout, sectionId } = arrangementLayout(2);
    const stretched = setSectionArrangement(layout, sectionId, {
      preset: 'three',
      equalHeight: true,
    });
    expect(html(stretched, 'desktop')).toContain('align-items:stretch');
    const centered = setSectionArrangement(layout, sectionId, {
      preset: 'three',
      verticalAlign: 'center',
      align: 'center',
    });
    const out = html(centered, 'desktop');
    expect(out).toContain('align-items:center');
    expect(out).toContain('grid-column:4 / span 4');
    const ratio = renderToStaticMarkup(
      createElement(VantagePreview, { value: layout, components: aspect, breakpoint: 'desktop' }),
    );
    expect(ratio).toContain('aspect-ratio:1.5');
  });
});
