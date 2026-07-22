import type { ComponentRegistry } from 'vantage';
import { blockKind } from './block';
import { buttonKind } from './button';
import { cardKind } from './card';
import { formKind } from './form';
import { imageKind } from './image';
import { inputKind } from './input';
import { textKind } from './text';

export const demoComponents: ComponentRegistry = {
  block: blockKind,
  text: textKind,
  image: imageKind,
  button: buttonKind,
  input: inputKind,
  form: formKind,
  card: cardKind,
};

export { blockKind, textKind, imageKind, buttonKind, inputKind, formKind, cardKind };
