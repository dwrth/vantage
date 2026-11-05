// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BuilderContext, type BuilderContextValue } from '../context/BuilderContext';
import { DEFAULT_LABELS } from '../lib/defaultLabels';
import { DEFAULT_BLOCK_ANNOUNCEMENTS, DEFAULT_BLOCK_LABELS } from '../lib/keyboardLabels';
import { GROUP_ALIGNMENTS } from '../mutations/group';
import type { GridItem, Layout } from '../types';
import { GroupToolbar } from './GroupToolbar';

afterEach(cleanup);

const item = (id: string, x: number, y: number): GridItem => ({
  id,
  kind: 'block',
  label: id,
  x,
  y,
  w: 2,
  h: 2,
});

const layout: Layout = {
  breakpoints: ['desktop'],
  breakpointWidths: {},
  breakpointPreviewWidths: {},
  sections: [
    {
      id: 's',
      columns: 12,
      colGap: 0,
      rowGap: 0,
      rows: 8,
      items: [item('a', 1, 0), item('b', 6, 3), item('c', 9, 6)],
    },
  ],
};

function setup(itemIds = ['a', 'b'], overrides: Partial<BuilderContextValue> = {}) {
  const onChange = vi.fn();
  const announce = vi.fn();
  const setSelection = vi.fn();
  const value = {
    layout,
    onChange,
    announce,
    setSelection,
    activeBreakpoint: 'desktop',
    components: {},
    defaultLabels: DEFAULT_LABELS,
    blockLabels: DEFAULT_BLOCK_LABELS,
    announcements: DEFAULT_BLOCK_ANNOUNCEMENTS,
    ...overrides,
  } as unknown as BuilderContextValue;
  const parentPointerDown = vi.fn();
  const view = render(
    <BuilderContext.Provider value={value}>
      <div onPointerDown={parentPointerDown}>
        <GroupToolbar sectionId="s" itemIds={itemIds} bounds={{ x: 1, y: 0, w: 7, h: 5 }} />
      </div>
    </BuilderContext.Provider>,
  );
  return { onChange, announce, setSelection, parentPointerDown, ...view };
}

describe('GroupToolbar', () => {
  it('places the box over the group bounds, offset by the gutter column', () => {
    const { container } = setup();
    const box = container.querySelector<HTMLElement>('[data-vantage-group-box]')!;
    expect(box.style.gridColumn).toBe('3 / span 7');
    expect(box.style.gridRow).toBe('1 / span 5');
  });

  it('names the toolbar by the number of selected blocks that exist in the section', () => {
    setup(['a', 'b', 'missing']);
    expect(screen.getByRole('toolbar').getAttribute('aria-label')).toBe('2 blocks selected');
    expect(screen.getByRole('button', { name: 'Delete 2 blocks' })).toBeTruthy();
  });

  it('counts no blocks for a section that is gone', () => {
    const { onChange } = setup(['a', 'b'], { layout: { ...layout, sections: [] } });
    expect(screen.getByRole('toolbar').getAttribute('aria-label')).toBe('0 blocks selected');
    fireEvent.click(screen.getByRole('button', { name: 'Align left' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses the host labels', () => {
    setup(['a', 'b'], {
      blockLabels: {
        ...DEFAULT_BLOCK_LABELS,
        groupToolbar: (n) => `Auswahl: ${n}`,
        align: (alignment) => `Ausrichten ${alignment}`,
        deleteSelection: (n) => `${n} löschen`,
      },
    });
    expect(screen.getByRole('toolbar').getAttribute('aria-label')).toBe('Auswahl: 2');
    expect(screen.getByRole('button', { name: 'Ausrichten left' }).getAttribute('title')).toBe(
      'Ausrichten left',
    );
    expect(screen.getByRole('button', { name: '2 löschen' })).toBeTruthy();
  });

  it('offers one button per alignment', () => {
    const { container } = setup();
    const offered = Array.from(container.querySelectorAll('[data-vantage-align]')).map((el) =>
      el.getAttribute('data-vantage-align'),
    );
    expect(offered).toEqual(GROUP_ALIGNMENTS);
  });

  it('aligns the group, emits one change and announces it', () => {
    const { onChange, announce } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Align left' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as Layout;
    const [a, b, c] = next.sections[0]!.items;
    expect([a!.x, b!.x, c!.x]).toEqual([1, 1, 9]);
    expect(announce).toHaveBeenCalledWith('2 blocks aligned left');
  });

  it('aligns vertically', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Align top' }));
    const next = onChange.mock.calls[0]![0] as Layout;
    expect(next.sections[0]!.items.map((i) => i.y)).toEqual([0, 0, 6]);
  });

  it('still announces when the alignment changes nothing', () => {
    const { onChange, announce } = setup(['a'], {
      announcements: {
        ...DEFAULT_BLOCK_ANNOUNCEMENTS,
        groupAligned: ({ count, alignment }) => `${count}:${alignment}`,
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Align left' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith('1:left');
  });

  it('deletes the group, clears the selection and announces it', () => {
    const { onChange, setSelection, announce } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Delete 2 blocks' }));
    const next = onChange.mock.calls[0]![0] as Layout;
    expect(next.sections[0]!.items.map((i) => i.id)).toEqual(['c']);
    expect(setSelection).toHaveBeenCalledWith(null);
    expect(announce).toHaveBeenCalledWith('2 blocks deleted');
  });

  it('keeps pointerdown on the toolbar from reaching the canvas', () => {
    const { parentPointerDown } = setup();
    fireEvent.pointerDown(screen.getByRole('toolbar'));
    expect(parentPointerDown).not.toHaveBeenCalled();
  });
});
