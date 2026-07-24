import { PointerSensor, type PointerSensorOptions } from '@dnd-kit/core';
import type { PointerEvent } from 'react';
import { shouldPreventDragActivation } from './interactive';

/**
 * PointerSensor that refuses activation when the event target is an interactive
 * content control — but still allows drag when the activator is the handle
 * itself (built-in handle is a `<button>`).
 */
export class VantagePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (event: PointerEvent, { onActivation }: PointerSensorOptions): boolean => {
        const { nativeEvent } = event;
        if (!nativeEvent.isPrimary || nativeEvent.button !== 0) {
          return false;
        }
        if (shouldPreventDragActivation(nativeEvent.target, event.currentTarget)) {
          return false;
        }
        onActivation?.({ event: nativeEvent });
        return true;
      },
    },
  ];
}
