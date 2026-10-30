import type { Section } from '../types';

/** Accessible names (and tooltips) of the section toolbar buttons, e.g. for translation. */
export type SectionActionLabels = {
  toolbar: (section: Section) => string;
  moveUp: (section: Section) => string;
  moveDown: (section: Section) => string;
  duplicate: (section: Section) => string;
  save: (section: Section) => string;
  insertBefore: (section: Section) => string;
};

const name = (section: Section) => section.label ?? 'section';

export const DEFAULT_SECTION_ACTION_LABELS: SectionActionLabels = {
  toolbar: (section) => `${name(section)} actions`,
  moveUp: (section) => `Move ${name(section)} up`,
  moveDown: (section) => `Move ${name(section)} down`,
  duplicate: (section) => `Duplicate ${name(section)}`,
  save: (section) => `Save ${name(section)} as template`,
  insertBefore: (section) => `Add section above ${name(section)}`,
};
