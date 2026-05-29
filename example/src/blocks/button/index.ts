import { defineKind } from 'vantage';
import { ButtonComponent } from './buttonComponent';
import { ButtonInspector } from './buttonInspector';
import s from './button.module.css';

export type ButtonAlign = 'left' | 'center' | 'right';
export type ButtonVAlign = 'top' | 'center' | 'bottom';

export type ButtonData = {
  cta?: string;
  align?: ButtonAlign;
  vAlign?: ButtonVAlign;
};

export const buttonKind = defineKind<ButtonData>({
  component: ButtonComponent,
  inspector: ButtonInspector,
  defaults: { w: 3, h: 2, label: 'Button', data: { cta: 'Get started' } },
  displayName: 'Button',
  editWrapperClass: s.editWrapper,
  previewWrapperClass: s.previewWrapper,
});
