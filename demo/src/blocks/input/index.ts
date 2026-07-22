import { defineKind } from 'vantage';
import { InputComponent } from './InputComponent';

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
  editWrapperClass: 'bg-base-100!',
  previewWrapperClass: 'bg-base-100! rounded-box p-3',
});
