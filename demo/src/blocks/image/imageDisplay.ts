import type { CSSProperties } from 'react';
import { CELL_MAX_PX, getCellWidth, getFlexRowHeight } from 'vantage';

export type ImageObjectFit = 'cover' | 'contain' | 'fill';

export type ImageCropState = {
  objectPositionX: number;
  objectPositionY: number;
  cropScale: number;
};

export type GridItemViewportOptions = {
  columns?: number;
  colGap?: number;
  rowGap?: number;
  containerWidth?: number;
  imageMaxWidthPx?: number;
};

export const MIN_CROP_SCALE = 0.4;

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function clampCropScale(value: number) {
  return Math.min(1, Math.max(MIN_CROP_SCALE, value));
}

/** Approximate grid-item aspect at desktop content width (fallback when canvas frame is not measurable). */
export function gridItemViewportAspectRatio(
  gridWidth: number,
  gridHeight: number,
  options?: GridItemViewportOptions,
) {
  const columns = options?.columns ?? 12;
  const colGap = options?.colGap ?? 8;
  const rowGap = options?.rowGap ?? 8;
  const containerWidth = options?.containerWidth ?? columns * CELL_MAX_PX;

  const cellWidth = getCellWidth(containerWidth, columns, colGap, CELL_MAX_PX);
  const flexRowPx = getFlexRowHeight(containerWidth, columns, colGap, CELL_MAX_PX);
  const itemWidth = gridWidth * cellWidth + Math.max(0, gridWidth - 1) * colGap;
  const itemHeight = gridHeight * flexRowPx + Math.max(0, gridHeight - 1) * rowGap;

  if (itemHeight <= 0) return (gridWidth * 2) / Math.max(gridHeight, 1);

  const frameWidth =
    options?.imageMaxWidthPx && options.imageMaxWidthPx > 0
      ? Math.min(itemWidth, options.imageMaxWidthPx)
      : itemWidth;

  return frameWidth / itemHeight;
}

export function toCropState(data?: {
  objectPositionX?: number;
  objectPositionY?: number;
  cropScale?: number;
}): ImageCropState {
  return {
    objectPositionX: clampPercent(data?.objectPositionX ?? 50),
    objectPositionY: clampPercent(data?.objectPositionY ?? 50),
    cropScale: clampCropScale(data?.cropScale ?? 1),
  };
}

export function getImageObjectFit(objectFit?: ImageObjectFit): ImageObjectFit {
  return objectFit ?? 'cover';
}

export function supportsImagePanning(objectFit?: ImageObjectFit): boolean {
  const fit = getImageObjectFit(objectFit);
  return fit === 'cover' || fit === 'contain';
}

type FittedImagePlacement = {
  renderedW: number;
  renderedH: number;
  left: number;
  top: number;
};

