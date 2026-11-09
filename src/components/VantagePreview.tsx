import { createElement, useId, useMemo, type ReactNode } from 'react';
import {
  getBreakpointWidths,
  getEnabledBreakpoints,
  resolveBreakpointFromLayout,
  resolveItem,
  resolveSection,
  type ResolvedItemLayout,
  type ResolvedSectionLayout,
} from '../lib/breakpoint';
import { arrangementSlots, arrangementTrack, type ArrangementSlot } from '../lib/arrangement';
import { itemVerticalAlignByBreakpoint, resolveItemVerticalAlign } from '../lib/contentAlign';
import { resolveEffectiveItemData } from '../lib/entities';
import { sortByReadingOrder } from '../lib/readingOrder';
import { resolveRenderer, resolveRegistry } from '../lib/registry';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { useResolveItemData } from '../hooks/useItemData';
import {
  ITEM_VERTICAL_ALIGNS,
  NON_DESKTOP_BREAKPOINTS,
  type Breakpoint,
  type BreakpointWidths,
  type ComponentRegistry,
  type GridItem,
  type ItemVerticalAlign,
  type Layout,
  type ResolvedComponentRegistry,
  type Section,
} from '../types';
import { vantageRootProps } from '../theme/applyRoot';
import { useVantageTokens } from '../theme/useVantageTokens';
import { parsePxToken } from '../theme/tokens';
import { CELL_MAX_PX, ROW_MAX_PX } from '../lib/grid';
import '../styles/tokens.css';
import preview from '../styles/preview.module.css';
import { SectionBackground } from './SectionBackground';

export type VantagePreviewProps = {
  value: Layout;
  components: ComponentRegistry;
  className?: string;
  /** When set, forces a breakpoint instead of auto-detecting from container width. */
  breakpoint?: Breakpoint;
  /**
   * Render-time filter (e.g. per-viewer access rules). Items returning `false` are not
   * rendered on any breakpoint, and grid rows only they occupied collapse.
   */
  isItemVisible?: (item: GridItem) => boolean;
  /**
   * Shown when the layout has no sections. Omit for the default "Nothing to preview yet."
   * hint; `null` or `false` renders nothing (e.g. on a published page).
   */
  emptyState?: ReactNode;
};

const SECTION_VARS = [
  'cols',
  'col-gap-px',
  'row-gap-px',
  'section-pad-top-px',
  'section-pad-bottom-px',
  'rows-tpl',
] as const;

type RowShift = (y: number) => number;

const NO_SHIFT: RowShift = (y) => y;

function sectionVars(resolved: ResolvedSectionLayout, prefix = '', shift: RowShift = NO_SHIFT) {
  const values = [
    resolved.columns,
    `${resolved.colGap}px`,
    `${resolved.rowGap}px`,
    `${resolved.paddingTop}px`,
    `${resolved.paddingBottom}px`,
    // Rows collapsed by `isItemVisible` come off the section height too.
    resolved.rows === undefined
      ? 'none'
      : `repeat(${Math.max(1, shift(resolved.rows))}, minmax(var(--row-px), auto))`,
  ];
  return Object.fromEntries(SECTION_VARS.map((name, i) => [`--${prefix}${name}`, values[i]]));
}

function occupiedRows(
  items: GridItem[],
  section: Section,
  bp: Breakpoint,
  enabledBreakpoints: Breakpoint[],
): Set<number> {
  const rows = new Set<number>();
  for (const item of items) {
    const placement = resolveItem(item, section, bp, enabledBreakpoints);
    if (placement.hidden) continue;
    for (let row = placement.y; row < placement.y + placement.h; row++) rows.add(row);
  }
  return rows;
}

/** Rows occupied only by filtered-out items at `bp` collapse; items below move up. */
function rowShiftFor(
  visible: GridItem[],
  filtered: GridItem[],
  section: Section,
  bp: Breakpoint,
  enabledBreakpoints: Breakpoint[],
): RowShift {
  if (filtered.length === 0) return NO_SHIFT;
  const kept = occupiedRows(visible, section, bp, enabledBreakpoints);
  const removed = [...occupiedRows(filtered, section, bp, enabledBreakpoints)].filter(
    (row) => !kept.has(row),
  );
  if (removed.length === 0) return NO_SHIFT;
  return (y) => y - removed.filter((row) => row < y).length;
}

const FLOW_ALIGN_ITEMS = { start: 'start', center: 'center', end: 'end' } as const;

