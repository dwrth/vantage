import { defineKind } from 'vantage';
import { DEFAULT_IMAGE_URL } from '../constants';
import { ImageComponent } from './ImageComponent';
import { ImageInspector } from './ImageInspector';
import type { ImageObjectFit } from './imageDisplay';

export type ImageData = {
  content?: string;
  label?: string;
  objectFit?: ImageObjectFit;
  objectPositionX?: number;
  objectPositionY?: number;
  /** 0.4–1. Viewport zoom in cropper; 1 = no extra zoom. */
  cropScale?: number;
};

export const imageKind = defineKind<ImageData>({
  component: ImageComponent,
  inspector: ImageInspector,
  defaults: {
    w: 4,
    h: 5,
    label: 'Image',
    data: {
      content: DEFAULT_IMAGE_URL,
      objectFit: 'cover',
      objectPositionX: 50,
      objectPositionY: 50,
      cropScale: 1,
    },
  },
  displayName: 'Image',
  editWrapperClass: 'bg-base-200!',
  previewWrapperClass: 'bg-base-200! rounded-box overflow-hidden',
});
