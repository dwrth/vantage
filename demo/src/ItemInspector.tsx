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
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-base-content/50">
        Select a block to inspect settings.
      </div>
    );
  }

  const { section, item, resolvedData, descriptor } = resolved;
  const Inspector = descriptor?.inspector;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-base-300/50 px-3 py-2">
        <span className="text-xs font-semibold tracking-wider text-base-content/60 uppercase">
          Item
        </span>
        <span className="badge badge-soft badge-sm font-mono">{item.kind}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
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
          <p className="text-sm text-base-content/50">
            No inspector for <code className="font-mono text-primary">{item.kind}</code>.
          </p>
        )}
      </div>
    </div>
  );
}
