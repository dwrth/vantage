import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { SectionBackground as SectionBackgroundType } from '../types';
import {
  getSectionBackgroundImageStyle,
  usesLegacyBackgroundPosition,
} from '../lib/backgroundDisplay';

export type SectionBackgroundProps = {
  background?: SectionBackgroundType;
  /**
   * CSS class applied to the absolutely-positioned outer wrapper that clips the
   * (possibly extended) inner layer. Consumers can use it to position the
   * background within a section frame.
   */
  className?: string;
  /**
   * CSS class applied to the inner layer that paints the color/image and
   * receives blur/opacity. Useful for theming.
   */
  layerClassName?: string;
};

function hasAny(background: SectionBackgroundType): boolean {
  return Boolean(
    background.color ||
    background.image ||
    typeof background.blur === 'number' ||
    typeof background.opacity === 'number',
  );
}

export function SectionBackground({
  background,
  className,
  layerClassName,
}: SectionBackgroundProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [layerSize, setLayerSize] = useState<{ width: number; height: number } | null>(null);
  const [loadedImageSize, setLoadedImageSize] = useState<{
    src: string;
    width: number;
    height: number;
  } | null>(null);

  useLayoutEffect(() => {
    const node = layerRef.current;
    if (!node) return;

    const update = () => {
      const { width, height } = node.getBoundingClientRect();
      if (width > 0 && height > 0) setLayerSize({ width, height });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [background?.image, background?.blur]);

  if (!background || !hasAny(background)) return null;

  const blur = Math.max(0, background.blur ?? 0);
  const opacity = background.opacity ?? 1;
  const imageSizeMode = background.imageSize ?? 'cover';
  const imageRepeat = background.imageRepeat ?? 'no-repeat';
  const legacyPosition = background.imagePosition ?? 'center';
  const useFocalPlacement = Boolean(background.image) && !usesLegacyBackgroundPosition(background);
  const imageSize =
    loadedImageSize && loadedImageSize.src === background.image
      ? { width: loadedImageSize.width, height: loadedImageSize.height }
      : null;

  const layerStyle: CSSProperties = {
    position: 'absolute',
    inset: blur > 0 ? `${-blur * 2}px` : 0,
    backgroundColor: background.color,
    backgroundImage:
      background.image && !useFocalPlacement ? `url("${background.image}")` : undefined,
    backgroundSize: background.image && !useFocalPlacement ? imageSizeMode : undefined,
    backgroundPosition: background.image && !useFocalPlacement ? legacyPosition : undefined,
    backgroundRepeat: background.image && !useFocalPlacement ? imageRepeat : undefined,
    filter: blur > 0 ? `blur(${blur}px)` : undefined,
    opacity,
    pointerEvents: 'none',
    overflow: useFocalPlacement ? 'hidden' : undefined,
  };

  const imageStyle = useFocalPlacement
    ? getSectionBackgroundImageStyle(
        imageSizeMode,
        background,
        imageSize ?? undefined,
        layerSize ?? undefined,
      )
    : undefined;

  const wrapStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: -1,
  };

  return (
    <div
      aria-hidden="true"
      className={className}
      style={wrapStyle}
      data-vantage-section-background=""
    >
      <div ref={layerRef} className={layerClassName} style={layerStyle}>
        {useFocalPlacement && background.image ? (
          <img
            key={background.image}
            src={background.image}
            alt=""
            draggable={false}
            style={imageStyle}
            onLoad={(event) => {
              const img = event.currentTarget;
              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                setLoadedImageSize({
                  src: background.image!,
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                });
              }
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
