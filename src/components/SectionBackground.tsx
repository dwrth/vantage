import type { CSSProperties } from 'react';
import type { SectionBackground as SectionBackgroundType } from '../types';

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
  if (!background || !hasAny(background)) return null;

  const blur = Math.max(0, background.blur ?? 0);
  const opacity = background.opacity ?? 1;
  const imageSize = background.imageSize ?? 'cover';
  const imagePosition = background.imagePosition ?? 'center';
  const imageRepeat = background.imageRepeat ?? 'no-repeat';

  const layerStyle: CSSProperties = {
    position: 'absolute',
    inset: blur > 0 ? `${-blur * 2}px` : 0,
    backgroundColor: background.color,
    backgroundImage: background.image ? `url("${background.image}")` : undefined,
    backgroundSize: imageSize,
    backgroundPosition: imagePosition,
    backgroundRepeat: imageRepeat,
    filter: blur > 0 ? `blur(${blur}px)` : undefined,
    opacity,
    pointerEvents: 'none',
  };

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
      <div className={layerClassName} style={layerStyle} />
    </div>
  );
}
