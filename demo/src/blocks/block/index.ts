import { defineKind } from 'vantage';
import { BlockComponent } from './BlockComponent';

export type BlockData = Record<string, never>;

export const blockKind = defineKind<BlockData>({
  component: BlockComponent,
  defaults: { w: 3, h: 2, label: 'Block' },
  displayName: 'Block',
  previewWrapperClass: 'bg-transparent',
});
