import { defineKind } from 'vantage';
import type { FormData } from './StatefulForm';
import { FormComponent } from './formComponent';
import s from './form.module.css';

export const formKind = defineKind<FormData>({
  component: FormComponent,
  defaults: {
    w: 6,
    h: 5,
    label: 'Form',
    data: {
      title: 'Stay in the loop',
      content: 'Get a monthly digest of new patterns, components, and templates.',
      placeholder: 'you@example.com',
      cta: 'Subscribe',
    },
  },
  displayName: 'Form',
  editWrapperClass: s.editWrapper,
  previewWrapperClass: s.previewWrapper,
});
