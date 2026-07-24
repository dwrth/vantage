import { useMemo, type ReactNode } from 'react';
import type { SelectionRef } from '../context/BuilderContext';
import { diffLayouts, type LayoutChangeset } from '../lib/diff';
import { resolveSelectedItem, type ResolvedSelection } from '../lib/inspector';
import { updateItemData } from '../mutations/layout';
import { vantageRootProps } from '../theme/applyRoot';
import { useVantageTokens } from '../theme/useVantageTokens';
import '../styles/tokens.css';
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
  onChange: (next: Layout, changeset: LayoutChangeset) => void;
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
  const tokens = useVantageTokens();
  const resolved = useMemo(
    () => resolveSelectedItem(layout, selection, components, activeBreakpoint),
    [layout, selection, components, activeBreakpoint],
  );

  if (!resolved) {
    const root = vantageRootProps(tokens, className);
    return (
      <div className={root.className} style={root.style}>
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

  const root = vantageRootProps(tokens, className, {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  });

  return (
    <div className={root.className} style={root.style}>
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
              const next = updateItemData(layout, section.id, item.id, patch, breakpoint);
              onChange(next, diffLayouts(layout, next));
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
