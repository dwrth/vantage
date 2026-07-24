import { defineKind } from 'vantage';
import { ButtonEdit, ButtonPreview } from './ButtonComponent';
import { ButtonInspector } from './ButtonInspector';

export type ButtonAlign = 'left' | 'center' | 'right';
export type ButtonVAlign = 'top' | 'center' | 'bottom';

export type ButtonData = {
  cta?: string;
  align?: ButtonAlign;
  vAlign?: ButtonVAlign;
};

export const buttonKind = defineKind<ButtonData>({
  component: ButtonPreview,
  editComponent: ButtonEdit,
  inspector: ButtonInspector,
  defaults: { w: 3, h: 2, label: 'Button', data: { cta: 'Get started' } },
  displayName: 'Button',
  editWrapperClass: 'bg-transparent!',
  previewWrapperClass: 'bg-transparent!',
});
