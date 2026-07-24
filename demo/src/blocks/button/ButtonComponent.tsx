import type { CSSProperties } from 'react';
import type { EditRendererProps, PreviewRendererProps } from 'vantage';
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

function ButtonBody({ item }: { item: PreviewRendererProps<ButtonData>['item'] }) {
  const data = item.data ?? {};

  return (
    <div
      className="flex h-full w-full"
      style={{
        justifyContent: H_ALIGN[data.align ?? 'center'],
        alignItems: V_ALIGN[data.vAlign ?? 'center'],
      }}
    >
      <button type="button" className="btn btn-sm btn-primary">
        {data.cta ?? item.label ?? 'Button'}
      </button>
    </div>
  );
}

export function ButtonPreview({ item }: PreviewRendererProps<ButtonData>) {
  return <ButtonBody item={item} />;
}

export function ButtonEdit({ item }: EditRendererProps<ButtonData>) {
  return <ButtonBody item={item} />;
}
