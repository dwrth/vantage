import { defineKind } from 'vantage';
import { BlockEdit, BlockPreview } from './BlockComponent';

export type BlockData = Record<string, never>;

export const blockKind = defineKind<BlockData>({
  component: BlockPreview,
  editComponent: BlockEdit,
  defaults: { w: 3, h: 2, label: 'Block' },
  displayName: 'Block',
  previewWrapperClass: 'bg-transparent',
});
