import type { ItemRendererProps } from 'vantage';
import type { BlockData } from './index';

export function BlockComponent({ item, mode }: ItemRendererProps<BlockData>) {
  if (mode === 'preview') return null;
  return (
    <div className="flex h-full items-center justify-center font-mono text-xs text-base-content/55">
      <span className="badge badge-ghost badge-sm">
        {item.w}×{item.h} @ ({item.x},{item.y})
      </span>
    </div>
  );
}
