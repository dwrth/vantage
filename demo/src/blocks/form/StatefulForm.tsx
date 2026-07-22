import { useState } from 'react';
import type { GridItem } from 'vantage';

export type FormData = {
  title?: string;
  content?: string;
  placeholder?: string;
  cta?: string;
  /** `overlay` = white text for use on dark / image backgrounds. */
  variant?: 'default' | 'overlay';
};

type StatefulFormProps = {
  item: GridItem<FormData>;
  interactive?: boolean;
};

export function StatefulForm({ item, interactive = false }: StatefulFormProps) {
  const data = item.data ?? {};
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const trimmed = value.trim();
  const isValidEmail = /.+@.+\..+/.test(trimmed);
  const stop = interactive ? (e: React.SyntheticEvent) => e.stopPropagation() : undefined;
  const overlay = data.variant === 'overlay';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail) return;
    setSubmitted(true);
  };

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 ${
        overlay ? 'text-white [text-shadow:0_1px_2px_rgb(0_0_0_/_0.45)]' : ''
      }`}
    >
      {data.title ? (
        <h3 className="m-0 text-base font-semibold tracking-tight">{data.title}</h3>
      ) : null}
      {data.content ? (
        <p
          className={`m-0 text-sm leading-relaxed ${overlay ? 'text-white/85' : 'text-base-content/70'}`}
        >
          {data.content}
        </p>
      ) : null}

      {submitted ? (
        <div role="alert" className="alert alert-success alert-soft">
          <span>
            Thanks — we&apos;ll reach <strong>{trimmed}</strong> soon.
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onPointerDown={stop}
            onClick={(e) => {
              stop?.(e);
              setSubmitted(false);
              setValue('');
            }}
          >
            Sign up another
          </button>
        </div>
      ) : (
        <form className="join w-full" onSubmit={onSubmit}>
          <input
            type="email"
            className="input input-sm join-item min-w-0 flex-1"
            placeholder={data.placeholder ?? 'you@example.com'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPointerDown={stop}
            onClick={stop}
          />
          <button
            type="submit"
            className="btn btn-sm btn-primary join-item"
            disabled={!isValidEmail}
            onPointerDown={stop}
            onClick={stop}
          >
            {data.cta ?? 'Submit'}
          </button>
        </form>
      )}
    </div>
  );
}
