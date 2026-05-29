import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  VantageBuilder,
  VantagePreview,
  bringItemForward,
  bringItemToFront,
  createEmptyLayout,
  getEnabledBreakpoints,
  importLayout,
  resolveItemData,
  sendItemBackward,
  sendItemToBack,
  updateItemData,
  type Layout,
  type SelectionRef,
  type Breakpoint,
} from 'vantage';
import { LayersPanel } from './LayersPanel';
import { createSampleLayout } from '../sampleLayout';
import { exampleComponents } from './blocks';
import type { ButtonAlign, ButtonData, ButtonVAlign } from './blocks/button';
import app from './app.module.css';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';
import { ItemInspector } from './ItemInspector';
import { SectionHeader } from './SectionHeader';
import { SectionInspector } from './SectionInspector';
import { Toolbar } from './Toolbar';

const STORAGE_KEY = 'vantage.layout.demo.v3';
const BREAKPOINT_STORAGE_KEY = 'vantage.breakpoint.demo.v1';

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

function loadStoredLayout(): Layout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyLayout();
    const parsed = JSON.parse(raw) as Layout;
    if (!parsed?.sections || !parsed?.breakpoints) return createEmptyLayout();
    return importLayout(parsed);
  } catch {
    return createEmptyLayout();
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  useEffect(() => {
    localStorage.setItem(BREAKPOINT_STORAGE_KEY, activeBreakpoint);
  }, [activeBreakpoint]);

  const handleSelectionChange = useCallback((next: SelectionRef | null) => {
    setSelection(next);
    if (next?.sectionId) setInspectedSectionId(next.sectionId);
  }, []);

  const effectiveInspectedSectionId = useMemo(() => {
    if (!inspectedSectionId) return null;
    return layout.sections.some((sec) => sec.id === inspectedSectionId) ? inspectedSectionId : null;
  }, [inspectedSectionId, layout.sections]);

  const loadSample = useCallback(() => {
    setLayout(createSampleLayout());
  }, []);

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
      setLayout((prev) => mutate(prev, layerMenu.sectionId, layerMenu.itemId));
    },
    [layerMenu],
  );

  const applyButtonAlignment = useCallback(
    (patch: Partial<ButtonData>) => {
      if (!layerMenu) return;
      setLayout((prev) =>
        updateItemData<ButtonData>(
          prev,
          layerMenu.sectionId,
          layerMenu.itemId,
          patch,
          activeBreakpoint,
        ),
      );
    },
    [activeBreakpoint, layerMenu],
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
      <div className={app.app}>
        <VantagePreview value={layout} components={exampleComponents} />
      </div>
    );
  }

  return (
    <div className={app.app}>
      <Toolbar
        layout={layout}
        onChange={setLayout}
        onLoadSample={loadSample}
        activeBreakpoint={activeBreakpoint}
        onActiveBreakpointChange={setActiveBreakpoint}
      />
      <main className={app.appMain}>
        <div className={app.canvasCol}>
          <VantageBuilder
            value={layout}
            onChange={setLayout}
            components={exampleComponents}
            renderSectionHeader={(ctx) => (
              <SectionHeader
                layout={layout}
                onChange={setLayout}
                components={exampleComponents}
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
        <div className={app.panelCol}>
          <LayersPanel
            layout={layout}
            onChange={setLayout}
            selection={selection}
            onSelectionChange={handleSelectionChange}
            activeBreakpoint={activeBreakpoint}
          />
          <ItemInspector
            layout={layout}
            onChange={setLayout}
            components={exampleComponents}
            selection={selection}
            activeBreakpoint={activeBreakpoint}
          />
          <SectionInspector
            layout={layout}
            onChange={setLayout}
            selectedSectionId={effectiveInspectedSectionId}
            onSelectSection={setInspectedSectionId}
            activeBreakpoint={activeBreakpoint}
          />
        </div>
      </main>
      {layerMenu && (
        <ContextMenu
          x={layerMenu.x}
          y={layerMenu.y}
          onClose={() => setLayerMenu(null)}
          items={contextMenuItems}
        />
      )}
    </div>
  );
}

export default App;
