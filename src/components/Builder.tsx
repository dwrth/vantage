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
  withDefaults,
  type BlockAnnouncements,
  type BlockLabels,
} from '../lib/keyboardLabels';
import { resolveRegistry } from '../lib/registry';
import { sameRef, sameSelection } from '../lib/selection';
import type {
  ExternalDragItem,
  ExternalDropEvent,
  ItemContextMenuEvent,
  ItemOverlapContext,
  SectionChromeContext,
  SectionHeaderPlacement,
  SelectionRef,
} from '../context/BuilderContext';
import type { GridMinSize } from '../lib/grid';
import type {
  Breakpoint,
  ComponentRegistry,
  GridItem,
  ItemMinSize,
  Layout,
  Section,
} from '../types';
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
  GroupAnnouncementContext,
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

export type ItemOverlapWarningRenderProps = ItemOverlapContext;

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
  /**
   * The primary selected block (controlled). With a multi-selection it is the block added last.
   * When it is not part of `selectedItems`, the selection is just this block.
   */
  selectedItem?: SelectionRef | null;
  defaultSelectedItem?: SelectionRef | null;
  /** The primary selected block changed or was set again (e.g. on every click on a block). */
  onSelectionChange?: (next: SelectionRef | null) => void;
  /**
   * Every selected block (controlled), all of one section; the last entry is the primary block.
   * Optional: without it the builder keeps the multi-selection itself and `selectedItem` /
   * `onSelectionChange` keep working as for a single selection.
   */
  selectedItems?: SelectionRef[];
  defaultSelectedItems?: SelectionRef[];
  /** Called with the whole selection whenever it is set (click, Shift-click, marquee, Escape). */
  onSelectedItemsChange?: (next: SelectionRef[]) => void;
  /** Toolbar with align and delete buttons above a multi-selection. Default: shown. */
  showGroupToolbar?: boolean;
  activeBreakpoint?: Breakpoint;
  defaultActiveBreakpoint?: Breakpoint;
  onActiveBreakpointChange?: (next: Breakpoint) => void;
  renderSectionHeader?: (ctx: SectionHeaderRenderProps) => ReactNode;
  /**
   * `section` (default): the header is the section's first child and spans the full section width.
   * `canvas`: the header sits flush above the grid inside the canvas frame, so it matches the active
   * breakpoint's preview width. Either way it is in flow outside the grid, so it never shifts the
   * grid math (drop targets, resize, hit testing) and blocks cannot overlap it.
   */
  sectionHeaderPlacement?: SectionHeaderPlacement;
  renderSectionFooter?: (ctx: SectionFooterRenderProps) => ReactNode;
  /**
   * Accessible name of a section's bottom resize edge, e.g. for translation.
   * Default: `Resize ${section.label ?? 'section'} height`.
   */
  sectionResizeLabel?: (section: Section) => string;
  /** Section toolbar (move up / down, duplicate) and the insert-section button. Default: shown. */
  showSectionActions?: boolean;
  /**
   * Only the toolbar (move / duplicate / save) of the section actions; the insert-section button on the
   * section edge stays. Set to false when the host renders its own toolbar. Default: shown.
   */
  showSectionToolbar?: boolean;
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
  /**
   * Smallest size the item's content needs at `breakpoint`, e.g. its measured content height
   * as `heightPx`. Pointer and keyboard resizes never shrink a block below it. Called on render,
   * so keep it cheap.
   */
  getItemMinSize?: (item: GridItem, breakpoint: Breakpoint) => ItemMinSize | null | undefined;
  /**
   * Mark blocks that overlap others (see `findOverlaps`) and offer "move below" and "keep
   * overlap". Edit mode only. Default: shown.
   */
  showOverlapWarnings?: boolean;
  /** Replaces the built-in overlap warning of a block (labels: `blockLabels.overlap*`). */
  renderOverlapWarning?: (ctx: ItemOverlapWarningRenderProps) => ReactNode;
};

export type SectionChromeRenderProps = SectionChromeContext;

