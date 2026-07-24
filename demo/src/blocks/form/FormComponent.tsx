import type { EditRendererProps, PreviewRendererProps } from 'vantage';
import { StatefulForm, type FormData } from './StatefulForm';

export function FormPreview({ item }: PreviewRendererProps<FormData>) {
  return <StatefulForm item={item} />;
}

export function FormEdit({ item }: EditRendererProps<FormData>) {
  return <StatefulForm item={item} />;
}
