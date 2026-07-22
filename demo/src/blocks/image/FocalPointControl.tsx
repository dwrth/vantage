import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  computeViewfinderRect,
  supportsImagePanning,
  type ImageCropState,
  type ImageObjectFit,
} from './imageDisplay';
import { useViewfinder } from './useViewfinder';
import cropper from './imageFocalPoint.module.css';

type ImageMetrics = {
  naturalWidth: number;
  naturalHeight: number;
};

export type FocalPointControlProps = {
  imageSrc: string;
  objectFit: ImageObjectFit;
  cropState: ImageCropState;
  onCommit: (next: ImageCropState) => void;
  viewportAspectRatio: number;
  frameSelector?: string;
  frameMeasureDeps?: unknown[];
};

function formatAspectLabel(aspectRatio: number) {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) return '—';
  if (aspectRatio >= 1) return `${aspectRatio.toFixed(2)}:1`;
  return `1:${(1 / aspectRatio).toFixed(2)}`;
}

export function FocalPointControl({
  imageSrc,
  objectFit,
  cropState,
  onCommit,
  viewportAspectRatio,
  frameSelector,
  frameMeasureDeps = [],
}: FocalPointControlProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [displayW, setDisplayW] = useState(0);
  const [measuredFrameAspect, setMeasuredFrameAspect] = useState<number | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [imageMetrics, setImageMetrics] = useState<ImageMetrics | null>(null);
  const resolvedMetrics = loadedSrc === imageSrc ? imageMetrics : null;
  const effectiveAspectRatio = frameSelector
    ? (measuredFrameAspect ?? viewportAspectRatio)
    : viewportAspectRatio;
  const canAdjust = supportsImagePanning(objectFit);

  useEffect(() => {
    if (!imageSrc) return;

    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (cancelled) return;
      setLoadedSrc(imageSrc);
      setImageMetrics({
        naturalWidth: probe.naturalWidth,
        naturalHeight: probe.naturalHeight,
      });
    };
    probe.onerror = () => {
      if (cancelled) return;
      setLoadedSrc(imageSrc);
      setImageMetrics(null);
    };
    probe.src = imageSrc;
    return () => {
      cancelled = true;
    };
  }, [imageSrc]);

  const { displayRect, viewfinderHandlers, resizeHandlers } = useViewfinder({
    enabled: canAdjust,
    naturalW: resolvedMetrics?.naturalWidth ?? 0,
    naturalH: resolvedMetrics?.naturalHeight ?? 0,
    displayW,
    viewportAspectRatio: effectiveAspectRatio,
    objectFit,
    cropState,
    onCommit,
  });

  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return;

    const update = () => setDisplayW(node.clientWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!frameSelector) return;

    const update = () => {
      const frame = document.querySelector(frameSelector);
      if (!frame) return;
      const { width, height } = frame.getBoundingClientRect();
      if (width > 0 && height > 0) setMeasuredFrameAspect(width / height);
    };

    update();
    const frame = document.querySelector(frameSelector);
    if (!frame) {
      const retry = window.setTimeout(update, 120);
      return () => window.clearTimeout(retry);
    }

    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps mirror live canvas frame
  }, [frameSelector, ...frameMeasureDeps]);

  const previewRect = useMemo(
    () =>
      resolvedMetrics && displayW > 0
        ? computeViewfinderRect(
            resolvedMetrics.naturalWidth,
            resolvedMetrics.naturalHeight,
            displayW,
            effectiveAspectRatio,
            objectFit,
            cropState,
          )
        : null,
    [cropState, displayW, effectiveAspectRatio, resolvedMetrics, objectFit],
  );

  if (!imageSrc) return null;

  const isReady = !!(resolvedMetrics && displayW > 0 && previewRect);

  return (
    <div
      className="flex flex-col gap-2"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-sm font-medium">Focal point</p>
      <p className="text-xs text-base-content/55">
        {canAdjust
          ? 'Drag the frame to set the crop. Resize corner to zoom.'
          : 'Focal crop available when object-fit is cover or contain.'}
      </p>
      <p className={cropper.viewportLabel}>
        Viewport preview · {formatAspectLabel(effectiveAspectRatio)}
      </p>

      <div ref={measureRef} className="w-full">
        {isReady && displayRect ? (
          <div
            className={`${cropper.workspace} ${canAdjust ? cropper.workspaceInteractive : cropper.workspaceDisabled}`}
            style={{ touchAction: canAdjust ? 'none' : undefined }}
          >
            <div className={cropper.stage}>
              <img src={imageSrc} alt="" className={cropper.sourceImage} draggable={false} />
              {canAdjust && (
                <div
                  className={cropper.viewfinder}
                  style={{
                    left: displayRect.x,
                    top: displayRect.y,
                    width: displayRect.w,
                    height: displayRect.h,
                  }}
                  {...viewfinderHandlers}
                >
                  <button
                    type="button"
                    className={cropper.resizeHandle}
                    aria-label="Resize viewport"
                    {...resizeHandlers}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`${cropper.workspace} ${cropper.workspaceLoading}`}>
            <span className={cropper.loadingLabel}>Loading image…</span>
          </div>
        )}
      </div>
    </div>
  );
}
