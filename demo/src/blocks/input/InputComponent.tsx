import type { EditRendererProps, PreviewRendererProps } from 'vantage';
import type { InputData } from './index';

function InputBody({ item }: { item: PreviewRendererProps<InputData>['item'] }) {
  const data = item.data ?? {};

  return (
    <label className="flex flex-col justify-center gap-1.5 p-3">
      <span className="text-xs font-medium tracking-wide text-base-content/60 uppercase">
        {data.title ?? 'Label'}
      </span>
      <input type="text" className="input input-sm w-full" placeholder={data.placeholder ?? ''} />
    </label>
  );
}

export function InputPreview({ item }: PreviewRendererProps<InputData>) {
  return <InputBody item={item} />;
}

export function InputEdit({ item }: EditRendererProps<InputData>) {
  return <InputBody item={item} />;
}
