import { useCallback, useMemo } from 'react';
import type { SectionBackground, SectionBackgroundImageSize } from 'vantage';
import { FocalPointControl } from './blocks/image/FocalPointControl';
import {
  clampCropScale,
  clampPercent,
  type ImageCropState,
  type ImageObjectFit,
} from './blocks/image/imageDisplay';

const DEFAULT_SECTION_VIEWPORT_ASPECT = 16 / 9;

function sectionFrameSelector(sectionId: string) {
  return `[data-vantage-section-frame="${sectionId}"]`;
}

function sectionSizeToObjectFit(imageSize?: SectionBackgroundImageSize): ImageObjectFit {
  if (imageSize === 'contain') return 'contain';
  return 'cover';
}

function parseImagePositionPart(value: string | undefined, index: 0 | 1): number | undefined {
  if (!value) return undefined;
  const parts = value.trim().split(/\s+/);
  const part = parts[index];
  if (!part) return undefined;
  const match = part.match(/^([\d.]+)%$/);
  return match ? Number(match[1]) : undefined;
}

function sectionBackgroundToCropState(bg?: SectionBackground): ImageCropState {
  return {
    objectPositionX: clampPercent(
      bg?.objectPositionX ?? parseImagePositionPart(bg?.imagePosition, 0) ?? 50,
    ),
    objectPositionY: clampPercent(
      bg?.objectPositionY ?? parseImagePositionPart(bg?.imagePosition, 1) ?? 50,
    ),
    cropScale: clampCropScale(bg?.cropScale ?? 1),
  };
}

function cropStateToSectionBackgroundPatch(
  cropState: ImageCropState,
): Pick<SectionBackground, 'objectPositionX' | 'objectPositionY' | 'cropScale' | 'imagePosition'> {
  const objectPositionX = clampPercent(cropState.objectPositionX);
  const objectPositionY = clampPercent(cropState.objectPositionY);
  const cropScale = clampCropScale(cropState.cropScale);

  return {
    objectPositionX,
    objectPositionY,
    cropScale,
    imagePosition: `${objectPositionX}% ${objectPositionY}%`,
  };
}

type SectionBackgroundFocalPointControlProps = {
  background: SectionBackground;
  imageSrc: string;
  sectionId: string;
  viewportAspectRatio?: number;
  onChange: (patch: Partial<SectionBackground>) => void;
};

export function SectionBackgroundFocalPointControl({
  background,
  imageSrc,
  sectionId,
  viewportAspectRatio = DEFAULT_SECTION_VIEWPORT_ASPECT,
  onChange,
}: SectionBackgroundFocalPointControlProps) {
  const objectFit = sectionSizeToObjectFit(background.imageSize);
  const cropState = useMemo(() => sectionBackgroundToCropState(background), [background]);

  const onCommit = useCallback(
    (next: ImageCropState) => {
      onChange(cropStateToSectionBackgroundPatch(next));
    },
    [onChange],
  );

  if ((background.imageSize ?? 'cover') !== 'cover') return null;

  return (
    <FocalPointControl
      imageSrc={imageSrc}
      objectFit={objectFit}
      cropState={cropState}
      onCommit={onCommit}
      viewportAspectRatio={viewportAspectRatio}
      frameSelector={sectionFrameSelector(sectionId)}
      frameMeasureDeps={[
        background.imageSize,
        background.blur,
        background.opacity,
        background.cropScale,
        background.objectPositionX,
        background.objectPositionY,
      ]}
    />
  );
}
