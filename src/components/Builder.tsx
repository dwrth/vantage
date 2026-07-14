import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BuilderContext } from '../context/BuilderContext';
import {
  getBreakpointPreviewWidths,
  getBreakpointWidths,
  getEnabledBreakpoints,
  isBreakpointEnabled,
} from '../lib/breakpoint';
import {
  diffLayouts,
  type ItemAddedEvent,
  type ItemMovedEvent,
  type ItemRemovedEvent,
  type ItemUpdatedEvent,
  type SectionAddedEvent,
  type SectionRemovedEvent,
} from '../lib/diff';
import { resolveRegistry } from '../lib/registry';
import type { ItemContextMenuEvent, SelectionRef } from '../context/BuilderContext';
import type { Breakpoint, ComponentRegistry, GridItem, Layout, Section } from '../types';
import '../styles/tokens.css';
import { Canvas } from './Canvas';

export type ItemEditButtonRenderProps = {
  sectionId: string;
  item: GridItem;
  isSelected: boolean;
};

export type VantageBuilderProps = {
  value: Layout;
  onChange: (layout: Layout) => void;
  components: ComponentRegistry;
  className?: string;
  children?: ReactNode;
  selectedItem?: SelectionRef | null;
  defaultSelectedItem?: SelectionRef | null;
  onSelectionChange?: (next: SelectionRef | null) => void;
  activeBreakpoint?: Breakpoint;
  defaultActiveBreakpoint?: Breakpoint;
  onActiveBreakpointChange?: (next: Breakpoint) => void;
  renderSectionHeader?: (ctx: SectionHeaderRenderProps) => ReactNode;
  renderSectionFooter?: (ctx: SectionFooterRenderProps) => ReactNode;
  renderEditButton?: (ctx: ItemEditButtonRenderProps) => ReactNode;
  onItemContextMenu?: (event: React.MouseEvent, ctx: ItemContextMenuEvent) => void;
  onItemAdded?: (ctx: ItemAddedEvent) => void;
  onItemRemoved?: (ctx: ItemRemovedEvent) => void;
  onItemUpdated?: (ctx: ItemUpdatedEvent) => void;
  onItemMoved?: (ctx: ItemMovedEvent) => void;
  onSectionAdded?: (ctx: SectionAddedEvent) => void;
  onSectionRemoved?: (ctx: SectionRemovedEvent) => void;
};

export type SectionChromeRenderProps = {
  section: Section;
  activeBreakpoint: Breakpoint;
};

export type SectionHeaderRenderProps = SectionChromeRenderProps;
export type SectionFooterRenderProps = SectionChromeRenderProps;

export function VantageBuilder({
  value,
  onChange,
  components: componentsProp,
  className,
  children,
  selectedItem: selectedItemProp,
  defaultSelectedItem = null,
  onSelectionChange,
  activeBreakpoint: activeBreakpointProp,
  defaultActiveBreakpoint = 'desktop',
  onActiveBreakpointChange,
  renderSectionHeader,
  renderSectionFooter,
  renderEditButton,
  onItemContextMenu,
  onItemAdded,
  onItemRemoved,
  onItemUpdated,
  onItemMoved,
  onSectionAdded,
  onSectionRemoved,
}: VantageBuilderProps) {
  const enabledBreakpoints = useMemo(() => getEnabledBreakpoints(value), [value]);
  const breakpointWidths = useMemo(() => getBreakpointWidths(value), [value]);
  const breakpointPreviewWidths = useMemo(() => getBreakpointPreviewWidths(value), [value]);
  const [isInteracting, setInteracting] = useState(false);
  const [uncontrolledSelection, setUncontrolledSelection] = useState<SelectionRef | null>(
    defaultSelectedItem,
  );
  const [uncontrolledBreakpoint, setUncontrolledBreakpoint] = useState<Breakpoint>(
    enabledBreakpoints.includes(defaultActiveBreakpoint) ? defaultActiveBreakpoint : 'desktop',
  );
  const components = useMemo(() => resolveRegistry(componentsProp), [componentsProp]);

  const isControlled = selectedItemProp !== undefined;
  const selectionCandidate = isControlled ? selectedItemProp : uncontrolledSelection;
  const selection = useMemo<SelectionRef | null>(() => {
    if (!selectionCandidate) return null;
    const section = value.sections.find((s) => s.id === selectionCandidate.sectionId);
    const exists = section?.items.some((i) => i.id === selectionCandidate.itemId);
    return exists ? selectionCandidate : null;
  }, [selectionCandidate, value.sections]);

  const isBreakpointControlled = activeBreakpointProp !== undefined;
  const requestedBreakpoint = isBreakpointControlled
    ? activeBreakpointProp
    : uncontrolledBreakpoint;
  const activeBreakpoint = enabledBreakpoints.includes(requestedBreakpoint)
    ? requestedBreakpoint
    : 'desktop';

  const setSelection = useCallback(
    (next: SelectionRef | null) => {
      if (!isControlled) setUncontrolledSelection(next);
      onSelectionChange?.(next);
    },
    [isControlled, onSelectionChange],
  );

  const setActiveBreakpoint = useCallback(
    (next: Breakpoint) => {
      const safe = isBreakpointEnabled(value, next) ? next : 'desktop';
      if (!isBreakpointControlled) setUncontrolledBreakpoint(safe);
      onActiveBreakpointChange?.(safe);
    },
    [isBreakpointControlled, onActiveBreakpointChange, value],
  );

  const registryEmpty = Object.keys(components).length === 0;
  const prevLayoutRef = useRef<Layout | null>(null);

  useEffect(() => {
    const prev = prevLayoutRef.current;
    prevLayoutRef.current = value;
    if (prev === null || prev === value) return;
    const changeset = diffLayouts(prev, value);
    changeset.sectionsAdded.forEach((ctx) => onSectionAdded?.(ctx));
    changeset.sectionsRemoved.forEach((ctx) => onSectionRemoved?.(ctx));
    changeset.itemsAdded.forEach((ctx) => onItemAdded?.(ctx));
    changeset.itemsRemoved.forEach((ctx) => onItemRemoved?.(ctx));
    changeset.itemsMoved.forEach((ctx) => onItemMoved?.(ctx));
    changeset.itemsUpdated.forEach((ctx) => onItemUpdated?.(ctx));
  }, [
    value,
    onItemAdded,
    onItemRemoved,
    onItemUpdated,
    onItemMoved,
    onSectionAdded,
    onSectionRemoved,
  ]);

  return (
    <BuilderContext.Provider
      value={{
        layout: value,
        enabledBreakpoints,
        breakpointWidths,
        breakpointPreviewWidths,
        onChange,
        components,
        isInteracting,
        setInteracting,
        selection,
        setSelection,
        activeBreakpoint,
        setActiveBreakpoint,
        renderSectionHeader,
        renderSectionFooter,
        renderEditButton,
        onItemContextMenu,
      }}
    >
      <div className={['vantage-root', className].filter(Boolean).join(' ')}>
        {children}
        {registryEmpty ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '0.875rem',
            }}
          >
            <p style={{ margin: 0 }}>
              No components registered. Pass a <code>components</code> prop to{' '}
              <code>VantageBuilder</code>.
            </p>
          </div>
        ) : (
          <Canvas />
        )}
      </div>
    </BuilderContext.Provider>
  );
}
