// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dropIndexAt, type ArrangementDropState } from './arrangementDropTarget';

const slots = new Map([
  ['a', { col: 0, span: 6, row: 0 }],
  ['b', { col: 6, span: 6, row: 0 }],
]);

const state = (extra: Partial<ArrangementDropState> = {}): ArrangementDropState => ({
  itemIds: ['a', 'b'],
  visibleIds: ['a', 'b'],
  slots,
  reversed: false,
  preview: null,
  ...extra,
});

/** A grid with a cell per id; cell `n` spans x n*100..n*100+100. */
function gridOf(ids: string[]) {
  const grid = document.createElement('div');
  ids.forEach((id, n) => {
    const cell = document.createElement('div');
    cell.setAttribute('data-vantage-arrangement-cell', id);
    vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue({
      left: n * 100,
      right: n * 100 + 100,
      top: 0,
      bottom: 50,
    } as DOMRect);
    grid.append(cell);
  });
  return grid;
}

afterEach(() => vi.restoreAllMocks());

describe('dropIndexAt', () => {
  it('appends without a grid to measure', () => {
    expect(dropIndexAt(null, state(), { x: 0, y: 0 })).toBe(2);
    expect(dropIndexAt(null, state(), { x: 0, y: 0 }, 'a')).toBe(1);
  });

  it('hit-tests the shown blocks without a preview', () => {
    const grid = gridOf(['a', 'b']);
    expect(dropIndexAt(grid, state(), { x: 10, y: 10 })).toBe(0);
    expect(dropIndexAt(grid, state(), { x: 160, y: 10 })).toBe(2);
  });

  it('falls back to the blocks when the preview slot is not rendered', () => {
    const grid = gridOf(['a', 'b']);
    const preview = {
      slots: new Map([...slots, ['n', { col: 0, span: 6, row: 1 }]]),
      droppedId: 'n',
      order: ['a', 'b', 'n'],
    };
    expect(dropIndexAt(grid, state({ preview }), { x: 160, y: 10 })).toBe(2);
  });

  it('lands in front without rendered blocks to hit-test', () => {
    expect(dropIndexAt(gridOf([]), state(), { x: 160, y: 10 })).toBe(0);
  });

  it('falls back to the blocks when the dropped block has no slot', () => {
    const grid = gridOf(['a', 'b']);
    const preview = { slots, droppedId: 'n', order: ['a', 'b'] };
    expect(dropIndexAt(grid, state({ preview }), { x: 10, y: 10 })).toBe(0);
  });
});
