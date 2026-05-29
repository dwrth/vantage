import { defineKind } from 'vantage';
import { DEFAULT_IMAGE_URL } from '../constants';
import { ImageComponent } from './imageComponent';
import s from './image.module.css';

export type ImageData = {
  content?: string;
  label?: string;
};

export const imageKind = defineKind<ImageData>({
  component: ImageComponent,
  defaults: { w: 4, h: 5, label: 'Image', data: { content: DEFAULT_IMAGE_URL } },
  displayName: 'Image',
  editWrapperClass: s.editWrapper,
  previewWrapperClass: s.previewWrapper,
});
