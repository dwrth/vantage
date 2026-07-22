import type { InspectorProps } from 'vantage';
import type { TextAlign, TextData, TextFontSize, TextFontWeight, TextVariant } from './types';
import { TEXT_ALIGNS, TEXT_FONT_SIZES, TEXT_FONT_WEIGHTS } from './types';

function normalizeColor(input: string | undefined): string {
  if (!input) return '#1f2937';
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  return '#1f2937';
}

export function TextInspector({
  resolvedData,
  activeBreakpoint,
  onChange,
}: InspectorProps<TextData>) {
  return (
    <fieldset className="fieldset gap-3 p-0">
      <legend className="fieldset-legend px-0">Text settings</legend>
      <p className="label px-0">
        Breakpoint: <code className="font-mono text-primary">{activeBreakpoint}</code>
      </p>

      <label className="form-control w-full">
        <span className="label text-xs">Title (base)</span>
        <input
          className="input input-sm w-full"
          value={resolvedData.title ?? ''}
          placeholder="Headline"
          onChange={(e) => onChange({ title: e.target.value }, { scope: 'base' })}
        />
      </label>

      <label className="form-control w-full">
        <span className="label text-xs">Body (base)</span>
        <textarea
          className="textarea textarea-sm w-full min-h-24"
          value={resolvedData.content ?? ''}
          placeholder="Supporting copy"
          onChange={(e) => onChange({ content: e.target.value }, { scope: 'base' })}
        />
      </label>

      <div className="divider my-0 text-xs">Style</div>

      <fieldset className="fieldset p-0">
        <legend className="fieldset-legend px-0 text-xs">Variant</legend>
        <div className="join w-full">
          {(
            [
              ['default', 'Default'],
              ['overlay', 'Overlay'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`btn btn-sm join-item flex-1 ${
                (resolvedData.variant ?? 'default') === value ? 'btn-active' : ''
              }`}
              onClick={() => onChange({ variant: value as TextVariant })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="label px-0 text-[11px]">Overlay = white text + shadow (unless color set)</p>
      </fieldset>

      <label className="form-control w-full">
        <span className="label text-xs">Color</span>
        <div className="join w-full">
          <input
            type="color"
            className="join-item h-8 w-10 cursor-pointer border border-base-300 bg-base-100 p-1"
            value={normalizeColor(resolvedData.color)}
            onChange={(e) => onChange({ color: e.target.value })}
          />
          <input
            type="text"
            className="input input-sm join-item min-w-0 flex-1 font-mono"
            placeholder="theme default"
            value={resolvedData.color ?? ''}
            onChange={(e) => onChange({ color: e.target.value || undefined })}
          />
          <button
            type="button"
            className="btn btn-sm join-item"
            title="Clear color"
            onClick={() => onChange({ color: undefined })}
          >
            ×
          </button>
        </div>
      </label>

      <label className="form-control w-full">
        <span className="label text-xs">Font size</span>
        <select
          className="select select-sm w-full"
          value={resolvedData.fontSize ?? 'base'}
          onChange={(e) => onChange({ fontSize: e.target.value as TextFontSize })}
        >
          {TEXT_FONT_SIZES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="form-control w-full">
        <span className="label text-xs">Weight</span>
        <select
          className="select select-sm w-full"
          value={resolvedData.fontWeight ?? 'normal'}
          onChange={(e) => onChange({ fontWeight: e.target.value as TextFontWeight })}
        >
          {TEXT_FONT_WEIGHTS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="label cursor-pointer justify-start gap-3 px-0">
        <input
          type="checkbox"
          className="checkbox checkbox-sm checkbox-primary"
          checked={Boolean(resolvedData.italic)}
          onChange={(e) => onChange({ italic: e.target.checked || undefined })}
        />
        <span className="text-sm">Italic</span>
      </label>

      <fieldset className="fieldset p-0">
        <legend className="fieldset-legend px-0 text-xs">Align</legend>
        <div className="join w-full">
          {TEXT_ALIGNS.map((value) => (
            <button
              key={value}
              type="button"
              className={`btn btn-sm join-item flex-1 ${
                (resolvedData.align ?? 'left') === value ? 'btn-active' : ''
              }`}
              onClick={() => onChange({ align: value as TextAlign })}
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>
    </fieldset>
  );
}
