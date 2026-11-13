import { describe, expect, it } from 'vitest';
import type { Section } from '../types';
import { DEFAULT_SECTION_ACTION_LABELS as L } from './sectionActionLabels';

const section = (label?: string): Section => ({
  id: 's',
  label,
  columns: 12,
  colGap: 8,
  rowGap: 8,
  items: [],
});

describe('DEFAULT_SECTION_ACTION_LABELS', () => {
  it('embeds the section label', () => {
    const s = section('Hero');
    expect(L.toolbar(s)).toBe('Hero actions');
    expect(L.moveUp(s)).toBe('Move Hero up');
    expect(L.moveDown(s)).toBe('Move Hero down');
    expect(L.duplicate(s)).toBe('Duplicate Hero');
    expect(L.save(s)).toBe('Save Hero as template');
  });

  it('falls back to "section" when the label is missing', () => {
    const s = section();
    expect(L.toolbar(s)).toBe('section actions');
    expect(L.moveUp(s)).toBe('Move section up');
    expect(L.moveDown(s)).toBe('Move section down');
    expect(L.duplicate(s)).toBe('Duplicate section');
    expect(L.save(s)).toBe('Save section as template');
  });

  it('only falls back for undefined, not for an empty label', () => {
    expect(L.moveUp(section(''))).toBe('Move  up');
  });
});
