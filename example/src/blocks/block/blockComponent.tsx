import type { ItemRendererProps } from 'vantage';
import type { BlockData } from './index';
import s from './block.module.css';

function BlockEdit({ item }: ItemRendererProps<BlockData>) {
  return (
    <div className={s.coords}>
      {item.w}×{item.h} @ ({item.x},{item.y})
    </div>
  );
}

function BlockPreview() {
  return null;
}

export function BlockComponent(props: ItemRendererProps<BlockData>) {
  return props.mode === 'preview' ? <BlockPreview /> : <BlockEdit {...props} />;
}
