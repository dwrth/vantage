import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { useCallback, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { BuilderContext } from '../context/BuilderContext';
import {
  getBreakpointPreviewWidths,
  getBreakpointWidths,
  getEnabledBreakpoints,
  isBreakpointEnabled,
} from '../lib/breakpoint';
import { diffLayouts, type LayoutChangeOptions, type LayoutChangeset } from '../lib/diff';
import { useBuilderKeyboard, type BuilderHistory } from '../hooks/useBuilderKeyboard';
import {
  DEFAULT_BLOCK_ANNOUNCEMENTS,
  DEFAULT_BLOCK_LABELS,
  type BlockAnnouncements,
  type BlockLabels,
} from '../lib/keyboardLabels';
import { resolveRegistry } from '../lib/registry';
import type {
  ExternalDragItem,
  ExternalDropEvent,
  ItemContextMenuEvent,
  SectionChromeContext,
  SelectionRef,
} from '../context/BuilderContext';
import type { Breakpoint, ComponentRegistry, GridItem, Layout, Section } from '../types';
import { vantageRootProps } from '../theme/applyRoot';
import { useVantageTokens } from '../theme/useVantageTokens';
import '../styles/tokens.css';
import builderStyles from '../styles/builder.module.css';
import { Canvas } from './Canvas';
import type { SectionActionLabels } from '../lib/sectionActionLabels';

export type { SectionActionLabels } from '../lib/sectionActionLabels';
export type { BuilderHistory } from '../hooks/useBuilderKeyboard';
export type {
  BlockAnnouncementContext,
  BlockAnnouncements,
  BlockLabels,
} from '../lib/keyboardLabels';

export type ItemChromeRenderProps = {
  sectionId: string;
  item: GridItem;
  isSelected: boolean;
};

export type ItemEditButtonRenderProps = ItemChromeRenderProps;

export type ItemDragHandleRenderProps = ItemChromeRenderProps & {
  isDragging: boolean;
  listeners: DraggableSyntheticListeners | undefined;
  attributes: DraggableAttributes;
};

export type ItemDeleteButtonRenderProps = ItemChromeRenderProps & {
  onDelete: () => void;
};

export type VantageBuilderProps = {
  value: Layout;
  /**
   * `options.mergeKey` marks changes of one gesture (e.g. a held arrow key); forward it to
   * `useVantageHistory`'s `onChange` so the gesture is one undo step.
   */
  onChange: (next: Layout, changeset: LayoutChangeset, options?: LayoutChangeOptions) => void;
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
  /**
   * Accessible name of a section's bottom resize edge, e.g. for translation.
   * Default: `Resize ${section.label ?? 'section'} height`.
   */
  sectionResizeLabel?: (section: Section) => string;
  /** Section toolbar (move up / down, duplicate) and the insert-section button. Default: shown. */
  showSectionActions?: boolean;
  /** Accessible names of the section toolbar buttons, e.g. for translation. */
  sectionActionLabels?: Partial<SectionActionLabels>;
  /**
   * Replaces the built-in section duplicate, e.g. when the host must clone the entities behind
   * the items (see `duplicateSection` and `CloneItemOptions`).
   */
  onDuplicateSection?: (sectionId: string) => void;
  /**
   * Enables Cmd/Ctrl+Z (undo) and Shift+Cmd/Ctrl+Z / Cmd/Ctrl+Y (redo), e.g. the result of
   * `useVantageHistory`. Without it the builder leaves those keys alone.
   */
  history?: BuilderHistory;
  /** Accessible names and keyboard help of blocks, e.g. for translation. */
  blockLabels?: Partial<BlockLabels>;
  /** Screen-reader messages for keyboard edits, e.g. for translation. */
  announcements?: Partial<BlockAnnouncements>;
  /**
   * Shows a "save section" button in the section toolbar, e.g. to store the section as a
   * reusable template. Hidden when omitted.
   */
  onSaveSection?: (sectionId: string) => void;
  renderEditButton?: (ctx: ItemEditButtonRenderProps) => ReactNode;
  /** Draws a dashed instead of solid outline around blocks for which this returns true (e.g. blocks with an access rule). */
  isItemRestricted?: (item: GridItem) => boolean;
  renderDragHandle?: (ctx: ItemDragHandleRenderProps) => ReactNode;
  renderDeleteButton?: (ctx: ItemDeleteButtonRenderProps) => ReactNode;
  onItemContextMenu?: (event: React.MouseEvent, ctx: ItemContextMenuEvent) => void;
  /**
   * Set while the host drags a new block over the canvas with native HTML5 drag-and-drop
   * (e.g. from a component palette). Sections then accept the drop and show a ghost of this size.
   */
  externalDrag?: ExternalDragItem | null;
  /** Called when an `externalDrag` is dropped on a section. Insert the block there. */
  onExternalDrop?: (event: ExternalDropEvent) => void;
};

export type SectionChromeRenderProps = SectionChromeContext;

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
  sectionResizeLabel,
  showSectionActions = true,
  sectionActionLabels,
  onDuplicateSection,
  history,
  blockLabels: blockLabelsProp,
  announcements: announcementsProp,
  onSaveSection,
  renderEditButton,
  isItemRestricted,
  renderDragHandle,
  renderDeleteButton,
  onItemContextMenu,
  externalDrag = null,
  onExternalDrop,
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

  const emitChange = useCallback(
    (next: Layout, options?: LayoutChangeOptions) =>
      onChange(next, diffLayouts(value, next), options),
    [onChange, value],
  );

  const blockLabels = useMemo(
    () => ({ ...DEFAULT_BLOCK_LABELS, ...blockLabelsProp }),
    [blockLabelsProp],
  );
  const announcements = useMemo(
    () => ({ ...DEFAULT_BLOCK_ANNOUNCEMENTS, ...announcementsProp }),
    [announcementsProp],
  );
  const blockInstructionsId = useId();
  const [liveMessage, setLiveMessage] = useState('');
  // A repeated message must still change the region's text, or screen readers stay silent.
  const announce = useCallback(
    (message: string) =>
      setLiveMessage((prev) => (prev === message ? `${message}\u00a0` : message)),
    [],
  );
  const rootRef = useRef<HTMLDivElement>(null);
  useBuilderKeyboard(rootRef, {
    layout: value,
    selection,
    setSelection,
    activeBreakpoint,
    isInteracting,
    emitChange,
    history,
    blockLabels,
    announcements,
    announce,
  });

  const registryEmpty = Object.keys(components).length === 0;
  const tokens = useVantageTokens();
  const root = vantageRootProps(tokens, className);

  return (
    <BuilderContext.Provider
      value={{
        layout: value,
        enabledBreakpoints,
        breakpointWidths,
        breakpointPreviewWidths,
        onChange: emitChange,
        components,
        isInteracting,
        setInteracting,
        selection,
        setSelection,
        activeBreakpoint,
        setActiveBreakpoint,
        renderSectionHeader,
        renderSectionFooter,
        sectionResizeLabel,
        showSectionActions,
        sectionActionLabels,
        blockLabels,
        blockInstructionsId,
        onDuplicateSection,
        onSaveSection,
        renderEditButton,
        isItemRestricted,
        renderDragHandle,
        renderDeleteButton,
        onItemContextMenu,
        externalDrag,
        onExternalDrop,
      }}
    >
      {/* While anything is dragged, hover styles are off (CSS guards on `[data-vantage-dragging]`). */}
      <div
        ref={rootRef}
        className={root.className}
        style={root.style}
        data-vantage-dragging={isInteracting || externalDrag ? '' : undefined}
      >
        <div id={blockInstructionsId} hidden>
          {blockLabels.instructions}
        </div>
        <div
          className={builderStyles['sr-only']}
          role="status"
          data-vantage-announcer=""
          aria-live="polite"
          aria-atomic="true"
        >
          {liveMessage}
        </div>
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
