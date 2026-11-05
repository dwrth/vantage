import { describe, expect, it } from 'vitest';
import { DEFAULT_LABELS } from './defaultLabels';

describe('DEFAULT_LABELS', () => {
  it('names sections by 1-based position', () => {
    expect(DEFAULT_LABELS.section(1)).toBe('Section 1');
    expect(DEFAULT_LABELS.section(12)).toBe('Section 12');
  });

  it('names blocks by base label and position', () => {
    expect(DEFAULT_LABELS.block('Text', 3)).toBe('Text 3');
    expect(DEFAULT_LABELS.block('Image gallery', 1)).toBe('Image gallery 1');
  });

  it('builds the resize label from the section name', () => {
    expect(DEFAULT_LABELS.resizeSectionHeight('Hero')).toBe('Resize Hero height');
    expect(DEFAULT_LABELS.resizeSectionHeight(DEFAULT_LABELS.unnamedSection)).toBe(
      'Resize section height',
    );
  });

  it('provides the static fallback texts', () => {
    expect(DEFAULT_LABELS.unnamedSection).toBe('section');
    expect(DEFAULT_LABELS.dragHandle).toBe('Drag');
    expect(DEFAULT_LABELS.noSections).toBe('No sections yet.');
    expect(DEFAULT_LABELS.addSection).toBe('Add section');
  });
});
