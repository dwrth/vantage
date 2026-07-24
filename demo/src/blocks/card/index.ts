import { defineKind } from 'vantage';
import { CardEdit, CardPreview } from './CardComponent';

export type CardData = {
  image?: string;
  imageAlt?: string;
  title?: string;
  content?: string;
  cta?: string;
};

export const cardKind = defineKind<CardData>({
  component: CardPreview,
  editComponent: CardEdit,
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
  // Match text: opt out of library `contain: size` so content can grow CSS tracks.
  editWrapperClass: 'bg-base-100! contain-none!',
  previewWrapperClass: 'bg-base-100! rounded-box overflow-hidden contain-none!',
});
