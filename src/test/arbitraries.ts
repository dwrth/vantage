import fc from 'fast-check';
import { ARRANGEMENT_ALIGNS, ARRANGEMENT_PRESET_IDS } from '../lib/arrangement';
import type { PlacementRect } from '../lib/grid';
import {
  ITEM_VERTICAL_ALIGNS,
  NON_DESKTOP_BREAKPOINTS,
  type Breakpoint,
  type BreakpointWidths,
  type GridItem,
  type ItemOverride,
  type Layout,
  type Section,
  type SectionArrangement,
  type SectionOverride,
} from '../types';

export type NonDesktopBreakpoint = Exclude<Breakpoint, 'desktop'>;

export type RawRect = PlacementRect;

export const arbBreakpoints: fc.Arbitrary<Breakpoint[]> = fc
  .record({ tablet: fc.boolean(), mobile: fc.boolean() })
  .map(({ tablet, mobile }) => [
    'desktop',
    ...(tablet ? (['tablet'] as const) : []),
    ...(mobile ? (['mobile'] as const) : []),
  ]);

export function arbBreakpointWidths(
  breakpoints: Breakpoint[],
  { ordered }: { ordered: boolean },
): fc.Arbitrary<BreakpointWidths> {
  return fc
    .record({ mobile: fc.integer({ min: 1, max: 900 }), tablet: fc.integer({ min: 1, max: 900 }) })
    .map(({ mobile, tablet }) => {
      const widths: BreakpointWidths = {};
      if (breakpoints.includes('mobile')) widths.mobile = mobile;
      if (breakpoints.includes('tablet')) {
        widths.tablet = ordered && breakpoints.includes('mobile') ? mobile + tablet : tablet;
      }
      return widths;
    });
}

export const arbItemVerticalAlign = fc.constantFrom(...ITEM_VERTICAL_ALIGNS);

export const arbItemData: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
  fc.constantFrom('title', 'body', 'src', 'count'),
  fc.oneof(fc.string({ maxLength: 6 }), fc.integer({ min: 0, max: 9 }), fc.boolean()),
  { maxKeys: 2 },
);

export const arbKind = fc.constantFrom('text', 'image', 'button');

export function arbRect(columns: number, maxSize = 4, maxY = 8): fc.Arbitrary<RawRect> {
  return fc
    .record({
      w: fc.integer({ min: 1, max: Math.min(columns, maxSize) }),
      h: fc.integer({ min: 1, max: maxSize }),
      x: fc.nat({ max: columns - 1 }),
      y: fc.nat({ max: maxY }),
    })
    .map(({ w, h, x, y }) => ({ x: Math.min(x, columns - w), y, w, h }));
}

type ItemShape = {
  kind: string;
  rect: RawRect;
  label?: string;
  data?: Record<string, unknown>;
  hidden?: boolean;
  fullBleed?: boolean;
  verticalAlign?: GridItem['verticalAlign'];
};

function arbItemShape(
  columns: number,
  { fullBleed, hidden }: { fullBleed: boolean; hidden: boolean },
): fc.Arbitrary<ItemShape> {
  return fc.record(
    {
      kind: arbKind,
      rect: arbRect(columns),
      label: fc.string({ maxLength: 5 }),
      data: arbItemData,
      hidden: hidden ? fc.boolean() : fc.constant(false),
      fullBleed: fullBleed ? fc.boolean() : fc.constant(false),
      verticalAlign: arbItemVerticalAlign,
    },
    { requiredKeys: ['kind', 'rect'] },
  );
}

function fullWidth(rect: RawRect, columns: number, fullBleed: boolean | undefined): RawRect {
  return fullBleed ? { ...rect, x: 0, w: columns } : rect;
}

function toItem(id: string, shape: ItemShape, rect: RawRect): GridItem {
  const item: GridItem = { id, kind: shape.kind, ...rect };
  if (shape.label !== undefined) item.label = shape.label;
  if (shape.data !== undefined) item.data = shape.data;
  if (shape.hidden) item.hidden = true;
  if (shape.fullBleed) item.fullBleed = true;
  if (shape.verticalAlign !== undefined) item.verticalAlign = shape.verticalAlign;
  return item;
}

type ItemOverrideShape = {
  hidden?: boolean;
  data?: Record<string, unknown>;
  verticalAlign?: GridItem['verticalAlign'];
};

const arbItemOverrideShape: fc.Arbitrary<ItemOverrideShape> = fc.record(
  { hidden: fc.boolean(), data: arbItemData, verticalAlign: arbItemVerticalAlign },
  { requiredKeys: [] },
);

const arbGapFields = fc.record(
  {
    colGap: fc.integer({ min: 0, max: 24 }),
    rowGap: fc.integer({ min: 0, max: 24 }),
    paddingTop: fc.integer({ min: 0, max: 48 }),
    paddingBottom: fc.integer({ min: 0, max: 48 }),
  },
  { requiredKeys: [] },
);

