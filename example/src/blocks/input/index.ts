import { defineKind } from 'vantage';
import { InputComponent } from './inputComponent';
import s from './input.module.css';

export type InputData = {
  title?: string;
  placeholder?: string;
};

export const inputKind = defineKind<InputData>({
  component: InputComponent,
  defaults: {
    w: 4,
    h: 3,
    label: 'Input',
    data: { title: 'Email address', placeholder: 'you@example.com' },
  },
  displayName: 'Input',
  editWrapperClass: s.editWrapper,
  previewWrapperClass: s.previewWrapper,
});
