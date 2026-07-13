import type { CSSProperties } from 'react';
import type { SectionBackgroundImageSize } from '../types';

export type BackgroundObjectFit = 'cover' | 'contain' | 'fill' | 'scale-down';

export const MIN_CROP_SCALE = 0.4;

export type BackgroundCropState = {
  objectPositionX: number;
  objectPositionY: number;
  cropScale: number;
};

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function clampCropScale(value: number) {
  return Math.min(1, Math.max(MIN_CROP_SCALE, value));
}

export function sectionSizeToObjectFit(
  imageSize?: SectionBackgroundImageSize,
): BackgroundObjectFit {
  if (imageSize === 'contain') return 'contain';
  if (imageSize === 'auto') return 'scale-down';
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

export function sectionBackgroundToCropState(background?: {
  objectPositionX?: number;
  objectPositionY?: number;
  cropScale?: number;
  imagePosition?: string;
}): BackgroundCropState {
  return {
    objectPositionX: clampPercent(
      background?.objectPositionX ?? parseImagePositionPart(background?.imagePosition, 0) ?? 50,
    ),
    objectPositionY: clampPercent(
      background?.objectPositionY ?? parseImagePositionPart(background?.imagePosition, 1) ?? 50,
    ),
    cropScale: clampCropScale(background?.cropScale ?? 1),
  };
}

type FittedImagePlacement = {
  renderedW: number;
  renderedH: number;
  left: number;
  top: number;
};

function computeZoomedPlacement(
  imageWidth: number,
  imageHeight: number,
  boxWidth: number,
  boxHeight: number,
  objectFit: BackgroundObjectFit,
  cropState: BackgroundCropState,
): FittedImagePlacement {
  const cropScale = clampCropScale(cropState.cropScale);
  const posX = cropState.objectPositionX;
  const posY = cropState.objectPositionY;

  if (objectFit === 'fill') {
    return { renderedW: boxWidth, renderedH: boxHeight, left: 0, top: 0 };
  }

  const scale =
    objectFit === 'contain' || objectFit === 'scale-down'
      ? Math.min(
          boxWidth / imageWidth,
          boxHeight / imageHeight,
          objectFit === 'scale-down' ? 1 : Infinity,
        ) / cropScale
      : Math.max(boxWidth / imageWidth, boxHeight / imageHeight) / cropScale;

  const renderedW = imageWidth * scale;
  const renderedH = imageHeight * scale;

  return {
    renderedW,
    renderedH,
    left: (boxWidth - renderedW) * (posX / 100),
    top: (boxHeight - renderedH) * (posY / 100),
  };
}

export function getSectionBackgroundImageStyle(
  imageSize: SectionBackgroundImageSize | undefined,
  background:
    | {
        objectPositionX?: number;
        objectPositionY?: number;
        cropScale?: number;
        imagePosition?: string;
      }
    | undefined,
  imageDimensions?: { width: number; height: number },
  boxSize?: { width: number; height: number },
): CSSProperties {
  const objectFit = sectionSizeToObjectFit(imageSize);
  const cropState = sectionBackgroundToCropState(background);

  if (imageDimensions && boxSize && boxSize.width > 0 && boxSize.height > 0) {
    const placement = computeZoomedPlacement(
      imageDimensions.width,
      imageDimensions.height,
      boxSize.width,
      boxSize.height,
      objectFit,
      cropState,
    );

    return {
      position: 'absolute',
      width: `${(placement.renderedW / boxSize.width) * 100}%`,
      height: `${(placement.renderedH / boxSize.height) * 100}%`,
      left: `${(placement.left / boxSize.width) * 100}%`,
      top: `${(placement.top / boxSize.height) * 100}%`,
      maxWidth: 'none',
    };
  }

  return {
    objectFit,
    objectPosition: `${cropState.objectPositionX}% ${cropState.objectPositionY}%`,
    width: '100%',
    height: '100%',
  };
}

export function usesLegacyBackgroundPosition(background?: {
  objectPositionX?: number;
  objectPositionY?: number;
  cropScale?: number;
}): boolean {
  return (
    background?.objectPositionX === undefined &&
    background?.objectPositionY === undefined &&
    background?.cropScale === undefined
  );
}
