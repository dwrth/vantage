/**
 * Text the builder generates itself: names given to new sections and blocks, and a few fallbacks.
 * Hosts replace them (e.g. to translate); the English defaults only apply when nothing is passed.
 * The labels of the section toolbar and of blocks have their own types (`SectionActionLabels`,
 * `BlockLabels`).
 */
export type DefaultLabels = {
  /** Label of a section created by `addSection` / `insertSection`. `position` is 1-based: the new section count. */
  section: (position: number) => string;
  /** Label of a block created by `addItem`. `baseLabel` is the kind's `defaults.label`, else the capitalised kind; `position` counts blocks of that kind in the section. */
  block: (baseLabel: string, position: number) => string;
  /** Stands in for the name of a section without a label, inside sentences such as "Move … up". */
  unnamedSection: string;
  /** Tooltip of the drag handle of a block without a label. */
  dragHandle: string;
  /** Accessible name of a section's bottom resize edge, unless `sectionResizeLabel` is set. */
  resizeSectionHeight: (sectionName: string) => string;
  /** Empty canvas message. */
  noSections: string;
  /** Empty canvas button that adds the first section. */
  addSection: string;
};

export const DEFAULT_LABELS: DefaultLabels = {
  section: (position) => `Section ${position}`,
  block: (baseLabel, position) => `${baseLabel} ${position}`,
  unnamedSection: 'section',
  dragHandle: 'Drag',
  resizeSectionHeight: (name) => `Resize ${name} height`,
  noSections: 'No sections yet.',
  addSection: 'Add section',
};
