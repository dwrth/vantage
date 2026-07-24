import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  VantageBuilder,
  VantagePreview,
  VantageInspector,
  VantageThemeProvider,
  bringItemForward,
  bringItemToFront,
  emitLayoutChange,
  getEnabledBreakpoints,
  importLayout,
  isValidLayout,
  resolveItemData,
  sendItemBackward,
  sendItemToBack,
  updateItemData,
  useVantageHistory,
  type Layout,
  type SelectionRef,
  type Breakpoint,
  type VantageTokens,
} from 'vantage';
import { LayersPanel } from './LayersPanel';
import { createSampleLayout } from './sampleLayout';
import { demoComponents } from './blocks';
import type { ButtonAlign, ButtonData, ButtonVAlign } from './blocks/button';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';
import { SectionHeader } from './SectionHeader';
import { SectionInspector } from './SectionInspector';
import { ThemeEditor } from './ThemeEditor';
import { DEMO_TOKEN_DEFAULTS } from './demoTokens';
import { Toolbar } from './Toolbar';

const STORAGE_KEY = 'vantage.layout.demo.v5';
const BREAKPOINT_STORAGE_KEY = 'vantage.breakpoint.demo.v3';
const THEME_STORAGE_KEY = 'vantage.theme.demo.v1';

function loadStoredTokens(): VantageTokens {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return { ...DEMO_TOKEN_DEFAULTS };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...DEMO_TOKEN_DEFAULTS };
    }
    return { ...DEMO_TOKEN_DEFAULTS, ...(parsed as VantageTokens) };
  } catch {
    return { ...DEMO_TOKEN_DEFAULTS };
  }
}

function clampBreakpoint(layout: Layout, next: Breakpoint): Breakpoint {
  return getEnabledBreakpoints(layout).includes(next) ? next : 'desktop';
}

function loadStoredBreakpoint(layout: Layout): Breakpoint {
  try {
    const raw = localStorage.getItem(BREAKPOINT_STORAGE_KEY);
    if (raw === 'desktop' || raw === 'tablet' || raw === 'mobile')
      return clampBreakpoint(layout, raw);
  } catch {
    /* ignore */
  }
  return 'desktop';
}

type LayerMenuState = {
  x: number;
  y: number;
  sectionId: string;
  itemId: string;
};

type PanelTab = 'layers' | 'item' | 'section' | 'theme';

function loadStoredLayout(): Layout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSampleLayout();
    const parsed: unknown = JSON.parse(raw);
    if (!isValidLayout(parsed)) return createSampleLayout();
    return importLayout(parsed);
  } catch {
    return createSampleLayout();
  }
}

