import { useLayoutEffect, useRef, useState } from 'react';
import type { ItemRendererProps } from 'vantage';
import { getSingleImageStyle } from './imageDisplay';
import type { ImageData } from './index';

export function ImageComponent({ item }: ItemRendererProps<ImageData>) {
  const data = item.data ?? {};
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  useLayoutEffect(() => {
    const node = frameRef.current;
    if (!node) return;

    const update = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      if (width > 0 && height > 0) {
        setFrameSize({ width, height });
      }
    };

    update();
    const raf = window.requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [
    data.content,
    data.objectFit,
    data.cropScale,
    data.objectPositionX,
    data.objectPositionY,
    item.id,
    item.w,
    item.h,
    item.x,
    item.y,
  ]);

  if (!data.content) return null;

  const resolvedImageSize = loadedSrc === data.content ? imageSize : null;
  const imageStyle = getSingleImageStyle(
    data,
    resolvedImageSize ?? undefined,
    frameSize ?? undefined,
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-base-200">
      <div
        ref={frameRef}
        className="relative min-h-0 w-full flex-1 overflow-hidden"
        data-vantage-image-frame={item.id}
      >
        <img
          src={data.content}
          alt={data.label ?? item.label ?? 'image'}
          draggable={false}
          className="pointer-events-none select-none"
          style={imageStyle}
          onLoad={(event) => {
            const img = event.currentTarget;
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              setLoadedSrc(data.content ?? null);
              setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
            }
          }}
        />
      </div>
    </div>
  );
}
