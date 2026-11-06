import fc from 'fast-check';
import { getEnabledBreakpoints } from '../lib/breakpoint';
import { setSectionArrangement } from '../mutations/arrangement';
import { alignItems, GROUP_ALIGNMENTS, moveItems, removeItems } from '../mutations/group';
import {
  addItem,
  addSection,
  autoArrangeBreakpoint,
  bringItemForward,
  bringItemToFront,
  clearItemOverride,
  clearSectionOverride,
  copyItems,
  duplicateItem,
  duplicateItems,
  duplicateSection,
  exportLayout,
  importLayout,
  insertSection,
  moveItem,
  moveItemBelowOverlaps,
  moveItemToIndex,
  moveItemToSection,
  moveSection,
  moveSectionBy,
  pasteItems,
  removeItem,
  removeSection,
  reorderItemAtIndex,
  resizeItem,
  resizeSection,
  sendItemBackward,
  sendItemToBack,
  setBreakpointPreviewWidth,
  setBreakpointWidth,
  setItemAllowOverlap,
  setItemFullBleed,
  setItemHidden,
  setItemVerticalAlign,
  setLayoutBreakpoints,
  setSectionOverride,
  updateItemData,
  updateItemMeta,
  updateLayoutMeta,
  updateSection,
  updateSectionMeta,
} from '../mutations/layout';
import {
  BREAKPOINTS,
  ITEM_VERTICAL_ALIGNS,
  NON_DESKTOP_BREAKPOINTS,
  type Breakpoint,
  type GridItem,
  type Layout,
  type Section,
} from '../types';
import { arbSectionArrangement } from './arbitraries';

export const LAYOUT_OP_NAMES = [
  'addSection',
  'insertSection',
  'moveSection',
  'moveSectionBy',
  'duplicateSection',
  'removeSection',
  'updateSection',
  'updateLayoutMeta',
  'updateSectionMeta',
  'updateItemMeta',
  'updateItemData',
  'setSectionOverride',
  'clearSectionOverride',
  'clearItemOverride',
  'setItemHidden',
  'setItemFullBleed',
  'setItemAllowOverlap',
  'setItemVerticalAlign',
  'moveItemBelowOverlaps',
  'addItem',
  'moveItem',
  'moveItemToSection',
  'resizeItem',
  'resizeSection',
  'removeItem',
  'bringItemForward',
  'sendItemBackward',
  'bringItemToFront',
  'sendItemToBack',
  'reorderItemAtIndex',
  'moveItemToIndex',
  'duplicateItems',
  'duplicateItem',
  'pasteItems',
  'setLayoutBreakpoints',
  'setBreakpointWidth',
  'setBreakpointPreviewWidth',
  'autoArrangeBreakpoint',
  'importExport',
  'setSectionArrangement',
  'moveItems',
  'alignItems',
  'removeItems',
] as const;

export type LayoutOpName = (typeof LAYOUT_OP_NAMES)[number];

/** Ops that only make sense on a free grid (placement and fixed rows). */
export const GRID_ONLY_OPS: ReadonlySet<LayoutOpName> = new Set([
  'moveItem',
  'resizeItem',
  'resizeSection',
  'moveItems',
  'alignItems',
  'moveItemBelowOverlaps',
]);

/** Section ids an op may change; `all` for whole-layout ops. Other sections keep their reference. */
export type Touched = string[] | 'all';

export type LayoutOp = {
  name: LayoutOpName;
  section: number;
  other: number;
  item: number;
  item2: number;
  breakpoint: number;
  x: number;
  y: number;
  w: number;
  h: number;
  flag: boolean;
  place: boolean;
  atIndex: boolean;
  arrangement: Parameters<typeof setSectionArrangement>[2];
  breakpoints: Breakpoint[];
};

export function arbLayoutOp(names: readonly LayoutOpName[] = LAYOUT_OP_NAMES) {
  return fc.record<LayoutOp>({
    name: fc.constantFrom(...names),
    section: fc.nat({ max: 7 }),
    other: fc.nat({ max: 7 }),
    item: fc.nat({ max: 15 }),
    item2: fc.nat({ max: 15 }),
    breakpoint: fc.nat({ max: 5 }),
    x: fc.integer({ min: -2, max: 14 }),
    y: fc.integer({ min: -2, max: 12 }),
    w: fc.integer({ min: -1, max: 14 }),
    h: fc.integer({ min: -1, max: 6 }),
    flag: fc.boolean(),
    place: fc.boolean(),
    atIndex: fc.boolean(),
    arrangement: fc.option(arbSectionArrangement, { nil: null }),
    breakpoints: fc.subarray([...BREAKPOINTS]),
  });
}

const pick = <T>(list: readonly T[], n: number): T | undefined =>
  list.length === 0 ? undefined : list[n % list.length];

export type AppliedOp = { layout: Layout; touched: Touched; skipped?: boolean };

