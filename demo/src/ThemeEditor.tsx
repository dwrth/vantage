import { useMemo, useState } from 'react';
import type { VantageTokens } from 'vantage';
import { DEMO_TOKEN_DEFAULTS } from './demoTokens';

type PxField = {
  key: string;
  label: string;
  kind: 'px';
  min: number;
  max: number;
};

type ColorField = {
  key: string;
  label: string;
  kind: 'color';
};

type Field = PxField | ColorField;

const FIELDS: Field[] = [
  { key: '--vantage-cell-max-px', label: 'Cell max', kind: 'px', min: 24, max: 200 },
  { key: '--vantage-row-max-px', label: 'Row max', kind: 'px', min: 16, max: 120 },
  { key: '--vantage-color', label: 'Root color', kind: 'color' },
  { key: '--vantage-kind-accent', label: 'Kind accent', kind: 'color' },
  { key: '--vantage-kind-accent-fg', label: 'Kind accent fg', kind: 'color' },
];

type ThemeEditorProps = {
  tokens: VantageTokens;
  onChange: (next: VantageTokens) => void;
};

function parsePx(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function expandShortHex(hex: string): string {
  const s = hex.slice(1);
  return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
}

function rgbStringToHex(rgb: string): string | null {
  const match = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(rgb);
  if (!match) return null;
  const toByte = (v: string) => Math.max(0, Math.min(255, Math.round(Number(v))));
  const hex = [match[1], match[2], match[3]]
    .map((c) => toByte(c).toString(16).padStart(2, '0'))
    .join('');
  return `#${hex}`;
}

/** Resolve any CSS color (hex, named, var(...)) to `#rrggbb` for `<input type="color">`. */
function resolveToHex(cssColor: string, fallback = '#000000'): string {
  const trimmed = cssColor.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) return expandShortHex(trimmed).toLowerCase();
  if (typeof document === 'undefined') return fallback;

  const el = document.createElement('span');
  el.style.color = trimmed;
  el.style.position = 'absolute';
  el.style.visibility = 'hidden';
  el.style.pointerEvents = 'none';
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  document.body.removeChild(el);
  return rgbStringToHex(computed) ?? fallback;
}

function ColorTokenControl({
  label,
  tokenKey,
  value,
  onChange,
}: {
  label: string;
  tokenKey: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const hex = useMemo(() => resolveToHex(value, '#000000'), [value]);
  const [draft, setDraft] = useState<string | null>(null);
  const isLinkedVar = value.trim().startsWith('var(');
  const shown = draft ?? hex;

  const commitHex = (raw: string) => {
    const next = raw.trim();
    if (/^#[0-9a-f]{6}$/i.test(next)) {
      onChange(next.toLowerCase());
      setDraft(null);
      return;
    }
    if (/^#[0-9a-f]{3}$/i.test(next)) {
      onChange(expandShortHex(next).toLowerCase());
      setDraft(null);
      return;
    }
    setDraft(null);
  };

  return (
    <div className="form-control w-full">
      <div className="label py-1">
        <span className="label-text text-xs">{label}</span>
        <span className="label-text-alt font-mono text-[10px] opacity-50">{tokenKey}</span>
      </div>
      <div className="join w-full">
        <input
          type="color"
          className="join-item h-8 w-12 cursor-pointer border border-base-300 bg-base-100 p-1"
          value={hex}
          aria-label={label}
          onChange={(e) => {
            setDraft(null);
            onChange(e.target.value);
          }}
        />
        <input
          type="text"
          className="input input-sm input-bordered join-item min-w-0 flex-1 font-mono text-xs uppercase"
          value={shown}
          spellCheck={false}
          maxLength={7}
          onFocus={() => setDraft(hex)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commitHex(shown)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
      </div>
      {isLinkedVar ? (
        <p className="mt-1 text-[10px] text-base-content/40">
          Was <code className="font-mono">{value}</code> — picker writes hex.
        </p>
      ) : null}
    </div>
  );
}

export function ThemeEditor({ tokens, onChange }: ThemeEditorProps) {
  const setToken = (key: string, value: string) => {
    onChange({ ...tokens, [key]: value });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-base-300/50 px-3 py-2">
        <span className="text-xs font-semibold tracking-wider text-base-content/60 uppercase">
          Theme
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => onChange({ ...DEMO_TOKEN_DEFAULTS })}
        >
          Reset
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <p className="text-xs text-base-content/50">
          Edits <code className="font-mono">VantageThemeProvider</code> tokens. Grid density +
          button accent update live.
        </p>

        {FIELDS.map((field) => {
          if (field.kind === 'px') {
            const fallback = parsePx(DEMO_TOKEN_DEFAULTS[field.key], 0);
            const value = parsePx(tokens[field.key], fallback);
            return (
              <label key={field.key} className="form-control w-full">
                <span className="label py-1">
                  <span className="label-text text-xs">{field.label}</span>
                  <span className="label-text-alt font-mono text-[10px] opacity-50">
                    {field.key}
                  </span>
                </span>
                <input
                  type="range"
                  className="range range-xs range-primary"
                  min={field.min}
                  max={field.max}
                  value={value}
                  onChange={(e) => setToken(field.key, `${e.target.value}px`)}
                />
                <div className="mt-1 flex justify-between font-mono text-[10px] text-base-content/40">
                  <span>{field.min}px</span>
                  <span>{value}px</span>
                  <span>{field.max}px</span>
                </div>
              </label>
            );
          }

          return (
            <ColorTokenControl
              key={field.key}
              label={field.label}
              tokenKey={field.key}
              value={tokens[field.key] ?? DEMO_TOKEN_DEFAULTS[field.key] ?? '#000000'}
              onChange={(next) => setToken(field.key, next)}
            />
          );
        })}
      </div>
    </div>
  );
}
