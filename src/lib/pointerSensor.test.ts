// @vitest-environment jsdom
import { PointerSensor } from '@dnd-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { VANTAGE_DRAG_HANDLE_ATTR } from './interactive';
import { VantagePointerSensor } from './pointerSensor';

type Native = { isPrimary: boolean; button: number; target: EventTarget | null };

const [activator] = VantagePointerSensor.activators;

function press(native: Native, currentTarget: EventTarget | null = null) {
  const onActivation = vi.fn();
  const handled = activator.handler(
    { nativeEvent: native, currentTarget } as never,
    { onActivation } as never,
  );
  return { handled, onActivation };
}

describe('VantagePointerSensor', () => {
  it('extends PointerSensor with a single onPointerDown activator', () => {
    expect(Object.getPrototypeOf(VantagePointerSensor)).toBe(PointerSensor);
    expect(VantagePointerSensor.activators).toHaveLength(1);
    expect(activator.eventName).toBe('onPointerDown');
  });

  it('activates on a primary left press over non-interactive content', () => {
    const target = document.createElement('div');
    const native = { isPrimary: true, button: 0, target };
    const { handled, onActivation } = press(native);
    expect(handled).toBe(true);
    expect(onActivation).toHaveBeenCalledWith({ event: native });
  });

  it.each([
    ['non-primary pointer', { isPrimary: false, button: 0 }],
    ['right button', { isPrimary: true, button: 2 }],
    ['middle button', { isPrimary: true, button: 1 }],
  ])('refuses %s', (_name, flags) => {
    const target = document.createElement('div');
    const { handled, onActivation } = press({ ...flags, target });
    expect(handled).toBe(false);
    expect(onActivation).not.toHaveBeenCalled();
  });

  it('refuses when the target is an interactive control outside the handle', () => {
    const cell = document.createElement('div');
    const input = document.createElement('input');
    cell.appendChild(input);
    const { handled, onActivation } = press({ isPrimary: true, button: 0, target: input }, cell);
    expect(handled).toBe(false);
    expect(onActivation).not.toHaveBeenCalled();
  });

  it('activates when the activator is an interactive handle button', () => {
    const button = document.createElement('button');
    const { handled, onActivation } = press({ isPrimary: true, button: 0, target: button }, button);
    expect(handled).toBe(true);
    expect(onActivation).toHaveBeenCalledTimes(1);
  });

  it('activates for interactive targets inside a drag-handle marker', () => {
    const wrap = document.createElement('div');
    wrap.setAttribute(VANTAGE_DRAG_HANDLE_ATTR, '');
    const button = document.createElement('button');
    wrap.appendChild(button);
    expect(press({ isPrimary: true, button: 0, target: button }).handled).toBe(true);
  });

  it('does not require onActivation', () => {
    const target = document.createElement('div');
    expect(
      activator.handler(
        { nativeEvent: { isPrimary: true, button: 0, target }, currentTarget: null } as never,
        {} as never,
      ),
    ).toBe(true);
  });
});
