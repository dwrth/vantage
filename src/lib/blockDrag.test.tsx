// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BlockDragContext,
  useBlockDrag,
  useBlockDragController,
  type BlockDragData,
  type BlockDragHandlers,
} from './blockDrag';
import { VANTAGE_DRAG_HANDLE_ATTR } from './interactive';

const data: BlockDragData = {
  type: 'block',
  item: { id: 'a', kind: 'block', x: 0, y: 0, w: 2, h: 1 },
  sectionId: 's',
  placement: { x: 0, y: 0, w: 2, h: 1 },
};

function Block({ id = 'a', children }: { id?: string; children?: React.ReactNode }) {
  const { listeners, attributes, setNodeRef, transform, isDragging } = useBlockDrag(id, data);
  return (
    <div
      ref={setNodeRef}
      data-testid={`block-${id}`}
      data-dragging={isDragging}
      data-transform={transform ? `${transform.x},${transform.y}` : ''}
    >
      <span data-testid={`handle-${id}`} {...listeners} {...attributes}>
        {children}
      </span>
    </div>
  );
}

function Controller({
  handlers,
  children,
}: {
  handlers: BlockDragHandlers;
  children: React.ReactNode;
}) {
  const value = useBlockDragController(handlers);
  return <BlockDragContext.Provider value={value}>{children}</BlockDragContext.Provider>;
}

