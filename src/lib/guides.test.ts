import { describe, expect, it } from 'vitest';
import { computeAlignment, guideBox, type GuideRect } from './guides';

const section = { columns: 12, rows: 10 };

function rect(id: string, x: number, y: number, w: number, h: number, fullBleed?: boolean) {
  return { id, x, y, w, h, ...(fullBleed ? { fullBleed } : {}) } as GuideRect;
}

function lines(result: ReturnType<typeof computeAlignment>) {
  return result.guides.map((g) => `${g.orientation} ${g.edge} ${g.position}`);
}

describe('computeAlignment guides', () => {
  it('finds nothing for a lone block off the section centre', () => {
    const result = computeAlignment(rect('m', 0, 1, 3, 3), [], section);
    expect(result).toEqual({ guides: [], sizeMatches: [] });
  });

  it('matches left edges and spans both blocks', () => {
    const result = computeAlignment(rect('m', 2, 6, 3, 2), [rect('a', 2, 0, 5, 2)], section);
    expect(result.guides).toContainEqual({
      orientation: 'vertical',
      edge: 'start',
      position: 2,
      from: 0,
      to: 8,
      itemIds: ['a'],
      sectionCenter: false,
    });
    expect(lines(result)).toEqual(['vertical start 2']);
  });

  it('matches right edges, top edges and bottom edges', () => {
    const result = computeAlignment(rect('m', 5, 3, 3, 2), [rect('a', 0, 3, 8, 2)], section);
    expect(lines(result)).toEqual([
      'vertical end 8',
      'horizontal start 3',
      'horizontal center 4',
      'horizontal end 5',
    ]);
    const top = result.guides.find((g) => g.orientation === 'horizontal' && g.edge === 'start');
    expect(top).toMatchObject({ from: 0, to: 8, itemIds: ['a'] });
  });

  it('matches centres, including half-cell centres', () => {
    const result = computeAlignment(rect('m', 1, 5, 3, 1), [rect('a', 0, 0, 5, 1)], section);
    expect(result.guides).toContainEqual(
      expect.objectContaining({ orientation: 'vertical', edge: 'center', position: 2.5 }),
    );
  });

  it('does not treat touching edges as alignment', () => {
    // m starts where a ends: neighbours, not aligned.
    const result = computeAlignment(rect('m', 6, 4, 2, 3), [rect('a', 0, 0, 6, 4)], section);
    expect(result.guides).toEqual([]);
  });

  it('lists every block on the same line', () => {
    const result = computeAlignment(
      rect('m', 0, 8, 2, 1),
      [rect('a', 0, 0, 4, 1), rect('b', 0, 3, 6, 2), rect('c', 1, 5, 2, 1)],
      section,
    );
    const left = result.guides.find((g) => g.edge === 'start' && g.orientation === 'vertical');
    expect(left).toMatchObject({ position: 0, from: 0, to: 9, itemIds: ['a', 'b'] });
  });

  it('skips the moving block itself', () => {
    const moving = rect('m', 0, 0, 2, 2);
    expect(computeAlignment(moving, [moving], section).guides).toEqual([]);
  });

  it('shows the section centre across the whole section', () => {
    const result = computeAlignment(rect('m', 4, 2, 4, 1), [], section);
    expect(result.guides).toEqual([
      {
        orientation: 'vertical',
        edge: 'center',
        position: 6,
        from: 0,
        to: 10,
        itemIds: [],
        sectionCenter: true,
      },
    ]);
  });

  it('shows the horizontal section centre', () => {
    const result = computeAlignment(rect('m', 0, 4, 2, 2), [], section);
    expect(result.guides).toEqual([
      expect.objectContaining({
        orientation: 'horizontal',
        edge: 'center',
        position: 5,
        from: 0,
        to: 12,
        sectionCenter: true,
      }),
    ]);
  });

  it('marks a block centre line that is also the section centre', () => {
    const result = computeAlignment(rect('m', 5, 0, 2, 1), [rect('a', 3, 4, 6, 1)], section);
    expect(result.guides).toContainEqual(
      expect.objectContaining({ edge: 'center', position: 6, itemIds: ['a'], sectionCenter: true }),
    );
  });
});

