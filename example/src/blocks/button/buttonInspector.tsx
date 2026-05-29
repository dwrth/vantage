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
    <section
      style={{
        display: 'grid',
        gap: '0.75rem',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '0.75rem',
        background: '#ffffff',
      }}
    >
      <header>
        <strong style={{ fontSize: '0.9rem' }}>Button settings</strong>
        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
          Breakpoint: <code>{activeBreakpoint}</code>
        </div>
      </header>
      <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.8rem' }}>
        CTA text (base)
        <input
          value={resolvedData.cta ?? ''}
          placeholder="Get started"
          onChange={(e) => onChange({ cta: e.target.value }, { scope: 'base' })}
          style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.45rem 0.5rem' }}
        />
      </label>
      <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.8rem' }}>
        Horizontal align
        <select
          value={resolvedData.align ?? 'center'}
          onChange={(e) => onChange({ align: e.target.value as ButtonAlign })}
          style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.45rem 0.5rem' }}
        >
          {H_ALIGN.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.8rem' }}>
        Vertical align
        <select
          value={resolvedData.vAlign ?? 'center'}
          onChange={(e) => onChange({ vAlign: e.target.value as ButtonVAlign })}
          style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.45rem 0.5rem' }}
        >
          {V_ALIGN.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