/**
 * Apply `op` to `layout`, picking sections, items and breakpoints by index modulo what exists.
 * Grid-only ops on an arrangement section, and item ops on an empty section, are skipped
 * (`skipped`, layout returned as is).
 */
export function applyLayoutOp(layout: Layout, op: LayoutOp): AppliedOp {
  const enabled = getEnabledBreakpoints(layout);
  const nonDesktop = NON_DESKTOP_BREAKPOINTS.filter((bp) => enabled.includes(bp));
  const bp = pick(enabled, op.breakpoint)!;
  const ndBp = pick(nonDesktop, op.breakpoint);
  const section: Section | undefined = pick(layout.sections, op.section);
  const other: Section | undefined = pick(layout.sections, op.other);
  const item: GridItem | undefined = section && pick(section.items, op.item);
  const item2: GridItem | undefined = section && pick(section.items, op.item2);
  const skip: AppliedOp = { layout, touched: [], skipped: true };
  const only = (s: Section) => [s.id];

  if (GRID_ONLY_OPS.has(op.name) && section?.arrangement) return skip;

  switch (op.name) {
    case 'addSection':
      return {
        layout: addSection(layout, op.arrangement ? { arrangement: op.arrangement } : {}).layout,
        touched: [],
      };
    case 'insertSection':
      return {
        layout: insertSection(layout, op.x, op.flag ? { label: (n) => `Part ${n}` } : {}).layout,
        touched: [],
      };
    case 'moveSection':
      return section ? { layout: moveSection(layout, section.id, op.x), touched: [] } : skip;
    case 'moveSectionBy':
      return section ? { layout: moveSectionBy(layout, section.id, op.h), touched: [] } : skip;
    case 'duplicateSection':
      return section ? { layout: duplicateSection(layout, section.id).layout, touched: [] } : skip;
    case 'removeSection':
      return section ? { layout: removeSection(layout, section.id), touched: [] } : skip;
    case 'updateSection':
      return section
        ? {
            layout: updateSection(layout, section.id, {
              label: `L${op.x}`,
              fillScreen: op.flag,
              paddingTop: Math.max(0, op.y),
            }),
            touched: only(section),
          }
        : skip;
    case 'updateLayoutMeta':
      return { layout: updateLayoutMeta(layout, { [`k${op.x}`]: op.y }), touched: [] };
    case 'updateSectionMeta':
      return section
        ? { layout: updateSectionMeta(layout, section.id, { k: op.x }), touched: only(section) }
        : skip;
    case 'updateItemMeta':
      return section && item
        ? {
            layout: updateItemMeta(layout, section.id, item.id, { k: op.x }),
            touched: only(section),
          }
        : skip;
    case 'updateItemData':
      return section && item
        ? {
            layout: updateItemData(layout, section.id, item.id, { title: `t${op.x}` }, bp),
            touched: only(section),
          }
        : skip;
    case 'setSectionOverride':
      return section && ndBp
        ? {
            layout: setSectionOverride(layout, section.id, ndBp, {
              colGap: Math.max(0, op.x),
              ...(op.flag ? { paddingBottom: Math.max(0, op.y) } : {}),
            }),
            touched: only(section),
          }
        : skip;
    case 'clearSectionOverride':
      return section && ndBp
        ? { layout: clearSectionOverride(layout, section.id, ndBp), touched: only(section) }
        : skip;
    case 'clearItemOverride':
      return section && item && ndBp
        ? { layout: clearItemOverride(layout, section.id, ndBp, item.id), touched: only(section) }
        : skip;
    case 'setItemHidden':
      return section && item
        ? {
            layout: setItemHidden(layout, section.id, item.id, bp, op.flag),
            touched: only(section),
          }
        : skip;
    case 'setItemFullBleed':
      return section && item
        ? { layout: setItemFullBleed(layout, section.id, item.id, op.flag), touched: only(section) }
        : skip;
    case 'setItemAllowOverlap':
      return section && item
        ? {
            layout: setItemAllowOverlap(layout, section.id, item.id, op.flag),
            touched: only(section),
          }
        : skip;
    case 'setItemVerticalAlign':
      return section && item
        ? {
            layout: setItemVerticalAlign(
              layout,
              section.id,
              item.id,
              op.flag ? pick(ITEM_VERTICAL_ALIGNS, op.x + 2) : undefined,
              bp,
            ),
            touched: only(section),
          }
        : skip;
    case 'moveItemBelowOverlaps':
      return section && item
        ? { layout: moveItemBelowOverlaps(layout, section.id, item.id, bp), touched: only(section) }
        : skip;
    case 'addItem': {
      if (!section) return skip;
      const sameSectionId = op.flag && item ? { id: item.id } : {};
      return {
        layout: addItem(layout, section.id, op.flag ? 'text' : 'image', {
          ...sameSectionId,
          ...(op.w > 0 ? { w: op.w } : {}),
          ...(op.h > 0 ? { h: op.h } : {}),
          ...(op.place ? { x: op.x, y: op.y } : {}),
          ...(op.atIndex ? { index: op.item2 } : {}),
        }),
        touched: only(section),
      };
    }
    case 'moveItem':
      return section && item
        ? { layout: moveItem(layout, section.id, item.id, op.x, op.y, bp), touched: only(section) }
        : skip;
    case 'moveItemToSection':
      return section && item && other
        ? {
            layout: moveItemToSection(layout, section.id, item.id, other.id, {
              breakpoint: bp,
              ...(op.place ? { x: op.x, y: op.y } : {}),
              ...(op.atIndex ? { index: op.item2 } : {}),
            }),
            touched: [section.id, other.id],
          }
        : skip;
    case 'resizeItem':
      return section && item
        ? {
            layout: resizeItem(layout, section.id, item.id, op.x, op.y, op.w, op.h, bp),
            touched: only(section),
          }
        : skip;
    case 'resizeSection':
      return section
        ? { layout: resizeSection(layout, section.id, op.y, bp), touched: only(section) }
        : skip;
    case 'removeItem':
      return section && item
        ? { layout: removeItem(layout, section.id, item.id), touched: only(section) }
        : skip;
    case 'bringItemForward':
      return section && item
        ? { layout: bringItemForward(layout, section.id, item.id), touched: only(section) }
        : skip;
    case 'sendItemBackward':
      return section && item
        ? { layout: sendItemBackward(layout, section.id, item.id), touched: only(section) }
        : skip;
    case 'bringItemToFront':
      return section && item
        ? { layout: bringItemToFront(layout, section.id, item.id), touched: only(section) }
        : skip;
    case 'sendItemToBack':
      return section && item
        ? { layout: sendItemToBack(layout, section.id, item.id), touched: only(section) }
        : skip;
    case 'reorderItemAtIndex':
      return section
        ? {
            layout: reorderItemAtIndex(layout, section.id, op.item, op.item2),
            touched: only(section),
          }
        : skip;
    case 'moveItemToIndex':
      return section && item
        ? { layout: moveItemToIndex(layout, section.id, item.id, op.x), touched: only(section) }
        : skip;
    case 'duplicateItems':
      return section && item && item2
        ? {
            layout: duplicateItems(layout, section.id, [item.id, item2.id]).layout,
            touched: only(section),
          }
        : skip;
    case 'duplicateItem':
      return section && item
        ? { layout: duplicateItem(layout, section.id, item.id).layout, touched: only(section) }
        : skip;
    case 'pasteItems': {
      if (!section || !item || !other) return skip;
      const clipboard = copyItems(layout, section.id, [item.id]);
      if (!clipboard) return skip;
      return { layout: pasteItems(layout, other.id, clipboard).layout, touched: only(other) };
    }
    case 'setLayoutBreakpoints':
      return { layout: setLayoutBreakpoints(layout, op.breakpoints), touched: 'all' };
    case 'setBreakpointWidth':
      return ndBp
        ? { layout: setBreakpointWidth(layout, ndBp, op.x * 90), touched: [] }
        : { layout: setBreakpointWidth(layout, 'tablet', op.x), touched: [] };
    case 'setBreakpointPreviewWidth':
      return ndBp
        ? { layout: setBreakpointPreviewWidth(layout, ndBp, op.x * 60), touched: [] }
        : { layout: setBreakpointPreviewWidth(layout, 'mobile', op.x), touched: [] };
    case 'autoArrangeBreakpoint': {
      const target = ndBp ?? 'tablet';
      return op.flag && section
        ? { layout: autoArrangeBreakpoint(layout, target, section.id), touched: only(section) }
        : { layout: autoArrangeBreakpoint(layout, target), touched: 'all' };
    }
    case 'importExport':
      return { layout: importLayout(exportLayout(layout, {}), {}), touched: 'all' };
    case 'setSectionArrangement':
      return section
        ? {
            layout: setSectionArrangement(layout, section.id, op.arrangement),
            touched: only(section),
          }
        : skip;
    case 'moveItems':
      return section && item && item2
        ? {
            layout: moveItems(layout, section.id, [item.id, item2.id], op.x - 6, op.y - 5, bp),
            touched: only(section),
          }
        : skip;
    case 'alignItems':
      return section && item && item2
        ? {
            layout: alignItems(
              layout,
              section.id,
              [item.id, item2.id],
              pick(GROUP_ALIGNMENTS, op.x + 2)!,
              bp,
            ),
            touched: only(section),
          }
        : skip;
    case 'removeItems':
      return section && item && item2
        ? {
            layout: removeItems(layout, section.id, [item.id, item2.id, 'missing']),
            touched: only(section),
          }
        : skip;
  }
}