describe('computeAlignment with full-bleed blocks', () => {
  it('ignores the sides of a full-bleed block', () => {
    const result = computeAlignment(rect('m', 0, 4, 3, 2), [rect('a', 0, 0, 3, 2, true)], section);
    expect(result.guides.filter((g) => g.orientation === 'vertical')).toEqual([]);
    expect(result.sizeMatches).toEqual([{ dimension: 'h', itemIds: ['a'] }]);
  });

  it('still aligns tops and bottoms with a full-bleed block', () => {
    const result = computeAlignment(rect('m', 2, 0, 3, 2), [rect('a', 0, 0, 3, 2, true)], section);
    expect(lines(result)).toContain('horizontal start 0');
  });

  it('a moving full-bleed block gets horizontal guides only', () => {
    const result = computeAlignment(rect('m', 0, 2, 2, 3, true), [rect('a', 0, 2, 2, 3)], section);
    expect(result.guides.every((g) => g.orientation === 'horizontal')).toBe(true);
    expect(result.sizeMatches).toEqual([{ dimension: 'h', itemIds: ['a'] }]);
  });
});

describe('computeAlignment size matches', () => {
  it('reports equal widths and heights separately', () => {
    const result = computeAlignment(
      rect('m', 0, 6, 4, 2),
      [rect('a', 6, 0, 4, 3), rect('b', 8, 3, 1, 2), rect('c', 0, 0, 2, 1)],
      section,
    );
    expect(result.sizeMatches).toEqual([
      { dimension: 'w', itemIds: ['a'] },
      { dimension: 'h', itemIds: ['b'] },
    ]);
  });

  it('reports nothing when no size matches', () => {
    const result = computeAlignment(rect('m', 0, 6, 4, 2), [rect('a', 5, 0, 3, 3)], section);
    expect(result.sizeMatches).toEqual([]);
  });
});

describe('guideBox', () => {
  const geometry = {
    contentOffsetX: 100,
    contentOffsetY: 20,
    cellXStep: 50,
    colGap: 10,
    rowSteps: [30, 30, 60],
    cellHeight: 30,
    rowGap: 10,
  };
  const guide = (patch: object) =>
    ({
      orientation: 'vertical',
      edge: 'start',
      position: 2,
      from: 0,
      to: 2,
      itemIds: [],
      sectionCenter: false,
      ...patch,
    }) as Parameters<typeof guideBox>[0];

  it('puts a left-edge line on the cell start and spans the rows', () => {
    expect(guideBox(guide({}), geometry)).toEqual({ left: 200, top: 20, width: 0, height: 50 });
  });

  it('puts right-edge and centre lines before the gap', () => {
    expect(guideBox(guide({ edge: 'end' }), geometry).left).toBe(190);
    expect(guideBox(guide({ edge: 'center' }), geometry).left).toBe(195);
  });

  it('uses measured row heights for horizontal lines, including half rows', () => {
    const h = guide({ orientation: 'horizontal', from: 1, to: 3 });
    expect(guideBox(h, geometry)).toEqual({ left: 150, top: 80, width: 90, height: 0 });
    expect(guideBox({ ...h, edge: 'end', position: 3 }, geometry).top).toBe(130);
    // Row 2 is 60px tall: its middle (2.5) is 30px into it.
    expect(guideBox({ ...h, edge: 'start', position: 2.5 }, geometry).top).toBe(110);
  });

  it('falls back to the row step before the first measurement', () => {
    const h = guide({ orientation: 'horizontal', position: 4 });
    expect(guideBox(h, { ...geometry, rowSteps: null }).top).toBe(140);
  });
});
