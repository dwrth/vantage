import { describe, expect, it } from 'vitest';
import { DEFAULT_BLOCK_ANNOUNCEMENTS, DEFAULT_BLOCK_LABELS, withDefaults } from './keyboardLabels';

describe('withDefaults', () => {
  it('returns a copy of the defaults without host labels', () => {
    const merged = withDefaults(DEFAULT_BLOCK_LABELS);
    expect(merged).toEqual(DEFAULT_BLOCK_LABELS);
    expect(merged).not.toBe(DEFAULT_BLOCK_LABELS);
  });

  it('lets host labels win and keeps defaults for undefined entries', () => {
    const merged = withDefaults(DEFAULT_BLOCK_LABELS, {
      roleDescription: 'Baustein',
      moveBelow: undefined,
    });
    expect(merged.roleDescription).toBe('Baustein');
    expect(merged.moveBelow).toBe('Move below');
  });
});

describe('default announcements', () => {
  it('words the selection count', () => {
    const ctx = (count: number) => ({ count, items: [] });
    expect(DEFAULT_BLOCK_ANNOUNCEMENTS.selectionChanged(ctx(0))).toBe('Selection cleared');
    expect(DEFAULT_BLOCK_ANNOUNCEMENTS.selectionChanged(ctx(1))).toBe('1 block selected');
    expect(DEFAULT_BLOCK_ANNOUNCEMENTS.selectionChanged(ctx(3))).toBe('3 blocks selected');
  });
});
