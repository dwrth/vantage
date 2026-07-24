import { useMemo, type ReactNode } from 'react';
import type { SelectionRef } from '../context/BuilderContext';
import { resolveSelectedItem, type ResolvedSelection } from '../lib/inspector';
import { updateItemData } from '../mutations/layout';
import type {
  Breakpoint,
  ComponentRegistry,
  InspectorScope,
  ItemDataChangeEvent,
  Layout,
} from '../types';

export type VantageInspectorProps = {
  layout: Layout;
  components: ComponentRegistry;
  selection: SelectionRef | null;
  activeBreakpoint: Breakpoint;
  onChange: (layout: Layout) => void;
  onItemDataChange?: (event: ItemDataChangeEvent) => void;
  className?: string;
  emptyState?: ReactNode;
  renderHeader?: (ctx: ResolvedSelection) => ReactNode;
};

export function VantageInspector({
  layout,
  components,
  selection,
  activeBreakpoint,
  onChange,
  onItemDataChange,
  className,
  emptyState,
  renderHeader,
}: VantageInspectorProps) {
  const resolved = useMemo(
    () => resolveSelectedItem(layout, selection, components, activeBreakpoint),
    [layout, selection, components, activeBreakpoint],
  );

  if (!resolved) {
    return (
      <div className={className}>
        {emptyState ?? (
          <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', opacity: 0.6 }}>
            Select a block to inspect settings.
          </div>
        )}
      </div>
    );
  }

  const { section, item, resolvedData, descriptor } = resolved;
  const Inspector = descriptor?.inspector;
  const header = renderHeader ? (
    renderHeader(resolved)
  ) : (
    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', opacity: 0.7 }}>{item.kind}</div>
  );

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
    >
      {header}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.75rem' }}>
        {Inspector ? (
          <Inspector
            item={item}
            resolvedData={resolvedData}
            section={section}
            activeBreakpoint={activeBreakpoint}
            onChange={(patch, opts) => {
              const scope: InspectorScope = opts?.scope ?? 'active';
              const breakpoint = scope === 'base' ? 'desktop' : activeBreakpoint;
              const dirty = opts?.dirty ?? true;
              onChange(updateItemData(layout, section.id, item.id, patch, breakpoint));
              onItemDataChange?.({
                sectionId: section.id,
                itemId: item.id,
                patch,
                breakpoint,
                scope,
                dirty,
              });
            }}
          />
        ) : (
          <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>
            No inspector for <code>{item.kind}</code>.
          </p>
        )}
      </div>
    </div>
  );
}
