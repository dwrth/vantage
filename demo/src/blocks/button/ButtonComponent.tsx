import type { CSSProperties } from 'react';
import type { ItemRendererProps } from 'vantage';
import type { ButtonAlign, ButtonData, ButtonVAlign } from './index';

const H_ALIGN: Record<ButtonAlign, CSSProperties['justifyContent']> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

const V_ALIGN: Record<ButtonVAlign, CSSProperties['alignItems']> = {
  top: 'flex-start',
  center: 'center',
  bottom: 'flex-end',
};

export function ButtonComponent({ item, mode, interactive }: ItemRendererProps<ButtonData>) {
  const data = item.data ?? {};
  const stop = mode === 'edit' && interactive;

  return (
    <div
      className="flex h-full w-full"
      style={{
        justifyContent: H_ALIGN[data.align ?? 'center'],
        alignItems: V_ALIGN[data.vAlign ?? 'center'],
      }}
    >
      <button
        type="button"
        className="btn btn-sm btn-primary"
        onClick={stop ? (e) => e.stopPropagation() : undefined}
        onPointerDown={stop ? (e) => e.stopPropagation() : undefined}
      >
        {data.cta ?? item.label ?? 'Button'}
      </button>
    </div>
  );
}
