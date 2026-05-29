import type { ItemRendererProps } from 'vantage';
import { StatefulForm, type FormData } from './StatefulForm';
import s from './form.module.css';

function FormEdit({ item, interactive }: ItemRendererProps<FormData>) {
  return (
    <div className={s.content}>
      <StatefulForm item={item} interactive={interactive} />
    </div>
  );
}

function FormPreview({ item }: ItemRendererProps<FormData>) {
  return <StatefulForm item={item} />;
}

export function FormComponent(props: ItemRendererProps<FormData>) {
  return props.mode === 'preview' ? (
    <FormPreview {...props} />
  ) : (
    <FormEdit {...props} interactive={props.interactive} />
  );
}
