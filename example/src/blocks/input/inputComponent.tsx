import type { ItemRendererProps } from 'vantage';
import type { InputData } from './index';
import s from './input.module.css';
import ui from '../ui.module.css';

function InputEdit({ item, interactive }: ItemRendererProps<InputData>) {
  const data = item.data ?? {};
  return (
    <div className={s.content}>
      <label className={ui.field}>
        <span className={ui.fieldLabel}>{data.title ?? 'Label'}</span>
        <input
          type="text"
          className={ui.input}
          placeholder={data.placeholder ?? ''}
          onPointerDown={interactive ? (e) => e.stopPropagation() : undefined}
          onClick={interactive ? (e) => e.stopPropagation() : undefined}
        />
      </label>
    </div>
  );
}

function InputPreview({ item }: ItemRendererProps<InputData>) {
  const data = item.data ?? {};
  return (
    <label className={ui.field}>
      <span className={ui.fieldLabel}>{data.title ?? 'Label'}</span>
      <input type="text" className={ui.input} placeholder={data.placeholder ?? ''} />
    </label>
  );
}

export function InputComponent(props: ItemRendererProps<InputData>) {
  return props.mode === 'preview' ? (
    <InputPreview {...props} />
  ) : (
    <InputEdit {...props} interactive={props.interactive} />
  );
}