function withoutEmpty(override: SectionOverride): SectionOverride | undefined {
  const next = { ...override };
  if (next.items && Object.keys(next.items).length === 0) delete next.items;
  return Object.keys(next).length > 0 ? next : undefined;
}

export type FreeGridSectionOptions = {
  id: string;
  breakpoints: Breakpoint[];
  maxItems?: number;
  maxColumns?: number;
  fullBleed?: boolean;
  hidden?: boolean;
};

/**
 * A free-grid section whose blocks may overlap on any breakpoint. Each enabled non-desktop
 * breakpoint either inherits the desktop placements (same column count) or gives every block an
 * explicit placement. Item ids are `${id}-i${n}`.
 */
export function arbFreeGridSection({
  id,
  breakpoints,
  maxItems = 6,
  maxColumns = 12,
  fullBleed = true,
  hidden = true,
}: FreeGridSectionOptions): fc.Arbitrary<Section> {
  return fc.integer({ min: 1, max: maxColumns }).chain((columns) =>
    fc
      .record({
        label: fc.option(fc.string({ maxLength: 8 }), { nil: undefined }),
        gaps: arbGapFields,
        shapes: fc.array(arbItemShape(columns, { fullBleed, hidden }), { maxLength: maxItems }),
        extraRows: fc.option(fc.nat({ max: 3 }), { nil: undefined }),
        perBreakpoint: fc.tuple(
          ...NON_DESKTOP_BREAKPOINTS.map(() =>
            fc.record({
              explicit: fc.boolean(),
              columns: fc.integer({ min: 1, max: maxColumns }),
              rects: fc.array(arbRect(maxColumns), { minLength: maxItems, maxLength: maxItems }),
              items: fc.array(arbItemOverrideShape, { minLength: maxItems, maxLength: maxItems }),
              gaps: arbGapFields,
              extraRows: fc.option(fc.nat({ max: 3 }), { nil: undefined }),
            }),
          ),
        ),
      })
      .map(({ label, gaps, shapes, extraRows, perBreakpoint }) => {
        const items = shapes.map((shape, index) => toItem(`${id}-i${index}`, shape, shape.rect));
        const desktopBottom = Math.max(0, ...items.map((r) => r.y + r.h));
        const section: Section = { id, columns, colGap: 8, rowGap: 8, ...gaps, items };
        if (label !== undefined) section.label = label;
        if (extraRows !== undefined) section.rows = Math.max(1, desktopBottom + extraRows);

        const overrides: NonNullable<Section['overrides']> = {};
        NON_DESKTOP_BREAKPOINTS.forEach((bp, bpIndex) => {
          if (!breakpoints.includes(bp)) return;
          const config = perBreakpoint[bpIndex]!;
          const bpColumns = config.explicit ? config.columns : columns;
          const override: SectionOverride = { ...config.gaps };
          if (bpColumns !== columns) override.columns = bpColumns;
          const bpRects = config.explicit
            ? items.map((item, index) => {
                const raw = config.rects[index]!;
                const w = Math.min(raw.w, bpColumns);
                const rect = { ...raw, w, x: Math.min(raw.x, bpColumns - w) };
                return fullWidth(rect, bpColumns, item.fullBleed);
              })
            : items;
          const itemOverrides: Record<string, ItemOverride> = {};
          items.forEach((item, index) => {
            const shape = config.items[index]!;
            const entry: ItemOverride = { ...shape };
            if (config.explicit) {
              const rect = bpRects[index]!;
              Object.assign(
                entry,
                item.fullBleed ? { ...rect, x: 0, w: Math.min(item.w, bpColumns) } : rect,
              );
            }
            if (Object.keys(entry).length > 0) itemOverrides[item.id] = entry;
          });
          override.items = itemOverrides;
          const bottom = Math.max(
            0,
            ...items.map((item, index) => {
              const rect = bpRects[index]!;
              return config.explicit ? rect.y + rect.h : item.y + item.h;
            }),
          );
          if (config.extraRows !== undefined)
            override.rows = Math.max(1, bottom + config.extraRows);
          const cleaned = withoutEmpty(override);
          if (cleaned) overrides[bp] = cleaned;
        });
        if (Object.keys(overrides).length > 0) section.overrides = overrides;
        return section;
      }),
  );
}

export const arbSectionArrangement: fc.Arbitrary<SectionArrangement> = fc.record(
  {
    preset: fc.constantFrom(...ARRANGEMENT_PRESET_IDS),
    align: fc.constantFrom(...ARRANGEMENT_ALIGNS),
    verticalAlign: fc.constantFrom(...ARRANGEMENT_ALIGNS),
    equalHeight: fc.boolean(),
    stackOn: fc.constantFrom('tablet' as const, 'mobile' as const),
    mobileOrder: fc.constantFrom('asis' as const, 'reversed' as const),
  },
  { requiredKeys: ['preset'] },
);