/** Section settings of an arrangement on `bp`: the track's columns, content-sized rows. */
function arrangementSectionLayout(
  section: Section,
  bp: Breakpoint,
  enabled: Breakpoint[],
): ResolvedSectionLayout {
  return {
    ...resolveSection(section, bp, enabled),
    columns: arrangementTrack(section.arrangement!, bp).columns,
    rows: undefined,
  };
}

function slotStyle(slot: ArrangementSlot) {
  return { gridColumn: `${slot.col + 2} / span ${slot.span}`, gridRow: `${slot.row + 1}` };
}

/** Every grid column plus both outer tracks: the full width of the section. */
const FULL_BLEED_COLUMN = '1 / -1';

function placementStyle(
  placement: ResolvedItemLayout,
  shift: RowShift = NO_SHIFT,
  fullBleed = false,
) {
  return {
    gridColumn: fullBleed ? FULL_BLEED_COLUMN : `${placement.x + 2} / span ${placement.w}`,
    gridRow: `${shift(placement.y) + 1} / span ${placement.h}`,
  };
}

/** Block content alignment; `safe` keeps content that overflows its cell from being cut at the top. */
const JUSTIFY_CONTENT: Record<ItemVerticalAlign, string> = {
  start: 'justify-content:flex-start',
  center: 'justify-content:center;justify-content:safe center',
  end: 'justify-content:flex-end;justify-content:safe flex-end',
};

/*
 * Responsive mode: every enabled breakpoint's placement is emitted as CSS variables and a
 * scoped `@container` stylesheet picks the active one. Layout is correct before hydration /
 * measurement (no desktop/mobile flash); JS only resolves per-breakpoint `data` patches.
 */
function gridSelector(scope: string): string {
  return `[data-vantage-preview="${scope}"]>.${preview['preview-section']}>.${preview['preview-grid']}`;
}

function hiddenRule(scope: string, bp: Breakpoint): string {
  return `${gridSelector(scope)}>[data-vp-hidden~="${bp}"]{display:none}`;
}

function placementRules(scope: string, bp: Breakpoint): string {
  const grid = gridSelector(scope);
  const vars = SECTION_VARS.map((name) => `--${name}:var(--vp-${bp}-${name})`).join(';');
  return (
    `${grid}{${vars}}` +
    `${grid}>.${preview['preview-block']}{grid-column:var(--vp-${bp}-col);grid-row:var(--vp-${bp}-row)}` +
    ITEM_VERTICAL_ALIGNS.map(
      (align) => `${grid}>[data-vp-valign~="${bp}-${align}"]{${JUSTIFY_CONTENT[align]}}`,
    ).join('')
  );
}

/**
 * Desktop placement applies unconditionally (the other ranges override it); desktop `hidden`
 * applies only above the widest non-desktop breakpoint. Each non-desktop breakpoint owns a
 * disjoint width range.
 */
function responsiveCss(scope: string, breakpoints: Breakpoint[], widths: BreakpointWidths): string {
  let css = placementRules(scope, 'desktop');
  let lower: number | undefined;
  const sorted = NON_DESKTOP_BREAKPOINTS.filter(
    (bp) => breakpoints.includes(bp) && widths[bp] !== undefined,
  ).sort((a, b) => (widths[a] ?? 0) - (widths[b] ?? 0));
  for (const bp of sorted) {
    const upper = widths[bp];
    const range =
      lower === undefined ? `(width <= ${upper}px)` : `(${lower}px < width <= ${upper}px)`;
    css += `@container ${range}{${placementRules(scope, bp)}${hiddenRule(scope, bp)}}`;
    lower = upper;
  }
  css +=
    lower === undefined
      ? hiddenRule(scope, 'desktop')
      : `@container (width > ${lower}px){${hiddenRule(scope, 'desktop')}}`;
  return css;
}

type PreviewItemProps = {
  item: GridItem;
  section: Section;
  breakpoint: Breakpoint;
  enabledBreakpoints: Breakpoint[];
  style: React.CSSProperties;
  hiddenOn?: string;
  /** Responsive mode: `<breakpoint>-<align>` tokens. */
  alignOn?: string;
  /** Single-breakpoint mode: the alignment in use. */
  align?: ItemVerticalAlign;
  components: ResolvedComponentRegistry;
  /** Arrangement section: the block is as tall as its content (or its aspect ratio). */
  flow?: boolean;
};