export function computeZoomedPlacement(
  imageWidth: number,
  imageHeight: number,
  boxWidth: number,
  boxHeight: number,
  objectFit: ImageObjectFit,
  cropState: ImageCropState,
): FittedImagePlacement {
  const cropScale = clampCropScale(cropState.cropScale);
  const posX = cropState.objectPositionX;
  const posY = cropState.objectPositionY;

  if (objectFit === 'fill') {
    return { renderedW: boxWidth, renderedH: boxHeight, left: 0, top: 0 };
  }

  const scale =
    objectFit === 'contain'
      ? Math.min(boxWidth / imageWidth, boxHeight / imageHeight, Infinity) / cropScale
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

export function toPlacementImageStyle(
  imageWidth: number,
  imageHeight: number,
  boxWidth: number,
  boxHeight: number,
  objectFit: ImageObjectFit,
  cropState: ImageCropState,
): CSSProperties {
  const placement = computeZoomedPlacement(
    imageWidth,
    imageHeight,
    boxWidth,
    boxHeight,
    objectFit,
    cropState,
  );

  return {
    position: 'absolute',
    width: `${(placement.renderedW / boxWidth) * 100}%`,
    height: `${(placement.renderedH / boxHeight) * 100}%`,
    left: `${(placement.left / boxWidth) * 100}%`,
    top: `${(placement.top / boxHeight) * 100}%`,
    maxWidth: 'none',
  };
}

export function getSingleImageStyle(
  data:
    | {
        objectFit?: ImageObjectFit;
        objectPositionX?: number;
        objectPositionY?: number;
        cropScale?: number;
      }
    | undefined,
  imageSize?: { width: number; height: number },
  boxSize?: { width: number; height: number },
): CSSProperties {
  if (imageSize && boxSize && boxSize.width > 0 && boxSize.height > 0) {
    return toPlacementImageStyle(
      imageSize.width,
      imageSize.height,
      boxSize.width,
      boxSize.height,
      getImageObjectFit(data?.objectFit),
      toCropState(data),
    );
  }

  const cropState = toCropState(data);
  const objectFit = getImageObjectFit(data?.objectFit);

  const base: CSSProperties = {
    objectFit,
    objectPosition: `${cropState.objectPositionX}% ${cropState.objectPositionY}%`,
    width: '100%',
    height: '100%',
  };

  if (cropState.cropScale < 1 && supportsImagePanning(objectFit)) {
    const zoom = 1 / cropState.cropScale;
    return {
      ...base,
      transform: `scale(${zoom})`,
      transformOrigin: `${cropState.objectPositionX}% ${cropState.objectPositionY}%`,
    };
  }

  return base;
}

export type ViewfinderRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const LOGICAL_CONTAINER_WIDTH = 1000;

function logicalContainerSize(viewportAspectRatio: number) {
  const containerW = LOGICAL_CONTAINER_WIDTH;
  return { containerW, containerH: containerW / viewportAspectRatio };
}

function visibleNaturalRect(
  naturalW: number,
  _naturalH: number,
  containerW: number,
  containerH: number,
  placement: FittedImagePlacement,
): ViewfinderRect {
  const renderScale = placement.renderedW / naturalW;
  const intLeft = Math.max(0, placement.left);
  const intTop = Math.max(0, placement.top);
  const intRight = Math.min(containerW, placement.left + placement.renderedW);
  const intBottom = Math.min(containerH, placement.top + placement.renderedH);

  return {
    x: (intLeft - placement.left) / renderScale,
    y: (intTop - placement.top) / renderScale,
    w: (intRight - intLeft) / renderScale,
    h: (intBottom - intTop) / renderScale,
  };
}

function maxViewfinderNaturalSize(
  naturalW: number,
  naturalH: number,
  containerW: number,
  containerH: number,
  objectFit: ImageObjectFit,
) {
  const placement = computeZoomedPlacement(naturalW, naturalH, containerW, containerH, objectFit, {
    objectPositionX: 50,
    objectPositionY: 50,
    cropScale: 1,
  });
  return visibleNaturalRect(naturalW, naturalH, containerW, containerH, placement);
}

function viewportOriginToObjectPosition(
  originX: number,
  originY: number,
  containerW: number,
  containerH: number,
  renderedW: number,
  renderedH: number,
): { objectPositionX: number; objectPositionY: number } {
  const objectPositionX =
    renderedW > containerW ? clampPercent((100 * originX) / (renderedW - containerW)) : 50;
  const objectPositionY =
    renderedH > containerH ? clampPercent((100 * originY) / (renderedH - containerH)) : 50;

  return { objectPositionX, objectPositionY };
}

export function computeViewfinderRect(
  naturalW: number,
  naturalH: number,
  displayW: number,
  viewportAspectRatio: number,
  objectFit: ImageObjectFit,
  cropState: ImageCropState,
): ViewfinderRect | null {
  if (
    naturalW <= 0 ||
    naturalH <= 0 ||
    displayW <= 0 ||
    viewportAspectRatio <= 0 ||
    objectFit === 'fill'
  )
    return null;

  const { containerW, containerH } = logicalContainerSize(viewportAspectRatio);
  const placement = computeZoomedPlacement(
    naturalW,
    naturalH,
    containerW,
    containerH,
    objectFit,
    cropState,
  );
  const naturalRect = visibleNaturalRect(naturalW, naturalH, containerW, containerH, placement);
  const displayScale = displayW / naturalW;

  return {
    x: naturalRect.x * displayScale,
    y: naturalRect.y * displayScale,
    w: naturalRect.w * displayScale,
    h: naturalRect.h * displayScale,
  };
}

export function cropStateFromViewfinderRect(
  naturalW: number,
  naturalH: number,
  displayW: number,
  viewportAspectRatio: number,
  objectFit: ImageObjectFit,
  rect: ViewfinderRect,
): ImageCropState {
  const { containerW, containerH } = logicalContainerSize(viewportAspectRatio);
  const displayScale = displayW / naturalW;
  const naturalRect: ViewfinderRect = {
    x: rect.x / displayScale,
    y: rect.y / displayScale,
    w: rect.w / displayScale,
    h: rect.h / displayScale,
  };

  const maxRect = maxViewfinderNaturalSize(naturalW, naturalH, containerW, containerH, objectFit);
  const cropScale = clampCropScale(maxRect.w > 0 ? naturalRect.w / maxRect.w : 1);

  const placement = computeZoomedPlacement(naturalW, naturalH, containerW, containerH, objectFit, {
    objectPositionX: 50,
    objectPositionY: 50,
    cropScale,
  });
  const renderScale = placement.renderedW / naturalW;
  const originX = naturalRect.x * renderScale;
  const originY = naturalRect.y * renderScale;
  const { objectPositionX, objectPositionY } = viewportOriginToObjectPosition(
    originX,
    originY,
    containerW,
    containerH,
    placement.renderedW,
    placement.renderedH,
  );

  return { objectPositionX, objectPositionY, cropScale };
}

export function clampViewfinderRect(
  naturalW: number,
  naturalH: number,
  displayW: number,
  viewportAspectRatio: number,
  objectFit: ImageObjectFit,
  rect: ViewfinderRect,
): ViewfinderRect {
  const { containerW, containerH } = logicalContainerSize(viewportAspectRatio);
  const displayScale = displayW / naturalW;
  const maxRect = maxViewfinderNaturalSize(naturalW, naturalH, containerW, containerH, objectFit);
  const maxDisplayW = maxRect.w * displayScale;
  const maxDisplayH = maxRect.h * displayScale;
  const minDisplayW = maxDisplayW * MIN_CROP_SCALE;
  const minDisplayH = maxDisplayH * MIN_CROP_SCALE;
  const aspect = containerW / containerH;

  let nextW = Math.min(maxDisplayW, Math.max(minDisplayW, rect.w));
  let nextH = nextW / aspect;
  if (nextH > maxDisplayH) {
    nextH = maxDisplayH;
    nextW = nextH * aspect;
  }
  if (nextH < minDisplayH) {
    nextH = minDisplayH;
    nextW = nextH * aspect;
  }

  const cropScale = clampCropScale(maxDisplayW > 0 ? nextW / maxDisplayW : 1);
  const placement = computeZoomedPlacement(naturalW, naturalH, containerW, containerH, objectFit, {
    objectPositionX: 50,
    objectPositionY: 50,
    cropScale,
  });
  const naturalWAtScale = containerW / (placement.renderedW / naturalW);
  const naturalHAtScale = containerH / (placement.renderedH / naturalH);
  const displayWAtScale = naturalWAtScale * displayScale;
  const displayHAtScale = naturalHAtScale * displayScale;

  let minX = 0;
  let maxX = Math.max(0, displayW - displayWAtScale);
  let minY = 0;
  let maxY = Math.max(0, naturalH * displayScale - displayHAtScale);

  if (placement.renderedW <= containerW) {
    const centeredX = ((naturalW - naturalWAtScale) / 2) * displayScale;
    minX = centeredX;
    maxX = centeredX;
  }
  if (placement.renderedH <= containerH) {
    const centeredY = ((naturalH - naturalHAtScale) / 2) * displayScale;
    minY = centeredY;
    maxY = centeredY;
  }

  const centerX = rect.x + rect.w / 2;
  const centerY = rect.y + rect.h / 2;
  const clampedCenterX = Math.min(Math.max(centerX, minX + nextW / 2), maxX + nextW / 2);
  const clampedCenterY = Math.min(Math.max(centerY, minY + nextH / 2), maxY + nextH / 2);

  return {
    w: nextW,
    h: nextH,
    x: clampedCenterX - nextW / 2,
    y: clampedCenterY - nextH / 2,
  };
}
