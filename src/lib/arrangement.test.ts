import { describe, expect, it } from 'vitest';
import type { SectionArrangement } from '../types';
import {
  ARRANGEMENT_PRESETS,
  ARRANGEMENT_PRESET_IDS,
  arrangeSlots,
  arrangementSlots,
  arrangementTrack,
  insertionIndexAt,
  insertionLine,
  isArrangementPreset,
} from './arrangement';

const ids = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `i${i}` }));
const arrangement = (patch: Partial<SectionArrangement> = {}): SectionArrangement => ({
  preset: 'three',
  ...patch,
});

describe('presets', () => {
  it('fill the 12 desktop columns in every row', () => {
    for (const id of ARRANGEMENT_PRESET_IDS) {
      const { desktop } = ARRANGEMENT_PRESETS[id];
      const total = desktop.spans.reduce((sum, span) => sum + span, 0);
      expect(total === 12 || id === 'narrow').toBe(true);
      expect(desktop.columns).toBe(12);
    }
  });

  it('knows its ids', () => {
    expect(isArrangementPreset('two')).toBe(true);
    expect(isArrangementPreset('toString')).toBe(false);
    expect(isArrangementPreset(undefined)).toBe(false);
  });
});

describe('arrangementTrack', () => {
  it('uses the preset on desktop and its tablet track on tablet', () => {
    expect(arrangementTrack(arrangement(), 'desktop').spans).toEqual([4, 4, 4]);
    expect(arrangementTrack(arrangement(), 'tablet')).toEqual({
      columns: 2,
      spans: [1, 1],
      fillOrphan: true,
    });
  });

  it('is one column on mobile, and on tablet when stacked there', () => {
    expect(arrangementTrack(arrangement(), 'mobile').columns).toBe(1);
    expect(arrangementTrack(arrangement({ stackOn: 'tablet' }), 'tablet').columns).toBe(1);
  });
});

describe('arrangeSlots', () => {
  const three = ARRANGEMENT_PRESETS.three.desktop;

  it('fills rows in order', () => {
    expect(arrangeSlots(4, three)).toEqual([
      { col: 0, span: 4, row: 0 },
      { col: 4, span: 4, row: 0 },
      { col: 8, span: 4, row: 0 },
      { col: 0, span: 4, row: 1 },
    ]);
  });

  it('aligns a row that is not full', () => {
    expect(arrangeSlots(1, three, 'center')[0]).toMatchObject({ col: 4 });
    expect(arrangeSlots(2, three, 'end').map((s) => s.col)).toEqual([4, 8]);
  });

  it('lets a lone last block fill the row when the track says so', () => {
    const slots = arrangeSlots(3, ARRANGEMENT_PRESETS.three.tablet);
    expect(slots.at(-1)).toEqual({ col: 0, span: 2, row: 1 });
    expect(arrangeSlots(1, ARRANGEMENT_PRESETS.three.tablet)).toEqual([
      { col: 0, span: 2, row: 0 },
    ]);
  });

  it('returns nothing without blocks', () => {
    expect(arrangeSlots(0, three)).toEqual([]);
  });
});

describe('arrangementSlots', () => {
  it('stacks every block in its own row on mobile, in order', () => {
    const slots = arrangementSlots(ids(3), arrangement(), 'mobile');
    expect([...slots.values()].map((s) => s.row)).toEqual([0, 1, 2]);
    expect(slots.get('i0')).toMatchObject({ col: 0, span: 1 });
  });

  it('reverses the stacked order only when asked to', () => {
    const reversed = arrangement({ mobileOrder: 'reversed' });
    expect(arrangementSlots(ids(3), reversed, 'mobile').get('i2')?.row).toBe(0);
    expect(arrangementSlots(ids(3), reversed, 'desktop').get('i0')?.row).toBe(0);
    expect(arrangementSlots(ids(3), reversed, 'tablet').get('i0')?.row).toBe(0);
  });

  it('reverses on tablet when the section stacks there', () => {
    const slots = arrangementSlots(
      ids(2),
      arrangement({ stackOn: 'tablet', mobileOrder: 'reversed' }),
      'tablet',
    );
    expect(slots.get('i1')?.row).toBe(0);
  });
});

describe('insertionIndexAt', () => {
  const row = [
    { left: 0, top: 0, right: 100, bottom: 50 },
    { left: 110, top: 0, right: 210, bottom: 50 },
    { left: 220, top: 0, right: 320, bottom: 50 },
  ];
  const column = [
    { left: 0, top: 0, right: 300, bottom: 50 },
    { left: 0, top: 60, right: 300, bottom: 110 },
    { left: 0, top: 120, right: 300, bottom: 170 },
  ];

  it('lands before a block when the point is in its first half and behind it in the second', () => {
    expect(insertionIndexAt(row, { x: 130, y: 20 })).toBe(1);
    expect(insertionIndexAt(row, { x: 190, y: 20 })).toBe(2);
  });

  it('decides vertically for stacked blocks', () => {
    expect(insertionIndexAt(column, { x: 50, y: 70 })).toBe(1);
    expect(insertionIndexAt(column, { x: 50, y: 100 })).toBe(2);
    expect(insertionIndexAt(column, { x: 50, y: 400 })).toBe(3);
    expect(insertionIndexAt(column, { x: 50, y: -40 })).toBe(0);
  });

  it('lands in an empty section at the start', () => {
    expect(insertionIndexAt([], { x: 10, y: 10 })).toBe(0);
  });
});

describe('insertionLine', () => {
  const row = [
    { left: 0, top: 0, right: 100, bottom: 50 },
    { left: 110, top: 0, right: 210, bottom: 50 },
  ];
  const column = [
    { left: 0, top: 0, right: 300, bottom: 50 },
    { left: 0, top: 60, right: 300, bottom: 110 },
  ];

  it('is vertical between blocks of a row', () => {
    expect(insertionLine(row, 1, 10)).toMatchObject({ width: 3, height: 50 });
  });

  it('is horizontal between rows and before the first block', () => {
    expect(insertionLine(column, 1, 10)).toMatchObject({ height: 3, width: 300 });
    expect(insertionLine(column, 0, 10)).toMatchObject({ height: 3 });
  });

  it('closes the row or column at the end', () => {
    expect(insertionLine(row, 2, 10)?.left).toBeGreaterThan(210);
    expect(insertionLine(column, 2, 10)?.top).toBeGreaterThan(110);
  });

  it('has no line without blocks', () => {
    expect(insertionLine([], 0, 10)).toBeNull();
  });
});
