import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { SectionBackground as SectionBackgroundType } from '../types';
import {
  getSectionBackgroundImageStyle,
  usesLegacyBackgroundPosition,
} from '../lib/backgroundDisplay';

/** Extra vertical size (fraction of section height) so translate doesn't show gaps. */
const PARALLAX_OVERFLOW = 0.25;
/** Max shift as a fraction of section height. */
const PARALLAX_STRENGTH = 0.2;

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

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function collectScrollRoots(node: HTMLElement): Array<Element | Window> {
  const roots: Array<Element | Window> = [window];
  let current: HTMLElement | null = node.parentElement;
  while (current) {
    const style = getComputedStyle(current);
    const overflow = `${style.overflow}${style.overflowY}${style.overflowX}`;
    if (/(auto|scroll|overlay)/.test(overflow)) {
      roots.push(current);
    }
    current = current.parentElement;
  }
  return roots;
}

export function SectionBackground({
  background,
  className,
  layerClassName,
}: SectionBackgroundProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [layerSize, setLayerSize] = useState<{ width: number; height: number } | null>(null);
  const [loadedImageSize, setLoadedImageSize] = useState<{
    src: string;
    width: number;
    height: number;
  } | null>(null);

  const parallaxEnabled = Boolean(background?.parallax && background?.image);

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
  }, [background?.image, background?.blur, parallaxEnabled]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const layer = layerRef.current;
    if (!wrap || !layer || !parallaxEnabled || prefersReducedMotion()) {
      if (layer) layer.style.transform = '';
      return;
    }

    const update = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.height <= 0) return;
      const viewH = window.innerHeight || 1;
      const offset = (rect.top + rect.height / 2 - viewH / 2) / viewH;
      const shift = offset * rect.height * PARALLAX_STRENGTH;
      layer.style.transform = `translate3d(0, ${shift}px, 0)`;
    };

    update();
    const roots = collectScrollRoots(wrap);
    for (const root of roots) {
      root.addEventListener('scroll', update, { passive: true });
    }
    window.addEventListener('resize', update, { passive: true });

    return () => {
      for (const root of roots) {
        root.removeEventListener('scroll', update);
      }
      window.removeEventListener('resize', update);
      layer.style.transform = '';
    };
  }, [parallaxEnabled, background?.image]);

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
    ...(parallaxEnabled
      ? {
          top: `${-PARALLAX_OVERFLOW * 100}%`,
          bottom: `${-PARALLAX_OVERFLOW * 100}%`,
          left: blur > 0 ? `${-blur * 2}px` : 0,
          right: blur > 0 ? `${-blur * 2}px` : 0,
          willChange: 'transform',
        }
      : {
          inset: blur > 0 ? `${-blur * 2}px` : 0,
        }),
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
      ref={wrapRef}
      aria-hidden="true"
      className={className}
      style={wrapStyle}
      data-vantage-section-background=""
      data-vantage-section-parallax={parallaxEnabled ? '' : undefined}
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
