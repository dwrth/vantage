import { useRef } from 'react';
import {
  BREAKPOINTS,
  clearLayout,
  emitLayoutChange,
  exportLayout,
  getBreakpointPreviewWidths,
  getBreakpointWidths,
  importLayout,
  isValidLayout,
  setBreakpointPreviewWidth,
  setBreakpointWidth,
  setLayoutBreakpoints,
  type Breakpoint,
  type Layout,
  type LayoutChangeset,
} from 'vantage';

const BREAKPOINT_LABELS: Record<Breakpoint, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
};

type ToolbarProps = {
  layout: Layout;
  onChange: (next: Layout, changeset: LayoutChangeset) => void;
  /** Clear / Sample / Import — bypasses history stack (host calls `reset`). */
  onBaselineChange: (next: Layout) => void;
  onLoadSample: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  activeBreakpoint: Breakpoint;
  onActiveBreakpointChange: (next: Breakpoint) => void;
};

export function Toolbar({
  layout,
  onChange,
  onBaselineChange,
  onLoadSample,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  activeBreakpoint,
  onActiveBreakpointChange,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const enabledBreakpoints = layout.breakpoints;
  const visibleBreakpoints = BREAKPOINTS.filter((bp) => enabledBreakpoints.includes(bp));
  const breakpointWidths = getBreakpointWidths(layout);
  const previewWidths = getBreakpointPreviewWidths(layout);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(exportLayout(layout), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'layout.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!isValidLayout(data)) {
          alert('Invalid layout JSON');
          return;
        }
        onBaselineChange(importLayout(data as Layout));
      } catch {
        alert('Failed to parse JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const toggleTablet = () => {
    const hasTablet = enabledBreakpoints.includes('tablet');
    const next: Breakpoint[] = hasTablet
      ? enabledBreakpoints.filter((bp) => bp !== 'tablet')
      : [...enabledBreakpoints, 'tablet'];
    emitLayoutChange(layout, setLayoutBreakpoints(layout, next), onChange);
  };

  return (
    <header className="navbar min-h-14 gap-2 border-b border-base-300/60 bg-base-200/80 px-3 backdrop-blur-md">
      <div className="navbar-start gap-3">
        <div className="flex items-center gap-2">
          <span className="brand-pulse size-2 rounded-sm bg-primary" aria-hidden />
          <span className="text-lg font-semibold tracking-tight">
            Vantage<span className="text-primary">.</span>
          </span>
        </div>
        <span className="badge badge-soft badge-sm font-mono tracking-wider">DEMO</span>
      </div>

      <div className="navbar-center hidden flex-wrap items-center gap-2 lg:flex">
        <div role="tablist" className="tabs tabs-box tabs-sm">
          {visibleBreakpoints.map((bp) => (
            <button
              key={bp}
              type="button"
              role="tab"
              className={`tab ${activeBreakpoint === bp ? 'tab-active' : ''}`}
              aria-selected={activeBreakpoint === bp}
              onClick={() => onActiveBreakpointChange(bp)}
            >
              {BREAKPOINT_LABELS[bp]}
            </button>
          ))}
        </div>

        {enabledBreakpoints.includes('mobile') ? (
          <div className="join join-horizontal">
            <label className="input input-xs join-item w-28">
              <span className="label">≤</span>
              <input
                type="number"
                min={1}
                max={9999}
                value={breakpointWidths.mobile ?? 640}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  if (Number.isFinite(num))
                    emitLayoutChange(layout, setBreakpointWidth(layout, 'mobile', num), onChange);
                }}
              />
            </label>
            <label className="input input-xs join-item w-28">
              <span className="label">prev</span>
              <input
                type="number"
                min={1}
                max={9999}
                value={previewWidths.mobile ?? 390}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  if (Number.isFinite(num))
                    emitLayoutChange(
                      layout,
                      setBreakpointPreviewWidth(layout, 'mobile', num),
                      onChange,
                    );
                }}
              />
            </label>
          </div>
        ) : null}

        {enabledBreakpoints.includes('tablet') ? (
          <div className="join join-horizontal">
            <label className="input input-xs join-item w-28">
              <span className="label">≤</span>
              <input
                type="number"
                min={(breakpointWidths.mobile ?? 1) + 1}
                max={9999}
                value={breakpointWidths.tablet ?? 1023}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  if (Number.isFinite(num))
                    emitLayoutChange(layout, setBreakpointWidth(layout, 'tablet', num), onChange);
                }}
              />
            </label>
            <label className="input input-xs join-item w-28">
              <span className="label">prev</span>
              <input
                type="number"
                min={1}
                max={9999}
                value={previewWidths.tablet ?? 768}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  if (Number.isFinite(num))
                    emitLayoutChange(
                      layout,
                      setBreakpointPreviewWidth(layout, 'tablet', num),
                      onChange,
                    );
                }}
              />
            </label>
          </div>
        ) : null}

        <label className="label cursor-pointer gap-2">
          <span className="text-xs">Tablet</span>
          <input
            type="checkbox"
            className="toggle toggle-xs toggle-primary"
            checked={enabledBreakpoints.includes('tablet')}
            onChange={toggleTablet}
          />
        </label>
      </div>

      <div className="navbar-end gap-1">
        <div className="join">
          <button
            type="button"
            className="btn btn-ghost btn-sm join-item"
            disabled={!canUndo}
            onClick={onUndo}
            aria-label="Undo"
          >
            Undo
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm join-item"
            disabled={!canRedo}
            onClick={onRedo}
            aria-label="Redo"
          >
            Redo
          </button>
        </div>
        <div className="join">
          <button
            type="button"
            className="btn btn-ghost btn-sm join-item"
            onClick={() => onBaselineChange(clearLayout())}
          >
            Clear
          </button>
          <button type="button" className="btn btn-ghost btn-sm join-item" onClick={onLoadSample}>
            Sample
          </button>
          <button type="button" className="btn btn-ghost btn-sm join-item" onClick={handleExport}>
            Export
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm join-item"
            onClick={() => fileInputRef.current?.click()}
          >
            Import
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleImport}
        />
        <a className="btn btn-sm btn-primary" href="/preview" target="_blank" rel="noreferrer">
          Preview
        </a>
      </div>
    </header>
  );
}