function PreviewItem({
  item,
  section,
  breakpoint,
  enabledBreakpoints,
  style,
  hiddenOn,
  alignOn,
  align,
  components,
  flow,
}: PreviewItemProps) {
  const resolveEntity = useResolveItemData();
  const data = resolveEffectiveItemData(
    item,
    section,
    breakpoint,
    enabledBreakpoints,
    resolveEntity?.(item),
  );
  const resolvedItem = { ...item, data };
  const Renderer = resolveRenderer(components, resolvedItem, 'preview');
  const descriptor = components[item.kind];
  const kindClass = descriptor?.previewWrapperClass ?? '';
  const aspectRatio = flow ? descriptor?.arrangementAspectRatio?.(resolvedItem) : undefined;

  return (
    <div
      className={[preview['preview-block'], flow ? preview['preview-block--flow'] : '', kindClass]
        .filter(Boolean)
        .join(' ')}
      style={aspectRatio ? { ...style, aspectRatio } : style}
      data-vp-hidden={hiddenOn}
      data-vp-valign={alignOn}
      data-valign={align}
    >
      {createElement(Renderer, { item: resolvedItem })}
    </div>
  );
}

type PreviewSectionProps = {
  section: Section;
  breakpoint: Breakpoint;
  enabledBreakpoints: Breakpoint[];
  /** Breakpoints rendered via CSS; `null` renders `breakpoint` inline. */
  responsive: Breakpoint[] | null;
  components: ResolvedComponentRegistry;
  isItemVisible?: (item: GridItem) => boolean;
};

