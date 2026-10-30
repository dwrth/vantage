import { describe, expect, it } from 'vitest';
import type { GridItem, Section } from '../types';
import { itemVerticalAlignByBreakpoint, resolveItemVerticalAlign } from './contentAlign';

const base: GridItem = { id: 'a', kind: 'block', x: 0, y: 0, w: 2, h: 2 };

function sectionWith(item: GridItem, overrides?: Section['overrides']): Section {
  return { id: 's', columns: 12, colGap: 8, rowGap: 8, items: [item], overrides };
}

describe('resolveItemVerticalAlign', () => {
  it('is undefined when nothing is set', () => {
    expect(resolveItemVerticalAlign(base, sectionWith(base), 'mobile')).toBeUndefined();
  });

  it('inherits the desktop value on tablet and mobile', () => {
    const item = { ...base, verticalAlign: 'center' as const };
    expect(resolveItemVerticalAlign(item, sectionWith(item), 'desktop')).toBe('center');
    expect(resolveItemVerticalAlign(item, sectionWith(item), 'mobile')).toBe('center');
  });

  it('prefers the breakpoint override', () => {
    const item = { ...base, verticalAlign: 'center' as const };
    const section = sectionWith(item, { mobile: { items: { a: { verticalAlign: 'end' } } } });
    expect(resolveItemVerticalAlign(item, section, 'mobile')).toBe('end');
    expect(resolveItemVerticalAlign(item, section, 'tablet')).toBe('center');
    expect(resolveItemVerticalAlign(item, section, 'desktop')).toBe('center');
  });

  it('ignores overrides of disabled breakpoints', () => {
    const section = sectionWith(base, { mobile: { items: { a: { verticalAlign: 'end' } } } });
    expect(resolveItemVerticalAlign(base, section, 'mobile', ['desktop'])).toBeUndefined();
  });
});

describe('itemVerticalAlignByBreakpoint', () => {
  it('is null when no breakpoint has a value', () => {
    expect(itemVerticalAlignByBreakpoint(base, sectionWith(base), ['desktop', 'mobile'])).toBe(
      null,
    );
  });

  it('lists only the breakpoints that have a value', () => {
    const section = sectionWith(base, { tablet: { items: { a: { verticalAlign: 'end' } } } });
    expect(itemVerticalAlignByBreakpoint(base, section, ['desktop', 'tablet', 'mobile'])).toEqual({
      tablet: 'end',
    });
  });
});
