// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useContainerWidth } from './useContainerWidth';

type Callback = (entries: Array<{ contentRect: { width: number } }>) => void;

const observers: FakeResizeObserver[] = [];

class FakeResizeObserver {
  observed: Element[] = [];
  disconnected = false;
  constructor(private readonly callback: Callback) {
    observers.push(this);
  }
  observe(node: Element) {
    this.observed.push(node);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  emit(entries: Array<{ contentRect: { width: number } }>) {
    this.callback(entries);
  }
}

function Probe({ mount = true }: { mount?: boolean }) {
  const { containerRef, containerWidth } = useContainerWidth<HTMLDivElement>();
  return (
    <>
      {mount && <div ref={containerRef} data-testid="box" />}
      <output>{containerWidth}</output>
    </>
  );
}

const output = () => screen.getByRole('status').textContent;

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 320,
  } as DOMRect);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useContainerWidth', () => {
  it('measures the node on mount and observes it', () => {
    render(<Probe />);
    expect(output()).toBe('320');
    expect(observers).toHaveLength(1);
    expect(observers[0]!.observed).toEqual([screen.getByTestId('box')]);
  });

  it('follows the content width the observer reports', () => {
    render(<Probe />);
    act(() => observers[0]!.emit([{ contentRect: { width: 480 } }]));
    expect(output()).toBe('480');
  });

  it('falls back to 0 when the observer reports no entry', () => {
    render(<Probe />);
    act(() => observers[0]!.emit([]));
    expect(output()).toBe('0');
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<Probe />);
    unmount();
    expect(observers[0]!.disconnected).toBe(true);
  });

  it('does nothing when the ref is never attached', () => {
    render(<Probe mount={false} />);
    expect(output()).toBe('0');
    expect(observers).toHaveLength(0);
  });
});