function PreviewSection({
  section,
  breakpoint,
  enabledBreakpoints,
  responsive,
  components,
  isItemVisible,
}: PreviewSectionProps) {
  const visibleItems = isItemVisible ? section.items.filter(isItemVisible) : section.items;
  // DOM (and tab / screen-reader) order follows the reading order of the breakpoint in use
  // (desktop before measurement). CSS `order` keeps the stacking order for painting.
  const arrangement = section.arrangement;
  const readingOrder = arrangement
    ? visibleItems.map((item, stackIndex) => ({ item, stackIndex }))
    : sortByReadingOrder(
        visibleItems.map((item) => ({
          item,
          fullBleed: item.fullBleed,
          placement: resolveItem(item, section, breakpoint, enabledBreakpoints),
        })),
      );
  // Arrangement: slot of each block shown on a breakpoint; a block without one is hidden there.
  const slots = arrangement
    ? Object.fromEntries(
        (responsive ?? [breakpoint]).map((bp) => [
          bp,
          arrangementSlots(
            visibleItems.filter(
              (item) => !resolveItem(item, section, bp, enabledBreakpoints).hidden,
            ),
            arrangement,
            bp,
          ),
        ]),
      )
    : null;
  const filteredItems = isItemVisible
    ? section.items.filter((item) => !visibleItems.includes(item))
    : [];
  const shifts = Object.fromEntries(
    (responsive ?? [breakpoint]).map((bp) => [
      bp,
      rowShiftFor(visibleItems, filteredItems, section, bp, enabledBreakpoints),
    ]),
  ) as Partial<Record<Breakpoint, RowShift>>;

  const tokens = useVantageTokens();
  const cellMaxPx = parsePxToken(tokens['--vantage-cell-max-px'], CELL_MAX_PX);
  const rowMaxPx = parsePxToken(tokens['--vantage-row-max-px'], ROW_MAX_PX);

  const layoutAt = (bp: Breakpoint) =>
    arrangement
      ? arrangementSectionLayout(section, bp, enabledBreakpoints)
      : resolveSection(section, bp, enabledBreakpoints);
  const gridVars = responsive
    ? Object.assign(
        {},
        ...responsive.map((bp) => sectionVars(layoutAt(bp), `vp-${bp}-`, shifts[bp])),
      )
    : sectionVars(layoutAt(breakpoint), '', shifts[breakpoint]);

  return (
    <div className={preview['preview-section']}>
      <div
        className={[
          preview['preview-grid'],
          section.fillScreen ? preview['preview-grid--fill'] : '',
          arrangement ? preview['preview-grid--flow'] : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={
          {
            ...gridVars,
            alignContent: section.fillScreen ? (section.verticalAlign ?? 'start') : undefined,
            alignItems: arrangement
              ? arrangement.equalHeight
                ? 'stretch'
                : FLOW_ALIGN_ITEMS[arrangement.verticalAlign ?? 'start']
              : undefined,
            '--row-ratio': cellMaxPx > 0 ? rowMaxPx / cellMaxPx : 1,
          } as React.CSSProperties
        }
      >
        <SectionBackground
          background={section.background}
          className={preview['preview-section__bg']}
        />
        {readingOrder.map(({ item, stackIndex }) => {
          let style: Record<string, string | number>;
          let hiddenOn: string | undefined;
          let alignOn: string | undefined;
          let align: ItemVerticalAlign | undefined;
          if (responsive) {
            style = {};
            const hidden: Breakpoint[] = [];
            for (const bp of responsive) {
              const placement = resolveItem(item, section, bp, enabledBreakpoints);
              const slot = slots?.[bp]?.get(item.id);
              const { gridColumn, gridRow } = slots
                ? slot
                  ? slotStyle(slot)
                  : { gridColumn: 'auto', gridRow: 'auto' }
                : placementStyle(placement, shifts[bp], item.fullBleed);
              style[`--vp-${bp}-col`] = gridColumn;
              style[`--vp-${bp}-row`] = gridRow;
              if (slots ? !slot : placement.hidden) hidden.push(bp);
            }
            if (hidden.length === responsive.length) return null;
            hiddenOn = hidden.length > 0 ? hidden.join(' ') : undefined;
            const aligns = itemVerticalAlignByBreakpoint(
              item,
              section,
              responsive,
              enabledBreakpoints,
            );
            alignOn =
              aligns && !slots
                ? Object.entries(aligns)
                    .map(([bp, value]) => `${bp}-${value}`)
                    .join(' ')
                : undefined;
          } else if (slots) {
            const slot = slots[breakpoint]?.get(item.id);
            if (!slot) return null;
            style = slotStyle(slot);
          } else {
            const placement = resolveItem(item, section, breakpoint, enabledBreakpoints);
            if (placement.hidden) return null;
            style = placementStyle(placement, shifts[breakpoint], item.fullBleed);
            align = resolveItemVerticalAlign(item, section, breakpoint, enabledBreakpoints);
          }
          style.order = stackIndex;
          return (
            <PreviewItem
              key={item.id}
              item={item}
              section={section}
              breakpoint={breakpoint}
              enabledBreakpoints={enabledBreakpoints}
              style={style as React.CSSProperties}
              hiddenOn={hiddenOn}
              alignOn={alignOn}
              align={align}
              components={components}
              flow={arrangement !== undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

export function VantagePreview({
  value,
  components: componentsProp,
  className,
  breakpoint: breakpointProp,
  isItemVisible,
  emptyState,
}: VantagePreviewProps) {
  const components = useMemo(() => resolveRegistry(componentsProp), [componentsProp]);
  const enabledBreakpoints = useMemo(() => getEnabledBreakpoints(value), [value]);
  const { containerRef, containerWidth } = useContainerWidth<HTMLDivElement>();
  const scope = useId();
  const forced =
    breakpointProp && enabledBreakpoints.includes(breakpointProp) ? breakpointProp : undefined;
  // Unmeasured (SSR / first render): desktop data; CSS already handles placement.
  const autoBreakpoint =
    containerWidth > 0 ? resolveBreakpointFromLayout(containerWidth, value) : 'desktop';
  const breakpoint = forced ?? autoBreakpoint;
  const responsive = !forced && enabledBreakpoints.length > 1 ? enabledBreakpoints : null;
  const css = useMemo(
    () => (responsive ? responsiveCss(scope, responsive, getBreakpointWidths(value)) : null),
    [responsive, scope, value],
  );

  const registryEmpty = Object.keys(components).length === 0;
  const tokens = useVantageTokens();
  const root = vantageRootProps(tokens, [preview.preview, className].filter(Boolean).join(' '));

  return (
    <div
      ref={containerRef}
      className={root.className}
      style={root.style}
      data-vantage-preview={responsive ? scope : undefined}
    >
      {css ? <style>{css}</style> : null}
      {registryEmpty ? (
        <div className={preview['preview-empty']}>
          <p>No components registered.</p>
        </div>
      ) : value.sections.length === 0 ? (
        emptyState === undefined ? (
          <div className={preview['preview-empty']}>
            <p>Nothing to preview yet.</p>
          </div>
        ) : emptyState === null || emptyState === false ? null : (
          <div className={preview['preview-empty']}>{emptyState}</div>
        )
      ) : (
        value.sections.map((section) => (
          <PreviewSection
            key={section.id}
            section={section}
            breakpoint={breakpoint}
            enabledBreakpoints={enabledBreakpoints}
            responsive={responsive}
            components={components}
            isItemVisible={isItemVisible}
          />
        ))
      )}
    </div>
  );
}
