import type { ItemRendererProps } from 'vantage';
import { StatefulForm, type FormData } from './StatefulForm';

export function FormComponent({ item, mode, interactive }: ItemRendererProps<FormData>) {
  return <StatefulForm item={item} interactive={mode === 'edit' ? interactive : false} />;
}
