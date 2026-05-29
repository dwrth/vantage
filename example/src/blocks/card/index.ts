import { defineKind } from 'vantage';
import { CardComponent } from './cardComponent';
import s from './card.module.css';

export type CardData = {
  image?: string;
  imageAlt?: string;
  title?: string;
  content?: string;
  cta?: string;
};

export const cardKind = defineKind<CardData>({
  component: CardComponent,
  defaults: {
    w: 4,
    h: 7,
    label: 'Card',
    data: {
      image: 'https://picsum.photos/seed/vantage-card/800/500',
      imageAlt: 'Abstract workspace scene',
      title: 'Ship faster',
      content:
        'Bundled patterns for buttons, inputs, and forms so prototypes feel real on day one.',
      cta: 'Learn more',
    },
  },
  displayName: 'Card',
  editWrapperClass: s.editWrapper,
  previewWrapperClass: s.previewWrapper,
});
