import type { ItemRendererProps } from 'vantage';
import type { InputData } from './index';

export function InputComponent({ item, mode, interactive }: ItemRendererProps<InputData>) {
  const data = item.data ?? {};
  const stop = mode === 'edit' && interactive;

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