let scrollY = 0;
let handlers: { [K in keyof BlockDragHandlers]: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  scrollY = 0;
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({ left: 100, top: 50 - scrollY, width: 80, height: 40 }) as DOMRect,
  );
  handlers = {
    onDragStart: vi.fn(),
    onDragMove: vi.fn(),
    onDragEnd: vi.fn(),
    onDragCancel: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const pointer = (x: number, y: number, extra: object = {}) => ({
  clientX: x,
  clientY: y,
  isPrimary: true,
  button: 0,
  pointerId: 1,
  ...extra,
});

function setup(children?: React.ReactNode) {
  render(
    <Controller handlers={handlers}>
      <Block>{children}</Block>
      <Block id="b" />
    </Controller>,
  );
  return {
    handle: screen.getByTestId('handle-a'),
    block: screen.getByTestId('block-a'),
    other: screen.getByTestId('block-b'),
  };
}

describe('useBlockDrag', () => {
  it('starts only after the pointer travelled the activation distance', () => {
    const { handle, block } = setup();
    fireEvent.pointerDown(handle, pointer(10, 10));
    fireEvent.pointerMove(document, pointer(12, 12));
    expect(handlers.onDragStart).not.toHaveBeenCalled();
    expect(block.getAttribute('data-dragging')).toBe('false');
    fireEvent.pointerMove(document, pointer(10, 14));
    expect(handlers.onDragStart).toHaveBeenCalledTimes(1);
    const started = handlers.onDragStart.mock.calls[0]![0];
    expect(started).toMatchObject({ data, origin: { x: 10, y: 10 } });
    expect(started.target).toBe(handle);
    expect(block.getAttribute('data-dragging')).toBe('true');
    expect(block.getAttribute('data-transform')).toBe('0,4');
    expect(handle.getAttribute('aria-pressed')).toBe('true');
  });

  it('treats a release before activation as a click', () => {
    const { handle } = setup();
    const onClick = vi.fn();
    handle.addEventListener('click', onClick);
    fireEvent.pointerDown(handle, pointer(10, 10));
    fireEvent.pointerUp(document, pointer(11, 11));
    fireEvent.click(handle);
    expect(handlers.onDragStart).not.toHaveBeenCalled();
    expect(handlers.onDragEnd).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('re-renders only the dragged block with a transform', () => {
    const { handle, other } = setup();
    fireEvent.pointerDown(handle, pointer(10, 10));
    fireEvent.pointerMove(document, pointer(40, 30));
    expect(other.getAttribute('data-dragging')).toBe('false');
    expect(other.getAttribute('data-transform')).toBe('');
  });

  it('adds the scroll since the start to the delta but not to the rect', () => {
    const { handle, block } = setup();
    fireEvent.pointerDown(handle, pointer(10, 10));
    fireEvent.pointerMove(document, pointer(40, 30));
    scrollY = 100;
    act(() => {
      document.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    expect(block.getAttribute('data-transform')).toBe('30,120');
    expect(handlers.onDragMove.mock.calls.at(-1)![0]).toMatchObject({
      delta: { x: 30, y: 120 },
      rect: { left: 130, top: 70, width: 80, height: 40 },
    });
    fireEvent.pointerUp(document, pointer(40, 30));
    expect(handlers.onDragEnd).toHaveBeenCalledWith(
      expect.objectContaining({ delta: { x: 30, y: 120 } }),
    );
    expect(block.getAttribute('data-dragging')).toBe('false');
  });

  it('cancels on Escape without ending the drag', () => {
    const { handle, block } = setup();
    fireEvent.pointerDown(handle, pointer(10, 10));
    fireEvent.pointerMove(document, pointer(40, 30));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handlers.onDragCancel).toHaveBeenCalledTimes(1);
    expect(handlers.onDragEnd).not.toHaveBeenCalled();
    expect(block.getAttribute('data-dragging')).toBe('false');
    fireEvent.pointerUp(document, pointer(40, 30));
    expect(handlers.onDragEnd).not.toHaveBeenCalled();
  });

  it('swallows the click that follows a drag', () => {
    const { handle } = setup();
    const onClick = vi.fn();
    handle.addEventListener('click', onClick);
    fireEvent.pointerDown(handle, pointer(10, 10));
    fireEvent.pointerMove(document, pointer(40, 30));
    fireEvent.pointerUp(document, pointer(40, 30));
    fireEvent.click(handle);
    expect(onClick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60);
    fireEvent.click(handle);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('keeps swallowing the click of a drag that starts right after another one', () => {
    const { handle } = setup();
    const onClick = vi.fn();
    handle.addEventListener('click', onClick);
    fireEvent.pointerDown(handle, pointer(10, 10));
    fireEvent.pointerMove(document, pointer(40, 30));
    fireEvent.pointerUp(document, pointer(40, 30));
    vi.advanceTimersByTime(20);
    fireEvent.pointerDown(handle, pointer(10, 10));
    fireEvent.pointerMove(document, pointer(40, 30));
    vi.advanceTimersByTime(40);
    fireEvent.pointerUp(document, pointer(40, 30));
    fireEvent.click(handle);
    expect(onClick).not.toHaveBeenCalled();
  });

  it.each([
    ['right after a drag ended', false],
    ['during a drag', true],
  ])('leaves no timer or click listener behind when unmounted %s', (_name, midDrag) => {
    const { handle } = setup();
    fireEvent.pointerDown(handle, pointer(10, 10));
    fireEvent.pointerMove(document, pointer(40, 30));
    if (!midDrag) fireEvent.pointerUp(document, pointer(40, 30));
    cleanup();
    expect(vi.getTimerCount()).toBe(0);
    const onClick = vi.fn();
    document.body.addEventListener('click', onClick);
    fireEvent.click(document.body);
    document.body.removeEventListener('click', onClick);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a non-primary pointer', { isPrimary: false }],
    ['the right button', { button: 2 }],
    ['the middle button', { button: 1 }],
  ])('ignores %s', (_name, flags) => {
    const { handle } = setup();
    fireEvent.pointerDown(handle, pointer(10, 10, flags));
    fireEvent.pointerMove(document, pointer(40, 30));
    expect(handlers.onDragStart).not.toHaveBeenCalled();
  });

  it('ignores a press on an interactive control inside the handle', () => {
    setup(<input data-testid="field" />);
    fireEvent.pointerDown(screen.getByTestId('field'), pointer(10, 10));
    fireEvent.pointerMove(document, pointer(40, 30));
    expect(handlers.onDragStart).not.toHaveBeenCalled();
  });

  it('starts from an interactive control inside a drag-handle marker', () => {
    setup(
      <span {...{ [VANTAGE_DRAG_HANDLE_ATTR]: '' }}>
        <button type="button" data-testid="grip" />
      </span>,
    );
    fireEvent.pointerDown(screen.getByTestId('grip'), pointer(10, 10));
    fireEvent.pointerMove(document, pointer(40, 30));
    expect(handlers.onDragStart).toHaveBeenCalledTimes(1);
  });

  it('cancels a running drag when the controller unmounts', () => {
    const { handle } = setup();
    fireEvent.pointerDown(handle, pointer(10, 10));
    fireEvent.pointerMove(document, pointer(40, 30));
    cleanup();
    expect(handlers.onDragCancel).toHaveBeenCalledTimes(1);
  });

  it('is inert without a controller', () => {
    render(<Block />);
    fireEvent.pointerDown(screen.getByTestId('handle-a'), pointer(10, 10));
    fireEvent.pointerMove(document, pointer(40, 30));
    expect(screen.getByTestId('block-a').getAttribute('data-dragging')).toBe('false');
  });
});
