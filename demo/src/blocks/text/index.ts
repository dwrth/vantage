import { defineKind } from 'vantage';
import { LOREM_PARAGRAPH, LOREM_TITLE } from '../constants';
import { TextComponent } from './TextComponent';
import { TextInspector } from './TextInspector';
import type { TextData } from './types';

export type { TextData, TextAlign, TextFontSize, TextFontWeight, TextVariant } from './types';

export const textKind = defineKind<TextData>({
  component: TextComponent,
  inspector: TextInspector,
  defaults: {
    w: 4,
    h: 6,
    label: 'Text',
    data: {
      title: LOREM_TITLE,
      content: LOREM_PARAGRAPH,
      fontSize: 'base',
      fontWeight: 'normal',
      align: 'left',
    },
  },
  displayName: 'Text',
  editWrapperClass: 'bg-transparent! contain-none!',
  previewWrapperClass: 'bg-transparent! rounded-box p-3 gap-2 contain-none!',
});
