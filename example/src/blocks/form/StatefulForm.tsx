import { useState } from 'react';
import type { GridItem } from 'vantage';
import ui from '../ui.module.css';

export type FormData = {
  title?: string;
  content?: string;
  placeholder?: string;
  cta?: string;
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail) return;
    setSubmitted(true);
  };

  const reset = () => {
    setSubmitted(false);
    setValue('');
  };

  return (
    <>
      {data.title && <h3 className={ui.formTitle}>{data.title}</h3>}
      {data.content && <p className={ui.formBody}>{data.content}</p>}
      {submitted ? (
        <div className={ui.formSuccess} role="status" aria-live="polite">
          <p className={ui.formSuccessText}>
            Thanks — we&apos;ll reach <strong>{trimmed}</strong> soon.
          </p>
          <button
            type="button"
            className={ui.button}
            onPointerDown={stop}
            onClick={(e) => {
              stop?.(e);
              reset();
            }}
          >
            Sign up another
          </button>
        </div>
      ) : (
        <form className={ui.formRow} onSubmit={onSubmit}>
          <input
            type="email"
            className={ui.input}
            placeholder={data.placeholder ?? 'you@example.com'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPointerDown={stop}
            onClick={stop}
          />
          <button
            type="submit"
            className={`${ui.button} ${ui.buttonPrimary}`}
            disabled={!isValidEmail}
            onPointerDown={stop}
            onClick={stop}
          >
            {data.cta ?? 'Submit'}
          </button>
        </form>
      )}
    </>
  );
}
