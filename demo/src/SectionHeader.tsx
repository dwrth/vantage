import { useMemo } from 'react';
import {
  addItem,
  emitLayoutChange,
  removeSection,
  resolveDescriptorForKind,
  resolveRegistry,
  resolveSection,
  setSectionOverride,
  updateSection,
  type Breakpoint,
  type ComponentRegistry,
  type Layout,
  type LayoutChangeset,
  type Section,
} from 'vantage';

type SectionHeaderProps = {
  layout: Layout;
  onChange: (next: Layout, changeset: LayoutChangeset) => void;
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
      emitLayoutChange(layout, updateSection(layout, section.id, { [key]: next }), onChange);
      return;
    }
    emitLayoutChange(
      layout,
      setSectionOverride(layout, section.id, activeBreakpoint, { [key]: next }),
      onChange,
    );
  };

  const kindLabel = (kind: string) => {
    const descriptor = resolveDescriptorForKind(resolvedRegistry, kind);
    return descriptor?.displayName ?? kind.charAt(0).toUpperCase() + kind.slice(1);
  };

  return (
    <header className="mb-2 flex flex-wrap items-center gap-2 rounded-box border border-base-300/50 bg-base-200/70 p-2 backdrop-blur-sm">
      <input
        className="input input-sm input-ghost min-w-28 max-w-48 font-semibold"
        value={section.label ?? ''}
        onChange={(e) =>
          emitLayoutChange(
            layout,
            updateSection(layout, section.id, { label: e.target.value }),
            onChange,
          )
        }
        placeholder="Section"
      />

      <div className="divider divider-horizontal mx-0 h-6" />

      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            ['Cols', 'columns', 1, 24, columns],
            ['Col gap', 'colGap', 0, 64, colGap],
            ['Row gap', 'rowGap', 0, 64, rowGap],
            ['Pad top', 'paddingTop', 0, 240, paddingTop],
            ['Pad bot', 'paddingBottom', 0, 240, paddingBottom],
          ] as const
        ).map(([label, key, min, max, value]) => (
          <label key={key} className="input input-xs w-22">
            <span className="label text-[10px]">{label}</span>
            <input
              type="number"
              min={min}
              max={max}
              value={value}
              onChange={(e) => setNumber(key, min, e.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="divider divider-horizontal mx-0 h-6" />

      <div className="flex flex-wrap gap-1">
        {kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => {
              const descriptor = resolveDescriptorForKind(resolvedRegistry, kind);
              emitLayoutChange(
                layout,
                addItem(layout, section.id, kind, descriptor?.defaults),
                onChange,
              );
            }}
          >
            + {kindLabel(kind)}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-xs text-error"
          onClick={() => emitLayoutChange(layout, removeSection(layout, section.id), onChange)}
          aria-label="Delete section"
        >
          ×
        </button>
      </div>
    </header>
  );
}
