import { defineKind } from 'vantage';
import { LOREM_PARAGRAPH, LOREM_TITLE } from '../constants';
import { TextComponent } from './textComponent';
import s from './text.module.css';

export type TextData = {
  title?: string;
  content?: string;
  /** `overlay` swaps to white text + drop shadow for use on top of images. */
  variant?: 'overlay';
};

export const textKind = defineKind<TextData>({
  component: TextComponent,
  defaults: {
    w: 4,
    h: 6,
    label: 'Text',
    data: { title: LOREM_TITLE, content: LOREM_PARAGRAPH },
  },
  displayName: 'Text',
  editWrapperClass: s.editWrapper,
  previewWrapperClass: s.previewWrapper,
});
