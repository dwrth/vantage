import {
  BREAKPOINTS,
  type Breakpoint,
  type GridItem,
  type ItemVerticalAlign,
  type Section,
} from '../types';

/**
 * Vertical content alignment of `item` at `breakpoint`: the breakpoint's override, else the
 * item's own value. `undefined` when neither is set (the kind's own styling decides).
 */
export function resolveItemVerticalAlign(
  item: GridItem,
  section: Section,
  breakpoint: Breakpoint,
  enabled: Breakpoint[] = BREAKPOINTS,
): ItemVerticalAlign | undefined {
  if (breakpoint !== 'desktop' && enabled.includes(breakpoint)) {
    const override = section.overrides?.[breakpoint]?.items?.[item.id]?.verticalAlign;
    if (override !== undefined) return override;
  }
  return item.verticalAlign;
}

/**
 * Vertical alignment of `item` on every breakpoint in `breakpoints`, or `null` when it is unset
 * on all of them. Renderers emit alignment styles only for items that have one, so kinds keep
 * their own default alignment otherwise.
 */
export function itemVerticalAlignByBreakpoint(
  item: GridItem,
  section: Section,
  breakpoints: Breakpoint[],
  enabled: Breakpoint[] = BREAKPOINTS,
): Partial<Record<Breakpoint, ItemVerticalAlign>> | null {
  const result: Partial<Record<Breakpoint, ItemVerticalAlign>> = {};
  let any = false;
  for (const bp of breakpoints) {
    const align = resolveItemVerticalAlign(item, section, bp, enabled);
    if (align !== undefined) {
      result[bp] = align;
      any = true;
    }
  }
  return any ? result : null;
}
