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

/** Wire shape uses `url` instead of in-memory `content`. */
type PersistedImageData = {
  url?: string;
  label?: string;
  objectFit?: ImageObjectFit;
  objectPositionX?: number;
  objectPositionY?: number;
  cropScale?: number;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
  toPersistedData(data) {
    const { content, ...rest } = data;
    return { ...rest, url: content } satisfies PersistedImageData;
  },
  fromPersistedData(raw) {
    if (!isPlainObject(raw)) return {};
    const { url, content, ...rest } = raw as PersistedImageData & { content?: string };
    return {
      ...rest,
      content: typeof url === 'string' ? url : typeof content === 'string' ? content : undefined,
    };
  },
  validate(data) {
    const errors: string[] = [];
    if (data.content !== undefined && typeof data.content !== 'string') {
      errors.push('content must be a string');
    }
    if (data.objectFit !== undefined) {
      const fits = new Set(['cover', 'contain', 'fill']);
      if (!fits.has(data.objectFit)) errors.push('objectFit invalid');
    }
    return errors.length > 0 ? errors : undefined;
  },
});