export type SectionHeaderRenderProps = SectionChromeRenderProps;
export type { SectionHeaderPlacement };
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
  selectedItems: selectedItemsProp,
  defaultSelectedItems,
  onSelectedItemsChange,
  showGroupToolbar = true,
  activeBreakpoint: activeBreakpointProp,
  defaultActiveBreakpoint = 'desktop',
  onActiveBreakpointChange,
  renderSectionHeader,
  sectionHeaderPlacement = 'section',
  renderSectionFooter,
  sectionResizeLabel,
  showSectionActions = true,
  showSectionToolbar = true,
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
  getItemMinSize,
  showOverlapWarnings = true,
  renderOverlapWarning,
}: VantageBuilderProps) {
  const enabledBreakpoints = useMemo(() => getEnabledBreakpoints(value), [value]);
  const breakpointWidths = useMemo(() => getBreakpointWidths(value), [value]);
  const breakpointPreviewWidths = useMemo(() => getBreakpointPreviewWidths(value), [value]);
  const [isInteracting, setInteracting] = useState(false);
  const [uncontrolledItems, setUncontrolledItems] = useState<SelectionRef[]>(
    () => defaultSelectedItems ?? (defaultSelectedItem ? [defaultSelectedItem] : []),
  );
  const [uncontrolledBreakpoint, setUncontrolledBreakpoint] = useState<Breakpoint>(
    enabledBreakpoints.includes(defaultActiveBreakpoint) ? defaultActiveBreakpoint : 'desktop',
  );
  const components = useMemo(() => resolveRegistry(componentsProp), [componentsProp]);

  const isControlled = selectedItemProp !== undefined;
  const itemsControlled = selectedItemsProp !== undefined;
  const itemsCandidate = itemsControlled ? selectedItemsProp : uncontrolledItems;
  const primaryCandidate = isControlled ? selectedItemProp : (itemsCandidate.at(-1) ?? null);
  const { selection, selectedItems } = useMemo(() => {
    const exists = (ref: SelectionRef) =>
      value.sections.find((s) => s.id === ref.sectionId)?.items.some((i) => i.id === ref.itemId) ===
      true;
    const primary = primaryCandidate && exists(primaryCandidate) ? primaryCandidate : null;
    if (!primary) return { selection: null, selectedItems: [] as SelectionRef[] };
    // The primary block decides: a group it is not part of is replaced by the block alone.
    if (!itemsCandidate.some((ref) => sameRef(ref, primary))) {
      return { selection: primary, selectedItems: [primary] };
    }
    const group = itemsCandidate.filter(
      (ref, i) =>
        ref.sectionId === primary.sectionId &&
        !sameRef(ref, primary) &&
        exists(ref) &&
        itemsCandidate.findIndex((r) => sameRef(r, ref)) === i,
    );
    return { selection: primary, selectedItems: [...group, primary] };
  }, [primaryCandidate, itemsCandidate, value.sections]);

  // Drop stale entries (deleted blocks, a group the host replaced through `selectedItem`), so
  // they cannot come back later. Adjusting state while rendering, as React recommends.
  if (!itemsControlled && !sameSelection(uncontrolledItems, selectedItems)) {
    setUncontrolledItems(selectedItems);
  }

  const isBreakpointControlled = activeBreakpointProp !== undefined;
  const requestedBreakpoint = isBreakpointControlled
    ? activeBreakpointProp
    : uncontrolledBreakpoint;
  const activeBreakpoint = enabledBreakpoints.includes(requestedBreakpoint)
    ? requestedBreakpoint
    : 'desktop';

  const setSelectedItems = useCallback(
    (next: SelectionRef[]) => {
      if (!itemsControlled) setUncontrolledItems(next);
      onSelectedItemsChange?.(next);
      onSelectionChange?.(next.at(-1) ?? null);
    },
    [itemsControlled, onSelectedItemsChange, onSelectionChange],
  );

  const setSelection = useCallback(
    (next: SelectionRef | null) => setSelectedItems(next ? [next] : []),
    [setSelectedItems],
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
    () => withDefaults(DEFAULT_BLOCK_LABELS, blockLabelsProp),
    [blockLabelsProp],
  );
  const announcements = useMemo(
    () => withDefaults(DEFAULT_BLOCK_ANNOUNCEMENTS, announcementsProp),
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
  const minSizesRef = useRef(new Map<string, GridMinSize>());
  useBuilderKeyboard(rootRef, {
    minSizes: minSizesRef,
    layout: value,
    selection,
    setSelection,
    selectedItems,
    setSelectedItems,
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
        selectedItems,
        setSelectedItems,
        activeBreakpoint,
        setActiveBreakpoint,
        renderSectionHeader,
        sectionHeaderPlacement,
        renderSectionFooter,
        sectionResizeLabel,
        showSectionActions,
        showSectionToolbar,
        sectionActionLabels,
        blockLabels,
        announcements,
        announce,
        showGroupToolbar,
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
        getItemMinSize,
        minSizesRef,
        showOverlapWarnings,
        renderOverlapWarning,
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