function App() {
  const initialLayout = useMemo(() => loadStoredLayout(), []);
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [storedBreakpoint, setActiveBreakpoint] = useState<Breakpoint>(() =>
    loadStoredBreakpoint(initialLayout),
  );
  const activeBreakpoint = clampBreakpoint(layout, storedBreakpoint);
  const [selection, setSelection] = useState<SelectionRef | null>(null);
  const [layerMenu, setLayerMenu] = useState<LayerMenuState | null>(null);
  const [inspectedSectionId, setInspectedSectionId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>('layers');
  const [tokens, setTokens] = useState<VantageTokens>(loadStoredTokens);

  const {
    reset,
    onChange: pushLayoutChange,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useVantageHistory(layout, (next) => setLayout(next));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  useEffect(() => {
    localStorage.setItem(BREAKPOINT_STORAGE_KEY, activeBreakpoint);
  }, [activeBreakpoint]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(tokens));
  }, [tokens]);

  const handleSelectionChange = useCallback((next: SelectionRef | null) => {
    setSelection(next);
    if (next?.sectionId) {
      setInspectedSectionId(next.sectionId);
      setPanelTab('item');
    }
  }, []);

  const effectiveInspectedSectionId = useMemo(() => {
    if (!inspectedSectionId) return null;
    return layout.sections.some((sec) => sec.id === inspectedSectionId) ? inspectedSectionId : null;
  }, [inspectedSectionId, layout.sections]);

  const applyBaseline = useCallback(
    (next: Layout) => {
      reset(next);
      setLayout(next);
    },
    [reset],
  );

  const loadSample = useCallback(() => {
    applyBaseline(createSampleLayout());
  }, [applyBaseline]);

  const layerMenuIndex = useMemo(() => {
    if (!layerMenu) return -1;
    const section = layout.sections.find((s) => s.id === layerMenu.sectionId);
    return section?.items.findIndex((i) => i.id === layerMenu.itemId) ?? -1;
  }, [layout, layerMenu]);

  const layerMenuItemCount = useMemo(() => {
    if (!layerMenu) return 0;
    const section = layout.sections.find((s) => s.id === layerMenu.sectionId);
    return section?.items.length ?? 0;
  }, [layout, layerMenu]);

  const layerMenuItem = useMemo(() => {
    if (!layerMenu) return null;
    const section = layout.sections.find((s) => s.id === layerMenu.sectionId);
    const item = section?.items.find((i) => i.id === layerMenu.itemId);
    if (!section || !item) return null;
    return {
      ...item,
      data: resolveItemData(item, section, activeBreakpoint, layout.breakpoints),
    };
  }, [activeBreakpoint, layout, layerMenu]);

  const applyLayer = useCallback(
    (mutate: (layout: Layout, sectionId: string, itemId: string) => Layout) => {
      if (!layerMenu) return;
      emitLayoutChange(
        layout,
        mutate(layout, layerMenu.sectionId, layerMenu.itemId),
        pushLayoutChange,
      );
    },
    [layerMenu, layout, pushLayoutChange],
  );

  const applyButtonAlignment = useCallback(
    (patch: Partial<ButtonData>) => {
      if (!layerMenu) return;
      emitLayoutChange(
        layout,
        updateItemData<ButtonData>(
          layout,
          layerMenu.sectionId,
          layerMenu.itemId,
          patch,
          activeBreakpoint,
        ),
        pushLayoutChange,
      );
    },
    [activeBreakpoint, layerMenu, layout, pushLayoutChange],
  );

  const atBack = layerMenuIndex <= 0;
  const atFront = layerMenuIndex < 0 || layerMenuIndex >= layerMenuItemCount - 1;

  const contextMenuItems = useMemo((): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      {
        label: 'Bring to front',
        disabled: atFront,
        onSelect: () => applyLayer(bringItemToFront),
      },
      {
        label: 'Bring forward',
        disabled: atFront,
        onSelect: () => applyLayer(bringItemForward),
      },
      {
        label: 'Send backward',
        disabled: atBack,
        onSelect: () => applyLayer(sendItemBackward),
      },
      {
        label: 'Send to back',
        disabled: atBack,
        onSelect: () => applyLayer(sendItemToBack),
      },
    ];

    if (layerMenuItem?.kind !== 'button') return items;

    const data = (layerMenuItem.data ?? {}) as ButtonData;
    const align = data.align ?? 'center';
    const vAlign = data.vAlign ?? 'center';

    const hOptions: { label: string; value: ButtonAlign }[] = [
      { label: 'Align left', value: 'left' },
      { label: 'Align center', value: 'center' },
      { label: 'Align right', value: 'right' },
    ];
    const vOptions: { label: string; value: ButtonVAlign }[] = [
      { label: 'Align top', value: 'top' },
      { label: 'Align middle', value: 'center' },
      { label: 'Align bottom', value: 'bottom' },
    ];

    return [
      ...items,
      { separator: true },
      ...hOptions.map((opt) => ({
        label: opt.label,
        checked: align === opt.value,
        onSelect: () => applyButtonAlignment({ align: opt.value }),
      })),
      { separator: true },
      ...vOptions.map((opt) => ({
        label: opt.label,
        checked: vAlign === opt.value,
        onSelect: () => applyButtonAlignment({ vAlign: opt.value }),
      })),
    ];
  }, [layerMenuItem, atFront, atBack, applyLayer, applyButtonAlignment]);

  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/preview')) {
    return (
      <VantageThemeProvider tokens={tokens}>
        <div className="min-h-full bg-base-100">
          <VantagePreview value={layout} components={demoComponents} />
        </div>
      </VantageThemeProvider>
    );
  }

  return (
    <VantageThemeProvider tokens={tokens}>
      <div className="flex h-full min-h-0 flex-col">
        <Toolbar
          layout={layout}
          onChange={pushLayoutChange}
          onBaselineChange={applyBaseline}
          onLoadSample={loadSample}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          activeBreakpoint={activeBreakpoint}
          onActiveBreakpointChange={setActiveBreakpoint}
        />

        <div className="drawer drawer-end lg:drawer-open min-h-0 flex-1">
          <input id="vantage-drawer" type="checkbox" className="drawer-toggle" />

          <div className="drawer-content flex min-h-0 flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-base-300/40 px-3 py-1.5 lg:hidden">
              <span className="font-mono text-xs text-base-content/50">
                bp:<span className="text-primary">{activeBreakpoint}</span>
              </span>
              <label htmlFor="vantage-drawer" className="btn btn-ghost btn-sm drawer-button">
                Panels
              </label>
            </div>

            <main className="animate-fade-up min-h-0 flex-1 overflow-auto p-3 md:p-4">
              <div className="vantage-canvas-shell mx-auto max-w-[1400px] rounded-box p-2 md:p-3">
                <VantageBuilder
                  value={layout}
                  onChange={pushLayoutChange}
                  components={demoComponents}
                  className="min-h-[70vh]"
                  renderSectionHeader={(ctx) => (
                    <SectionHeader
                      layout={layout}
                      onChange={pushLayoutChange}
                      components={demoComponents}
                      {...ctx}
                    />
                  )}
                  selectedItem={selection}
                  onSelectionChange={handleSelectionChange}
                  activeBreakpoint={activeBreakpoint}
                  onActiveBreakpointChange={setActiveBreakpoint}
                  onItemContextMenu={(e, { sectionId, item }) => {
                    handleSelectionChange({ sectionId, itemId: item.id });
                    setLayerMenu({
                      x: e.clientX,
                      y: e.clientY,
                      sectionId,
                      itemId: item.id,
                    });
                  }}
                />
              </div>
            </main>
          </div>

          <div className="drawer-side z-40 is-drawer-close:overflow-visible">
            <label htmlFor="vantage-drawer" aria-label="close sidebar" className="drawer-overlay" />
            <aside className="flex h-full w-80 flex-col border-l border-base-300/60 bg-base-200/95 backdrop-blur-md">
              <div role="tablist" className="tabs tabs-box tabs-sm m-2">
                {(
                  [
                    ['layers', 'Layers'],
                    ['item', 'Item'],
                    ['section', 'Section'],
                    ['theme', 'Theme'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    className={`tab flex-1 ${panelTab === id ? 'tab-active' : ''}`}
                    onClick={() => setPanelTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                {panelTab === 'layers' ? (
                  <LayersPanel
                    layout={layout}
                    onChange={pushLayoutChange}
                    selection={selection}
                    onSelectionChange={handleSelectionChange}
                    activeBreakpoint={activeBreakpoint}
                  />
                ) : null}
                {panelTab === 'item' ? (
                  <VantageInspector
                    layout={layout}
                    onChange={pushLayoutChange}
                    components={demoComponents}
                    selection={selection}
                    activeBreakpoint={activeBreakpoint}
                    className="flex h-full min-h-0 flex-col"
                    emptyState={
                      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-base-content/50">
                        Select a block to inspect settings.
                      </div>
                    }
                    renderHeader={({ item }) => (
                      <div className="flex items-center justify-between border-b border-base-300/50 px-3 py-2">
                        <span className="text-xs font-semibold tracking-wider text-base-content/60 uppercase">
                          Item
                        </span>
                        <span className="badge badge-soft badge-sm font-mono">{item.kind}</span>
                      </div>
                    )}
                  />
                ) : null}
                {panelTab === 'section' ? (
                  <SectionInspector
                    layout={layout}
                    onChange={pushLayoutChange}
                    selectedSectionId={effectiveInspectedSectionId}
                    onSelectSection={setInspectedSectionId}
                    activeBreakpoint={activeBreakpoint}
                  />
                ) : null}
                {panelTab === 'theme' ? <ThemeEditor tokens={tokens} onChange={setTokens} /> : null}
              </div>
            </aside>
          </div>
        </div>

        {layerMenu ? (
          <ContextMenu
            x={layerMenu.x}
            y={layerMenu.y}
            onClose={() => setLayerMenu(null)}
            items={contextMenuItems}
          />
        ) : null}
      </div>
    </VantageThemeProvider>
  );
}

export default App;
