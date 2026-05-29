import { defineKind } from 'vantage';
import { BlockComponent } from './blockComponent';
import s from './block.module.css';

export type BlockData = Record<string, never>;

export const blockKind = defineKind<BlockData>({
  component: BlockComponent,
  defaults: { w: 3, h: 2, label: 'Block' },
  displayName: 'Block',
  previewWrapperClass: s.previewWrapper,
});
