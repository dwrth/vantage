import type { InspectorProps } from 'vantage';
import type { ButtonAlign, ButtonData, ButtonVAlign } from './index';

const H_ALIGN: ButtonAlign[] = ['left', 'center', 'right'];
const V_ALIGN: ButtonVAlign[] = ['top', 'center', 'bottom'];

export function ButtonInspector({
  resolvedData,
  activeBreakpoint,
  onChange,
}: InspectorProps<ButtonData>) {
  return (
    <fieldset className="fieldset gap-3 p-0">
      <legend className="fieldset-legend px-0">Button settings</legend>
      <p className="label px-0">
        Breakpoint: <code className="font-mono text-primary">{activeBreakpoint}</code>
      </p>

      <label className="floating-label">
        <span>CTA text (base)</span>
        <input
          className="input input-sm w-full"
          value={resolvedData.cta ?? ''}
          placeholder="Get started"
          onChange={(e) => onChange({ cta: e.target.value }, { scope: 'base' })}
        />
      </label>

      <label className="floating-label">
        <span>Horizontal align</span>
        <select
          className="select select-sm w-full"
          value={resolvedData.align ?? 'center'}
          onChange={(e) => onChange({ align: e.target.value as ButtonAlign })}
        >
          {H_ALIGN.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="floating-label">
        <span>Vertical align</span>
        <select
          className="select select-sm w-full"
          value={resolvedData.vAlign ?? 'center'}
          onChange={(e) => onChange({ vAlign: e.target.value as ButtonVAlign })}
        >
          {V_ALIGN.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  );
}
