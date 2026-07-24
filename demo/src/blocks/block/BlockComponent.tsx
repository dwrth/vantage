import type { FC } from 'react';
import type { EditRendererProps, PreviewRendererProps } from 'vantage';
import type { BlockData } from './index';

export const BlockPreview: FC<PreviewRendererProps<BlockData>> = () => null;

export function BlockEdit({ item }: EditRendererProps<BlockData>) {
  return (
    <div className="flex h-full items-center justify-center font-mono text-xs text-base-content/55">
      <span className="badge badge-ghost badge-sm">
        {item.w}×{item.h} @ ({item.x},{item.y})
      </span>
    </div>
  );
}
