import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  clampViewfinderRect,
  cropStateFromViewfinderRect,
  computeViewfinderRect,
  type ImageCropState,
  type ImageObjectFit,
  type ViewfinderRect,
} from './imageDisplay';

type UseViewfinderOptions = {
  enabled: boolean;
  naturalW: number;
  naturalH: number;
  displayW: number;
  viewportAspectRatio: number;
  objectFit: ImageObjectFit;
  cropState: ImageCropState;
  onCommit: (state: ImageCropState) => void;
};

const MOVE_THRESHOLD_PX = 4;

function hasExceededThreshold(startX: number, startY: number, clientX: number, clientY: number) {
  return Math.hypot(clientX - startX, clientY - startY) > MOVE_THRESHOLD_PX;
}

function cropStateChanged(a: ImageCropState, b: ImageCropState) {
  return (
    a.objectPositionX !== b.objectPositionX ||
    a.objectPositionY !== b.objectPositionY ||
    Math.abs(a.cropScale - b.cropScale) > 0.001
  );
}

function resizeViewfinder(
  rect: ViewfinderRect,
  deltaW: number,
  naturalW: number,
  naturalH: number,
  displayW: number,
  viewportAspectRatio: number,
  objectFit: ImageObjectFit,
): ViewfinderRect {
  const nextW = rect.w + deltaW;
  const nextH = nextW / viewportAspectRatio;
  const centerX = rect.x + rect.w / 2;
  const centerY = rect.y + rect.h / 2;

  return clampViewfinderRect(naturalW, naturalH, displayW, viewportAspectRatio, objectFit, {
    w: nextW,
    h: nextH,
    x: centerX - nextW / 2,
    y: centerY - nextH / 2,
  });
}

export function useViewfinder({
  enabled,
  naturalW,
  naturalH,
  displayW,
  viewportAspectRatio,
  objectFit,
  cropState,
  onCommit,
}: UseViewfinderOptions) {
  const [previewRect, setPreviewRect] = useState<ViewfinderRect | null>(null);
  const previewRectRef = useRef<ViewfinderRect | null>(null);
  const dragMode = useRef<'move' | 'resize' | null>(null);
  const pointerStart = useRef<{ x: number; y: number; rect: ViewfinderRect } | null>(null);
  const hasMoved = useRef(false);

  const baseRect =
    naturalW > 0 && naturalH > 0 && displayW > 0
      ? computeViewfinderRect(
          naturalW,
          naturalH,
          displayW,
          viewportAspectRatio,
          objectFit,
          cropState,
        )
      : null;
  const displayRect = previewRect ?? baseRect;

  const setPreview = useCallback((next: ViewfinderRect | null) => {
    previewRectRef.current = next;
    setPreviewRect(next);
  }, []);

  const commitRect = useCallback(
    (rect: ViewfinderRect) => {
      const next = cropStateFromViewfinderRect(
        naturalW,
        naturalH,
        displayW,
        viewportAspectRatio,
        objectFit,
        rect,
      );
      if (cropStateChanged(next, cropState)) {
        onCommit(next);
      }
    },
    [cropState, displayW, naturalH, naturalW, objectFit, onCommit, viewportAspectRatio],
  );

  const onViewfinderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled || !displayRect) return;
      event.preventDefault();
      event.stopPropagation();
      dragMode.current = 'move';
      hasMoved.current = false;
      pointerStart.current = { x: event.clientX, y: event.clientY, rect: displayRect };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [displayRect, enabled],
  );

  const onResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!enabled || !displayRect) return;
      event.preventDefault();
      event.stopPropagation();
      dragMode.current = 'resize';
      hasMoved.current = false;
      pointerStart.current = { x: event.clientX, y: event.clientY, rect: displayRect };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [displayRect, enabled],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      if (!enabled || !pointerStart.current || !dragMode.current) return;
      event.preventDefault();
      event.stopPropagation();

      const { x, y, rect } = pointerStart.current;
      const dx = event.clientX - x;

      if (hasExceededThreshold(x, y, event.clientX, event.clientY)) {
        hasMoved.current = true;
      }

      if (dragMode.current === 'move') {
        setPreview(
          clampViewfinderRect(naturalW, naturalH, displayW, viewportAspectRatio, objectFit, {
            ...rect,
            x: rect.x + dx,
            y: rect.y + (event.clientY - y),
          }),
        );
        return;
      }

      setPreview(
        resizeViewfinder(rect, dx, naturalW, naturalH, displayW, viewportAspectRatio, objectFit),
      );
    },
    [displayW, enabled, naturalH, naturalW, objectFit, setPreview, viewportAspectRatio],
  );

  const finishPointer = useCallback(
    (event: ReactPointerEvent) => {
      if (!dragMode.current) return;
      event.preventDefault();
      event.stopPropagation();

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const finalRect = previewRectRef.current;
      dragMode.current = null;
      pointerStart.current = null;
      setPreview(null);

      if (!finalRect || !hasMoved.current) return;
      commitRect(finalRect);
    },
    [commitRect, setPreview],
  );

  return {
    displayRect,
    viewfinderHandlers: {
      onPointerDown: onViewfinderPointerDown,
      onPointerMove,
      onPointerUp: finishPointer,
      onPointerCancel: finishPointer,
    },
    resizeHandlers: {
      onPointerDown: onResizePointerDown,
      onPointerMove,
      onPointerUp: finishPointer,
      onPointerCancel: finishPointer,
    },
  };
}
