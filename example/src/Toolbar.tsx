import { useRef } from 'react';
import {
  BREAKPOINTS,
  clearLayout,
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
} from 'vantage';
import app from './app.module.css';

const BREAKPOINT_LABELS: Record<Breakpoint, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
};

type ToolbarProps = {
  layout: Layout;
  onChange: (layout: Layout) => void;
  onLoadSample: () => void;
  activeBreakpoint: Breakpoint;
  onActiveBreakpointChange: (next: Breakpoint) => void;
};

export function Toolbar({
  layout,
  onChange,
  onLoadSample,
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
        onChange(importLayout(data as Layout));
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
    onChange(setLayoutBreakpoints(layout, next));
  };

  const setMobileWidth = (value: string) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    onChange(setBreakpointWidth(layout, 'mobile', num));
  };

  const setTabletWidth = (value: string) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    onChange(setBreakpointWidth(layout, 'tablet', num));
  };

  const setMobilePreview = (value: string) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    onChange(setBreakpointPreviewWidth(layout, 'mobile', num));
  };

  const setTabletPreview = (value: string) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    onChange(setBreakpointPreviewWidth(layout, 'tablet', num));
  };

  const mobileMin = 1;
  const tabletMin = (breakpointWidths.mobile ?? 1) + 1;

  return (
    <header className={app.toolbar}>
      <h1 className={app.toolbarTitle}>Vantage</h1>
      <div className={app.toolbarActions}>
        <div className={app.breakpointSwitch} role="group" aria-label="Breakpoint">
          {visibleBreakpoints.map((bp) => (
            <button
              key={bp}
              type="button"
              className={activeBreakpoint === bp ? app.breakpointSwitchActive : undefined}
              aria-pressed={activeBreakpoint === bp}
              onClick={() => onActiveBreakpointChange(bp)}
            >
              {BREAKPOINT_LABELS[bp]}
            </button>
          ))}
        </div>
        {enabledBreakpoints.includes('mobile') ? (
          <div className={app.breakpointGroup} aria-label="Mobile widths">
            <label className={app.breakpointWidth}>
              <span>Mobile ≤</span>
              <input
                type="number"
                min={mobileMin}
                max={9999}
                value={breakpointWidths.mobile ?? 640}
                onChange={(e) => setMobileWidth(e.target.value)}
              />
              <span>px</span>
            </label>
            <label className={app.breakpointWidth}>
              <span>Preview</span>
              <input
                type="number"
                min={1}
                max={9999}
                value={previewWidths.mobile ?? 390}
                onChange={(e) => setMobilePreview(e.target.value)}
              />
              <span>px</span>
            </label>
          </div>
        ) : null}
        {enabledBreakpoints.includes('tablet') ? (
          <div className={app.breakpointGroup} aria-label="Tablet widths">
            <label className={app.breakpointWidth}>
              <span>Tablet ≤</span>
              <input
                type="number"
                min={tabletMin}
                max={9999}
                value={breakpointWidths.tablet ?? 1023}
                onChange={(e) => setTabletWidth(e.target.value)}
              />
              <span>px</span>
            </label>
            <label className={app.breakpointWidth}>
              <span>Preview</span>
              <input
                type="number"
                min={1}
                max={9999}
                value={previewWidths.tablet ?? 768}
                onChange={(e) => setTabletPreview(e.target.value)}
              />
              <span>px</span>
            </label>
          </div>
        ) : null}
        <label className={app.breakpointOption}>
          <input
            type="checkbox"
            checked={enabledBreakpoints.includes('tablet')}
            onChange={toggleTablet}
          />
          Tablet
        </label>
        <button type="button" onClick={() => onChange(clearLayout())}>
          Clear
        </button>
        <button type="button" onClick={onLoadSample}>
          Load sample
        </button>
        <button type="button" onClick={handleExport}>
          Export JSON
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleImport}
        />
        <a className={app.toolbarLink} href="/preview" target="_blank" rel="noreferrer">
          Preview
        </a>
      </div>
    </header>
  );
}
