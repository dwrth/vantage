import { describe, expect, it } from 'vitest';
import type { GridItem, Layout, Section } from '../types';
import { hydrate, mergeEntityAndLayoutData, resolveEffectiveItemData, stripData } from './entities';

const item = (over: Partial<GridItem> & { id: string }): GridItem => ({
  x: 0,
  y: 0,
  w: 2,
  h: 2,
  kind: 'text',
  ...over,
});

const section = (items: GridItem[], over: Partial<Section> = {}): Section => ({
  id: 's1',
  columns: 12,
  colGap: 8,
  rowGap: 8,
  items,
  ...over,
});

const layout = (sections: Section[]): Layout => ({
  sections,
  breakpoints: ['desktop', 'tablet', 'mobile'],
  breakpointWidths: {},
  breakpointPreviewWidths: {},
});

describe('mergeEntityAndLayoutData', () => {
  it('returns layout data when there is no entity data', () => {
    expect(mergeEntityAndLayoutData(undefined, { a: 1 })).toEqual({ a: 1 });
    expect(mergeEntityAndLayoutData(undefined, undefined)).toBeUndefined();
  });

  it('returns entity data when there is no layout data', () => {
    expect(mergeEntityAndLayoutData({ a: 1 }, undefined)).toEqual({ a: 1 });
    expect(mergeEntityAndLayoutData('text', undefined)).toBe('text');
  });

  it('shallow merges plain objects with layout winning conflicts', () => {
    expect(mergeEntityAndLayoutData({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('does not mutate its inputs', () => {
    const entity = { a: 1 };
    const layoutData = { b: 2 };
    mergeEntityAndLayoutData(entity, layoutData);
    expect(entity).toEqual({ a: 1 });
    expect(layoutData).toEqual({ b: 2 });
  });

  it.each([
    ['arrays', [1], [2]],
    ['entity array vs object', [1], { a: 1 }],
    ['entity object vs array', { a: 1 }, [2]],
    ['primitives', 'a', 'b'],
    ['null entity', null, { a: 1 }],
    ['null layout', { a: 1 }, null],
  ])('layout wins for non-plain-object pairs (%s)', (_name, entity, layoutData) => {
    expect(mergeEntityAndLayoutData(entity, layoutData)).toBe(layoutData);
  });
});

describe('resolveEffectiveItemData', () => {
  const base = item({ id: 'i1', data: { a: 1, b: 1 } });
  const sec = section([base], {
    overrides: { tablet: { items: { i1: { data: { b: 2 } } } } },
  });

  it('merges entity under breakpoint-merged layout data', () => {
    expect(resolveEffectiveItemData(base, sec, 'tablet', undefined, { a: 0, z: 9 })).toEqual({
      a: 1,
      b: 2,
      z: 9,
    });
  });

  it('ignores overrides on desktop', () => {
    expect(resolveEffectiveItemData(base, sec, 'desktop', undefined, { z: 9 })).toEqual({
      a: 1,
      b: 1,
      z: 9,
    });
  });

  it('ignores overrides of disabled breakpoints', () => {
    expect(resolveEffectiveItemData(base, sec, 'tablet', ['desktop'])).toEqual({ a: 1, b: 1 });
  });

  it('returns entity data alone for items without inline data', () => {
    const bare = item({ id: 'i2', ref: 'e' });
    expect(resolveEffectiveItemData(bare, section([bare]), 'desktop', undefined, { x: 1 })).toEqual(
      { x: 1 },
    );
  });
});

describe('stripData', () => {
  it('drops data only for items bound by ref', () => {
    const l = layout([
      section([
        item({ id: 'a', ref: 'e1', data: { x: 1 } }),
        item({ id: 'b', data: { y: 2 } }),
        item({ id: 'c', ref: '', data: { z: 3 } }),
      ]),
    ]);
    const [a, b, c] = stripData(l).sections[0].items;
    expect('data' in a).toBe(false);
    expect(a.ref).toBe('e1');
    expect(b.data).toEqual({ y: 2 });
    expect(c.data).toEqual({ z: 3 });
  });

  it('drops data from overrides of ref items and keeps the rest of the override', () => {
    const l = layout([
      section([item({ id: 'a', ref: 'e1' }), item({ id: 'b' })], {
        overrides: {
          tablet: {
            columns: 6,
            items: {
              a: { x: 1, data: { t: 1 } },
              b: { x: 2, data: { t: 2 } },
            },
          },
        },
      }),
    ]);
    const tablet = stripData(l).sections[0].overrides?.tablet;
    expect(tablet?.columns).toBe(6);
    expect(tablet?.items?.a).toEqual({ x: 1 });
    expect(tablet?.items?.b).toEqual({ x: 2, data: { t: 2 } });
  });

  it('keeps overrides without item entries and sections without overrides', () => {
    const l = layout([
      section([item({ id: 'a' })]),
      section([item({ id: 'b' })], { id: 's2', overrides: { mobile: { columns: 4 } } }),
    ]);
    const out = stripData(l);
    expect(out.sections[0].overrides).toBeUndefined();
    expect(out.sections[1].overrides?.mobile?.columns).toBe(4);
    expect(out.sections[1].overrides?.mobile?.items).toBeUndefined();
  });

  it('does not mutate the source layout', () => {
    const l = layout([section([item({ id: 'a', ref: 'e1', data: { x: 1 } })])]);
    stripData(l);
    expect(l.sections[0].items[0].data).toEqual({ x: 1 });
  });
});

describe('hydrate', () => {
  it('fills data from the entity map by ref', () => {
    const l = layout([section([item({ id: 'a', ref: 'e1' })])]);
    expect(hydrate(l, { e1: { title: 'T' } }).sections[0].items[0].data).toEqual({ title: 'T' });
  });

  it('replaces existing data on a hit', () => {
    const l = layout([section([item({ id: 'a', ref: 'e1', data: { old: true } })])]);
    expect(hydrate(l, { e1: { fresh: true } }).sections[0].items[0].data).toEqual({ fresh: true });
  });

  it('leaves items without ref or with a missing entity unchanged', () => {
    const noRef = item({ id: 'a', data: { keep: 1 } });
    const miss = item({ id: 'b', ref: 'nope', data: { keep: 2 } });
    const out = hydrate(layout([section([noRef, miss])]), { other: {} });
    expect(out.sections[0].items[0]).toBe(noRef);
    expect(out.sections[0].items[1]).toBe(miss);
  });

  it('round-trips with stripData', () => {
    const l = layout([section([item({ id: 'a', ref: 'e1', data: { v: 1 } })])]);
    expect(hydrate(stripData(l), { e1: { v: 1 } })).toEqual(l);
  });
});