export type ArrangementSectionOptions = {
  id: string;
  breakpoints: Breakpoint[];
  maxItems?: number;
  hidden?: boolean;
};

/**
 * An arrangement section: 12 columns, no `rows`, overrides that only carry gaps and per-item
 * `hidden` / `data` / `verticalAlign`. Item ids are `${id}-i${n}`.
 */
export function arbArrangementSection({
  id,
  breakpoints,
  maxItems = 6,
  hidden = true,
}: ArrangementSectionOptions): fc.Arbitrary<Section> {
  return fc
    .record({
      arrangement: arbSectionArrangement,
      label: fc.option(fc.string({ maxLength: 8 }), { nil: undefined }),
      shapes: fc.array(arbItemShape(12, { fullBleed: false, hidden }), { maxLength: maxItems }),
      perBreakpoint: fc.tuple(
        ...NON_DESKTOP_BREAKPOINTS.map(() =>
          fc.record({
            gaps: arbGapFields,
            items: fc.array(arbItemOverrideShape, { minLength: maxItems, maxLength: maxItems }),
          }),
        ),
      ),
    })
    .map(({ arrangement, label, shapes, perBreakpoint }) => {
      const items = shapes.map((shape, index) => toItem(`${id}-i${index}`, shape, shape.rect));
      const section: Section = { id, columns: 12, colGap: 8, rowGap: 8, items, arrangement };
      if (label !== undefined) section.label = label;
      const overrides: NonNullable<Section['overrides']> = {};
      NON_DESKTOP_BREAKPOINTS.forEach((bp, bpIndex) => {
        if (!breakpoints.includes(bp)) return;
        const config = perBreakpoint[bpIndex]!;
        const itemOverrides: Record<string, ItemOverride> = {};
        items.forEach((item, index) => {
          const entry = config.items[index]!;
          if (Object.keys(entry).length > 0) itemOverrides[item.id] = { ...entry };
        });
        const cleaned = withoutEmpty({ ...config.gaps, items: itemOverrides });
        if (cleaned) overrides[bp] = cleaned;
      });
      if (Object.keys(overrides).length > 0) section.overrides = overrides;
      return section;
    });
}

export type LayoutOptions = {
  minSections?: number;
  maxSections?: number;
  maxItems?: number;
  /** Share of sections that are arrangements, 0..1. */
  arrangements?: number;
  breakpoints?: fc.Arbitrary<Breakpoint[]>;
  fullBleed?: boolean;
  hidden?: boolean;
};

export function arbSectionKind(arrangementShare: number): fc.Arbitrary<'grid' | 'arrangement'> {
  const arrangement = Math.round(Math.min(1, Math.max(0, arrangementShare)) * 10);
  if (arrangement === 0) return fc.constant('grid');
  if (arrangement === 10) return fc.constant('arrangement');
  return fc.oneof(
    { arbitrary: fc.constant('grid' as const), weight: 10 - arrangement },
    { arbitrary: fc.constant('arrangement' as const), weight: arrangement },
  );
}

/**
 * A layout that `validateLayout` accepts, with unique section ids `s${n}` and item ids
 * `s${n}-i${m}`. Blocks of free-grid sections may overlap (see `arbFreeGridSection`).
 */
export function arbLayout({
  minSections = 1,
  maxSections = 3,
  maxItems = 6,
  arrangements = 0.3,
  breakpoints = arbBreakpoints,
  fullBleed = true,
  hidden = true,
}: LayoutOptions = {}): fc.Arbitrary<Layout> {
  return breakpoints.chain((bps) =>
    fc
      .record({
        kinds: fc.array(arbSectionKind(arrangements), {
          minLength: minSections,
          maxLength: maxSections,
        }),
        widths: arbBreakpointWidths(bps, { ordered: true }),
        previewWidths: arbBreakpointWidths(bps, { ordered: false }),
      })
      .chain(({ kinds, widths, previewWidths }) =>
        fc
          .tuple(
            ...kinds.map((kind, index) =>
              kind === 'arrangement'
                ? arbArrangementSection({ id: `s${index}`, breakpoints: bps, maxItems, hidden })
                : arbFreeGridSection({
                    id: `s${index}`,
                    breakpoints: bps,
                    maxItems,
                    fullBleed,
                    hidden,
                  }),
            ),
          )
          .map(
            (sections): Layout => ({
              sections,
              breakpoints: bps,
              breakpointWidths: widths,
              breakpointPreviewWidths: previewWidths,
            }),
          ),
      ),
  );
}

export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
