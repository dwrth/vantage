// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BuilderContext, type BuilderContextValue } from '../context/BuilderContext';
import type { ComponentRegistry, Layout } from '../types';
import { VantageBuilder } from './Builder';
import { SectionResizeHandle } from './SectionResizeHandle';

const components: ComponentRegistry = {
  block: { component: () => null, defaults: { w: 1, h: 1 } },
};

const layout: Layout = {
  breakpoints: ['desktop'],
  breakpointWidths: {},
  breakpointPreviewWidths: {},
  sections: [
    { id: 'a', label: 'Hero', columns: 12, colGap: 8, rowGap: 8, rows: 4, items: [] },
    { id: 'b', columns: 12, colGap: 8, rowGap: 8, rows: 4, items: [] },
  ],
};

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const labels = () => screen.getAllByRole('separator').map((el) => el.getAttribute('aria-label'));

describe('section resize edge label', () => {
  it('defaults to an English label naming the section', () => {
    render(<VantageBuilder value={layout} onChange={() => {}} components={components} />);
    expect(labels()).toEqual(['Resize Hero height', 'Resize section height']);
  });

  it('uses sectionResizeLabel when given', () => {
    render(
      <VantageBuilder
        value={layout}
        onChange={() => {}}
        components={components}
        sectionResizeLabel={(section) => `Höhe von ${section.label ?? 'Abschnitt'} ändern`}
      />,
    );
    expect(labels()).toEqual(['Höhe von Hero ändern', 'Höhe von Abschnitt ändern']);
  });
});

describe('SectionResizeHandle', () => {
  type Props = Partial<ComponentProps<typeof SectionResizeHandle>>;

  function mount(props: Props = {}) {
    const onDraft = vi.fn();
    const onCommit = vi.fn();
    const setInteracting = vi.fn();
    const parentPointerDown = vi.fn();
    const value = { setInteracting } as unknown as BuilderContextValue;
    render(
      <BuilderContext.Provider value={value}>
        <div onPointerDown={parentPointerDown}>
          <SectionResizeHandle
            rows={4}
            minRows={2}
            rowSteps={null}
            cellHeight={50}
            onDraft={onDraft}
            onCommit={onCommit}
            {...props}
          />
        </div>
      </BuilderContext.Provider>,
    );
    return {
      handle: screen.getByRole('separator'),
      onDraft,
      onCommit,
      setInteracting,
      parentPointerDown,
    };
  }

  const down = (el: Element, init: PointerEventInit = {}) =>
    fireEvent.pointerDown(el, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientY: 100,
      ...init,
    });
  const move = (clientY: number) => fireEvent.pointerMove(window, { pointerId: 1, clientY });
  const release = () => fireEvent.pointerUp(window, { pointerId: 1 });

  it('exposes its state as a separator', () => {
    const { handle } = mount({ label: 'Höhe ändern' });
    expect(handle.getAttribute('aria-label')).toBe('Höhe ändern');
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    expect(handle.getAttribute('aria-valuenow')).toBe('4');
    expect(handle.getAttribute('aria-valuemin')).toBe('2');
    expect(handle.tabIndex).toBe(0);
  });

  it('drafts the snapped row count while dragging and commits on release', () => {
    const { handle, onDraft, onCommit, setInteracting } = mount();
    down(handle);
    expect(setInteracting).toHaveBeenLastCalledWith(true);
    move(200);
    expect(onDraft).toHaveBeenLastCalledWith(6);
    move(150);
    expect(onDraft).toHaveBeenLastCalledWith(5);
    expect(onCommit).not.toHaveBeenCalled();
    release();
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(5);
    expect(onDraft).toHaveBeenLastCalledWith(null);
    expect(setInteracting).toHaveBeenLastCalledWith(false);
  });

  it('never drafts below minRows', () => {
    const { handle, onDraft, onCommit } = mount();
    down(handle);
    move(-500);
    expect(onDraft).toHaveBeenLastCalledWith(2);
    release();
    expect(onCommit).toHaveBeenCalledWith(2);
  });

  it('snaps to measured row heights', () => {
    const { handle, onDraft } = mount({ rowSteps: [40, 60, 40, 60] });
    down(handle);
    move(100 - 80);
    expect(onDraft).toHaveBeenLastCalledWith(2);
    move(100 + 30);
    expect(onDraft).toHaveBeenLastCalledWith(5);
  });

  it('does not commit when the drag ends on the starting height', () => {
    const { handle, onDraft, onCommit, setInteracting } = mount();
    down(handle);
    move(200);
    move(105);
    release();
    expect(onCommit).not.toHaveBeenCalled();
    expect(onDraft).toHaveBeenLastCalledWith(null);
    expect(setInteracting).toHaveBeenLastCalledWith(false);
  });

  it('discards the draft on Escape', () => {
    const { handle, onDraft, onCommit, setInteracting } = mount();
    down(handle);
    move(200);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCommit).not.toHaveBeenCalled();
    expect(onDraft).toHaveBeenLastCalledWith(null);
    expect(setInteracting).toHaveBeenLastCalledWith(false);
  });

  it('discards the draft on pointercancel', () => {
    const { handle, onDraft, onCommit } = mount();
    down(handle);
    move(200);
    fireEvent.pointerCancel(window, { pointerId: 1 });
    expect(onCommit).not.toHaveBeenCalled();
    expect(onDraft).toHaveBeenLastCalledWith(null);
  });

  it('stops following the pointer after the drag ended', () => {
    const { handle, onDraft } = mount();
    down(handle);
    release();
    onDraft.mockClear();
    move(300);
    expect(onDraft).not.toHaveBeenCalled();
  });

  it('ignores non-primary pointers and other mouse buttons', () => {
    const { handle, onDraft, setInteracting, parentPointerDown } = mount();
    down(handle, { isPrimary: false });
    down(handle, { button: 2 });
    move(300);
    expect(setInteracting).not.toHaveBeenCalled();
    expect(onDraft).not.toHaveBeenCalled();
    expect(parentPointerDown).toHaveBeenCalledTimes(2);
  });

  it('keeps the pointerdown from reaching the canvas', () => {
    const { handle, parentPointerDown } = mount();
    down(handle);
    expect(parentPointerDown).not.toHaveBeenCalled();
  });

  it('grows and shrinks by one row with the arrow keys', () => {
    const { handle, onCommit } = mount();
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(onCommit).toHaveBeenLastCalledWith(5);
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(onCommit).toHaveBeenLastCalledWith(3);
    expect(onCommit).toHaveBeenCalledTimes(2);
  });

  it('does not shrink below minRows with the keyboard', () => {
    const { handle, onCommit } = mount({ rows: 2, minRows: 2 });
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('leaves other keys alone and prevents scrolling for handled ones', () => {
    const { handle, onCommit } = mount();
    expect(fireEvent.keyDown(handle, { key: 'ArrowLeft' })).toBe(true);
    expect(onCommit).not.toHaveBeenCalled();
    expect(fireEvent.keyDown(handle, { key: 'ArrowDown' })).toBe(false);
  });
});
