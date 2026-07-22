export type TextVariant = 'default' | 'overlay';

export type TextFontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';

export type TextFontWeight = 'normal' | 'medium' | 'semibold' | 'bold';

export type TextAlign = 'left' | 'center' | 'right';

export type TextData = {
  title?: string;
  content?: string;
  /** `overlay` swaps to white text + drop shadow for use on top of images. */
  variant?: TextVariant;
  color?: string;
  fontSize?: TextFontSize;
  fontWeight?: TextFontWeight;
  italic?: boolean;
  align?: TextAlign;
};

export const TEXT_FONT_SIZES: TextFontSize[] = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'];

export const TEXT_FONT_WEIGHTS: TextFontWeight[] = ['normal', 'medium', 'semibold', 'bold'];

export const TEXT_ALIGNS: TextAlign[] = ['left', 'center', 'right'];

export const FONT_SIZE_PX: Record<TextFontSize, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};

export const FONT_WEIGHT_VALUE: Record<TextFontWeight, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};
