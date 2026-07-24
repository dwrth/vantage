import { PointerSensor, type PointerSensorOptions } from '@dnd-kit/core';
import type { PointerEvent } from 'react';
import { isVantageInteractiveTarget } from './interactive';

/**
 * PointerSensor that refuses activation when the event target is an interactive
 * control (native form elements / links / contenteditable / data-vantage-interactive).
 */
export class VantagePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (
        { nativeEvent: event }: PointerEvent,
        { onActivation }: PointerSensorOptions,
      ): boolean => {
        if (!event.isPrimary || event.button !== 0) {
          return false;
        }
        if (isVantageInteractiveTarget(event.target)) {
          return false;
        }
        onActivation?.({ event });
        return true;
      },
    },
  ];
}
