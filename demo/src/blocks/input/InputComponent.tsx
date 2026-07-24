import type { EditRendererProps, PreviewRendererProps } from 'vantage';
import type { InputData } from './index';

function InputBody({
  item,
  stop,
}: {
  item: PreviewRendererProps<InputData>['item'];
  stop?: boolean;
}) {
  const data = item.data ?? {};

  return (
    <label className="flex min-h-0 flex-1 flex-col justify-center gap-1.5 overflow-hidden p-3">
      <span className="text-xs font-medium tracking-wide text-base-content/60 uppercase">
        {data.title ?? 'Label'}
      </span>
      <input
        type="text"
        className="input input-sm w-full"
        placeholder={data.placeholder ?? ''}
        onPointerDown={stop ? (e) => e.stopPropagation() : undefined}
        onClick={stop ? (e) => e.stopPropagation() : undefined}
      />
    </label>
  );
}

export function InputPreview({ item }: PreviewRendererProps<InputData>) {
  return <InputBody item={item} />;
}

export function InputEdit({ item, interactive }: EditRendererProps<InputData>) {
  return <InputBody item={item} stop={interactive} />;
}
