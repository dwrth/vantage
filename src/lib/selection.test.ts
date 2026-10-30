import { describe, expect, it } from 'vitest';
import { marqueeHits, mergeSelection, rectFromPoints, toggleSelection } from './selection';

const ref = (itemId: string, sectionId = 's') => ({ sectionId, itemId });

describe('toggleSelection', () => {
  it('adds a block and makes it the primary (last) entry', () => {
    expect(toggleSelection([ref('a')], ref('b'))).toEqual([ref('a'), ref('b')]);
    expect(toggleSelection([], ref('a'))).toEqual([ref('a')]);
  });

  it('removes a selected block', () => {
    expect(toggleSelection([ref('a'), ref('b')], ref('a'))).toEqual([ref('b')]);
    expect(toggleSelection([ref('a')], ref('a'))).toEqual([]);
  });

  it('starts a new selection for a block of another section', () => {
    expect(toggleSelection([ref('a'), ref('b')], ref('c', 't'))).toEqual([ref('c', 't')]);
  });
});

describe('marqueeHits', () => {
  const blocks = [
    { id: 'a', left: 0, top: 0, right: 100, bottom: 50 },
    { id: 'b', left: 200, top: 0, right: 300, bottom: 50 },
    { id: 'c', left: 0, top: 100, right: 100, bottom: 150 },
  ];

  it('selects every block the marquee touches', () => {
    expect(marqueeHits(blocks, rectFromPoints(90, 40, 210, 10))).toEqual(['a', 'b']);
    expect(marqueeHits(blocks, rectFromPoints(-10, -10, 400, 400))).toEqual(['a', 'b', 'c']);
  });

  it('does not count edges that only meet, or empty space', () => {
    expect(marqueeHits(blocks, rectFromPoints(100, 0, 200, 50))).toEqual([]);
    expect(marqueeHits(blocks, rectFromPoints(110, 60, 190, 90))).toEqual([]);
  });

  it('normalises the corners in any drag direction', () => {
    expect(rectFromPoints(10, 20, 0, 5)).toEqual({ left: 0, top: 5, right: 10, bottom: 20 });
  });
});

describe('mergeSelection', () => {
  it('appends new blocks without duplicates', () => {
    expect(mergeSelection([ref('a')], [ref('a'), ref('b')])).toEqual([ref('a'), ref('b')]);
  });
});
