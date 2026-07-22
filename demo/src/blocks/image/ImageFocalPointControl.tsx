import { useCallback, useMemo } from 'react';
import { FocalPointControl } from './FocalPointControl';
import { getImageObjectFit, toCropState, type ImageCropState } from './imageDisplay';
import type { ImageData } from './index';

export const VANTAGE_IMAGE_FRAME_ATTR = 'data-vantage-image-frame';

type ImageFocalPointControlProps = {
  data: ImageData;
  onChange: (patch: Partial<ImageData>) => void;
  viewportAspectRatio: number;
  itemId?: string;
};

export function ImageFocalPointControl({
  data,
  onChange,
  viewportAspectRatio,
  itemId,
}: ImageFocalPointControlProps) {
  const imageSrc = data.content;
  const objectFit = getImageObjectFit(data.objectFit);
  const cropState = useMemo(() => toCropState(data), [data]);

  const onCommit = useCallback(
    (next: ImageCropState) => {
      onChange(next);
    },
    [onChange],
  );

  if (!imageSrc || objectFit !== 'cover') return null;

  return (
    <FocalPointControl
      imageSrc={imageSrc}
      objectFit={objectFit}
      cropState={cropState}
      onCommit={onCommit}
      viewportAspectRatio={viewportAspectRatio}
      frameSelector={itemId ? `[${VANTAGE_IMAGE_FRAME_ATTR}="${itemId}"]` : undefined}
      frameMeasureDeps={[
        data.cropScale,
        data.objectPositionX,
        data.objectPositionY,
        data.content,
        itemId,
      ]}
    />
  );
}
