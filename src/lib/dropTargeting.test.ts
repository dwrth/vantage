import { describe, expect, it } from 'vitest';
import {
  AUTO_SCROLL_MAX_SPEED,
  edgeScrollSpeed,
  gridCellAt,
  sectionAtY,
  type GridGeometry,
  type SectionBand,
} from './dropTargeting';

/** Grids of three sections in client coordinates; 60px header bars sit between them. */
const bands = (scroll = 0): SectionBand[] => [
  { sectionId: 'a', top: 0 - scroll, bottom: 200 - scroll },
  { sectionId: 'b', top: 260 - scroll, bottom: 460 - scroll },
  { sectionId: 'c', top: 520 - scroll, bottom: 720 - scroll },
];

describe('sectionAtY', () => {
  it('returns the section whose grid contains the point', () => {
    expect(sectionAtY(100, bands())).toBe('a');
    expect(sectionAtY(300, bands())).toBe('b');
    expect(sectionAtY(719, bands())).toBe('c');
  });

  it('resolves a header bar or gap to the section below it', () => {
    expect(sectionAtY(200, bands())).toBe('b');
    expect(sectionAtY(230, bands())).toBe('b');
    expect(sectionAtY(259, bands())).toBe('b');
    expect(sectionAtY(490, bands())).toBe('c');
  });

  it('never leaves a point without a section', () => {
    for (let y = -100; y < 900; y += 1) expect(sectionAtY(y, bands())).not.toBeNull();
    expect(sectionAtY(-100, bands())).toBe('a');
    expect(sectionAtY(900, bands())).toBe('c');
  });

  it('follows the scroll: the same client point hits the content now under it', () => {
    expect(sectionAtY(300, bands(0))).toBe('b');
    // Scrolled 200px: client 300 is page y 500, the bar above c.
    expect(sectionAtY(300, bands(200))).toBe('c');
  });

  it('orders by position, not by registration order', () => {
    expect(sectionAtY(300, [...bands()].reverse())).toBe('b');
  });

  it('returns null without sections', () => {
    expect(sectionAtY(10, [])).toBeNull();
  });
});

/** 12 columns of 100px (no gap), rows of 50px, 4 rows, grid at client (40, 300). */
const geometry = (over: Partial<GridGeometry> = {}): GridGeometry => ({
  rect: { left: 40, top: 300 },
  contentOffsetX: 0,
  contentOffsetY: 0,
  columns: 12,
  rows: 4,
  cellXStep: 100,
  cellHeight: 50,
  rowSteps: null,
  ...over,
});

describe('gridCellAt', () => {
  it('maps a client point to the nearest cell', () => {
    expect(gridCellAt(geometry(), 40 + 210, 300 + 60, 2, 1)).toEqual({ x: 2, y: 1, w: 2, h: 1 });
  });

  it('uses the grid rect at hit-test time, so a scrolled grid shifts the cell', () => {
    // The pointer stays at client y 360; the page scrolls 100px, so the grid top moves to 200.
    expect(gridCellAt(geometry(), 40, 360, 1, 1).y).toBe(1);
    expect(gridCellAt(geometry({ rect: { left: 40, top: 200 } }), 40, 360, 1, 1).y).toBe(3);
  });

  it('clamps a point above the grid (header bar) to row 0 and below it to the last row', () => {
    expect(gridCellAt(geometry(), 40, 300 - 30, 1, 1).y).toBe(0);
    expect(gridCellAt(geometry(), 40, 300 - 500, 1, 1).y).toBe(0);
    expect(gridCellAt(geometry(), 40, 300 + 900, 1, 2).y).toBe(2);
  });

  it('keeps the block inside the columns and shrinks oversized blocks', () => {
    expect(gridCellAt(geometry(), 40 + 1150, 300, 3, 1).x).toBe(9);
    expect(gridCellAt(geometry(), 0, 300, 3, 1).x).toBe(0);
    expect(gridCellAt(geometry(), 40, 300, 20, 9)).toEqual({ x: 0, y: 0, w: 12, h: 4 });
  });

  it('skips the centered content offset and the padding / fill-screen alignment offset', () => {
    // Content starts 80px right of the grid edge; padding 24 + center alignment 176 = 200px down.
    const g = geometry({ contentOffsetX: 80, contentOffsetY: 200 });
    expect(gridCellAt(g, 40 + 80, 300 + 200, 1, 1)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(gridCellAt(g, 40 + 80 + 300, 300 + 200 + 100, 1, 1)).toEqual({
      x: 3,
      y: 2,
      w: 1,
      h: 1,
    });
    // In the free space above the first row of a center/end aligned section: row 0.
    expect(gridCellAt(g, 40 + 80, 300 + 50, 1, 1).y).toBe(0);
  });

  it('uses measured row steps when available', () => {
    const g = geometry({ rowSteps: [100, 20, 20, 100] });
    expect(gridCellAt(g, 40, 300 + 105, 1, 1).y).toBe(1);
    expect(gridCellAt(g, 40, 300 + 125, 1, 1).y).toBe(2);
  });
});

describe('edgeScrollSpeed', () => {
  it('is zero away from the edges', () => {
    expect(edgeScrollSpeed(500, 0, 1000)).toBe(0);
    expect(edgeScrollSpeed(150, 0, 1000)).toBe(0);
  });

  it('scrolls up near the top and down near the bottom, faster towards the edge', () => {
    expect(edgeScrollSpeed(140, 0, 1000)).toBeLessThan(0);
    expect(edgeScrollSpeed(10, 0, 1000)).toBeLessThan(edgeScrollSpeed(100, 0, 1000));
    expect(edgeScrollSpeed(860, 0, 1000)).toBeGreaterThan(0);
    expect(edgeScrollSpeed(990, 0, 1000)).toBeGreaterThan(edgeScrollSpeed(900, 0, 1000));
  });

  it('caps the speed past the edge (e.g. over a sticky header)', () => {
    expect(edgeScrollSpeed(-200, 0, 1000)).toBe(-AUTO_SCROLL_MAX_SPEED);
    expect(edgeScrollSpeed(1300, 0, 1000)).toBe(AUTO_SCROLL_MAX_SPEED);
  });

  it('measures the bands from the visible scroll area', () => {
    expect(edgeScrollSpeed(210, 200, 600)).toBeLessThan(0);
    expect(edgeScrollSpeed(400, 200, 600)).toBe(0);
  });
});
