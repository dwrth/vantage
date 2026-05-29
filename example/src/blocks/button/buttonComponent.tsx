import type { CSSProperties } from 'react';
import type { ItemRendererProps } from 'vantage';
import type { ButtonAlign, ButtonData, ButtonVAlign } from './index';
import s from './button.module.css';

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

function rootStyle(data: ButtonData): CSSProperties {
  return {
    justifyContent: H_ALIGN[data.align ?? 'center'],
    alignItems: V_ALIGN[data.vAlign ?? 'center'],
  };
}

function ButtonEdit({ item, interactive }: ItemRendererProps<ButtonData>) {
  const data = item.data ?? {};
  return (
    <div className={s.root} style={rootStyle(data)}>
      <button
        type="button"
        className={s.surface}
        onClick={interactive ? (e) => e.stopPropagation() : undefined}
        onPointerDown={interactive ? (e) => e.stopPropagation() : undefined}
      >
        {data.cta ?? item.label ?? 'Button'}
      </button>
    </div>
  );
}

function ButtonPreview({ item }: ItemRendererProps<ButtonData>) {
  const data = item.data ?? {};
  return (
    <div className={s.root} style={rootStyle(data)}>
      <button type="button" className={s.surface}>
        {data.cta ?? item.label ?? 'Button'}
      </button>
    </div>
  );
}

export function ButtonComponent(props: ItemRendererProps<ButtonData>) {
  return props.mode === 'preview' ? (
    <ButtonPreview {...props} />
  ) : (
    <ButtonEdit {...props} interactive={props.interactive} />
  );
}
