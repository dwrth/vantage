import { defineKind } from 'vantage';
import type { FormData } from './StatefulForm';
import { FormEdit, FormPreview } from './FormComponent';

export const formKind = defineKind<FormData>({
  component: FormPreview,
  editComponent: FormEdit,
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
  editWrapperClass: 'bg-base-100!',
  previewWrapperClass: 'bg-base-100! rounded-box',
});
