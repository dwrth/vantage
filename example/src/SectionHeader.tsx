import { useMemo } from 'react';
import {
  addItem,
  removeSection,
  resolveDescriptorForKind,
  resolveRegistry,
  resolveSection,
  setSectionOverride,
  updateSection,
  type Breakpoint,
  type ComponentRegistry,
  type Layout,
  type Section,
} from 'vantage';
import s from './sectionHeader.module.css';

type SectionHeaderProps = {
  layout: Layout;
  onChange: (layout: Layout) => void;
  components: ComponentRegistry;
  section: Section;
  activeBreakpoint: Breakpoint;
};

export function SectionHeader({
  layout,
  onChange,
  components,
  section,
  activeBreakpoint,
}: SectionHeaderProps) {
  const resolved = resolveSection(section, activeBreakpoint, layout.breakpoints);
  const { columns, colGap, rowGap, paddingTop, paddingBottom } = resolved;
  const kinds = useMemo(() => Object.keys(components), [components]);
  const resolvedRegistry = useMemo(() => resolveRegistry(components), [components]);

  const setNumber = (
    key: 'columns' | 'colGap' | 'rowGap' | 'paddingTop' | 'paddingBottom',
    min: number,
    value: string,
  ) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    const next = Math.max(min, Math.round(num));
    if (activeBreakpoint === 'desktop') {
      onChange(updateSection(layout, section.id, { [key]: next }));
      return;
    }
    onChange(setSectionOverride(layout, section.id, activeBreakpoint, { [key]: next }));
  };

  const kindLabel = (kind: string) => {
    const descriptor = resolveDescriptorForKind(resolvedRegistry, kind);
    return descriptor?.displayName ?? kind.charAt(0).toUpperCase() + kind.slice(1);
  };

  const onAddItem = (kind: string) => {
    const descriptor = resolveDescriptorForKind(resolvedRegistry, kind);
    onChange(addItem(layout, section.id, kind, descriptor?.defaults));
  };

  return (
    <header className={s.header}>
      <input
        className={s.label}
        value={section.label ?? ''}
        onChange={(e) => onChange(updateSection(layout, section.id, { label: e.target.value }))}
        placeholder="Section"
      />
      <div className={s.controls}>
        <label className={s.field}>
          Cols
          <input
            type="number"
            min={1}
            max={24}
            value={columns}
            onChange={(e) => setNumber('columns', 1, e.target.value)}
          />
        </label>
        <label className={s.field}>
          Col gap
          <input
            type="number"
            min={0}
            max={64}
            value={colGap}
            onChange={(e) => setNumber('colGap', 0, e.target.value)}
          />
        </label>
        <label className={s.field}>
          Row gap
          <input
            type="number"
            min={0}
            max={64}
            value={rowGap}
            onChange={(e) => setNumber('rowGap', 0, e.target.value)}
          />
        </label>
        <label className={s.field}>
          Pad top
          <input
            type="number"
            min={0}
            max={240}
            value={paddingTop}
            onChange={(e) => setNumber('paddingTop', 0, e.target.value)}
          />
        </label>
        <label className={s.field}>
          Pad bottom
          <input
            type="number"
            min={0}
            max={240}
            value={paddingBottom}
            onChange={(e) => setNumber('paddingBottom', 0, e.target.value)}
          />
        </label>
      </div>
      <div className={s.actions}>
        {kinds.map((kind) => (
          <button key={kind} type="button" onClick={() => onAddItem(kind)}>
            + {kindLabel(kind)}
          </button>
        ))}
        <button
          type="button"
          className={s.delete}
          onClick={() => onChange(removeSection(layout, section.id))}
          aria-label="Delete section"
        >
          ×
        </button>
      </div>
    </header>
  );
}
