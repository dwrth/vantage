import { useMemo } from 'react';
import {
  resolveSelectedItem,
  updateItemData,
  type Breakpoint,
  type ComponentRegistry,
  type Layout,
  type SelectionRef,
} from 'vantage';

type ItemInspectorProps = {
  layout: Layout;
  onChange: (next: Layout) => void;
  components: ComponentRegistry;
  selection: SelectionRef | null;
  activeBreakpoint: Breakpoint;
};

export function ItemInspector({
  layout,
  onChange,
  components,
  selection,
  activeBreakpoint,
}: ItemInspectorProps) {
  const resolved = useMemo(
    () => resolveSelectedItem(layout, selection, components, activeBreakpoint),
    [layout, selection, components, activeBreakpoint],
  );

  if (!resolved) {
    return (
      <aside
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '0.75rem',
          background: '#f8fafc',
          color: '#6b7280',
          fontSize: '0.85rem',
        }}
      >
        Select a block to inspect settings.
      </aside>
    );
  }

  const { section, item, resolvedData, descriptor } = resolved;
  const Inspector = descriptor?.inspector;

  return (
    <aside
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '0.75rem',
        background: '#f8fafc',
      }}
    >
      {Inspector ? (
        <Inspector
          item={item}
          resolvedData={resolvedData}
          section={section}
          activeBreakpoint={activeBreakpoint}
          onChange={(patch, opts) => {
            const scopeBreakpoint = opts?.scope === 'base' ? 'desktop' : activeBreakpoint;
            onChange(updateItemData(layout, section.id, item.id, patch, scopeBreakpoint));
          }}
        />
      ) : (
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>
          No inspector for <code>{item.kind}</code>.
        </p>
      )}
    </aside>
  );
}
