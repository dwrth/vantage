import { createElement, useId, useMemo } from 'react';
import {
  getBreakpointWidths,
  getEnabledBreakpoints,
  resolveBreakpointFromLayout,
  resolveItem,
  resolveSection,
  type ResolvedItemLayout,
  type ResolvedSectionLayout,
} from '../lib/breakpoint';
import { resolveEffectiveItemData } from '../lib/entities';
import { sortByReadingOrder } from '../lib/readingOrder';
import { resolveRenderer, resolveRegistry } from '../lib/registry';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { useResolveItemData } from '../hooks/useItemData';
import {
  NON_DESKTOP_BREAKPOINTS,
  type Breakpoint,
  type BreakpointWidths,
  type ComponentRegistry,
  type GridItem,
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

/*
 * Responsive mode: every enabled breakpoint's placement is emitted as CSS variables and a
 * scoped `@container` stylesheet picks the active one. Layout is correct before hydration /
 * measurement (no desktop/mobile flash); JS only resolves per-breakpoint `data` patches.
 */
function breakpointRules(scope: string, bp: Breakpoint): string {
  const grid = `[data-vantage-preview="${scope}"]>.${preview['preview-section']}>.${preview['preview-grid']}`;
  const vars = SECTION_VARS.map((name) => `--${name}:var(--vp-${bp}-${name})`).join(';');
  return (
    `${grid}{${vars}}` +
    `${grid}>.${preview['preview-block']}{grid-column:var(--vp-${bp}-col);grid-row:var(--vp-${bp}-row)}` +
    `${grid}>[data-vp-hidden~="${bp}"]{display:none}`
  );
}

/** Desktop rules apply unconditionally; each non-desktop breakpoint owns a disjoint width range. */
function responsiveCss(scope: string, breakpoints: Breakpoint[], widths: BreakpointWidths): string {
  let css = breakpointRules(scope, 'desktop');
  let lower: number | undefined;
  const sorted = NON_DESKTOP_BREAKPOINTS.filter(
    (bp) => breakpoints.includes(bp) && widths[bp] !== undefined,
  ).sort((a, b) => (widths[a] ?? 0) - (widths[b] ?? 0));
  for (const bp of sorted) {
    const upper = widths[bp];
    const range =
      lower === undefined ? `(width <= ${upper}px)` : `(${lower}px < width <= ${upper}px)`;
    css += `@container ${range}{${breakpointRules(scope, bp)}}`;
    lower = upper;
  }
  return css;
}

type PreviewItemProps = {
  item: GridItem;
  section: Section;
  breakpoint: Breakpoint;
  enabledBreakpoints: Breakpoint[];
  style: React.CSSProperties;
  hiddenOn?: string;
  components: ResolvedComponentRegistry;
};

function PreviewItem({
  item,
  section,
  breakpoint,
  enabledBreakpoints,
  style,
  hiddenOn,
  components,
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

  return (
    <div
      className={[preview['preview-block'], kindClass].filter(Boolean).join(' ')}
      style={style}
      data-vp-hidden={hiddenOn}
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
  const readingOrder = sortByReadingOrder(
    visibleItems.map((item) => ({
      item,
      fullBleed: item.fullBleed,
      placement: resolveItem(item, section, breakpoint, enabledBreakpoints),
    })),
  );
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

  const gridVars = responsive
    ? Object.assign(
        {},
        ...responsive.map((bp) =>
          sectionVars(resolveSection(section, bp, enabledBreakpoints), `vp-${bp}-`, shifts[bp]),
        ),
      )
    : sectionVars(resolveSection(section, breakpoint, enabledBreakpoints), '', shifts[breakpoint]);

  return (
    <div className={preview['preview-section']}>
      <div
        className={[
          preview['preview-grid'],
          section.fillScreen ? preview['preview-grid--fill'] : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={
          {
            ...gridVars,
            alignContent: section.fillScreen ? (section.verticalAlign ?? 'start') : undefined,
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
          if (responsive) {
            style = {};
            const hidden: Breakpoint[] = [];
            for (const bp of responsive) {
              const placement = resolveItem(item, section, bp, enabledBreakpoints);
              const { gridColumn, gridRow } = placementStyle(placement, shifts[bp], item.fullBleed);
              style[`--vp-${bp}-col`] = gridColumn;
              style[`--vp-${bp}-row`] = gridRow;
              if (placement.hidden) hidden.push(bp);
            }
            if (hidden.length === responsive.length) return null;
            hiddenOn = hidden.length > 0 ? hidden.join(' ') : undefined;
          } else {
            const placement = resolveItem(item, section, breakpoint, enabledBreakpoints);
            if (placement.hidden) return null;
            style = placementStyle(placement, shifts[breakpoint], item.fullBleed);
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
              components={components}
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
        <div className={preview['preview-empty']}>
          <p>Nothing to preview yet.</p>
        </div>
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
