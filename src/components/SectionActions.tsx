import type { ReactNode } from 'react';
import { useBuilderActions } from '../hooks/useBuilderActions';
import { useBuilderContext } from '../context/BuilderContext';
import { DEFAULT_SECTION_ACTION_LABELS } from '../lib/sectionActionLabels';
import type { Section } from '../types';
import builder from '../styles/builder.module.css';

const icon = (path: ReactNode) => (
  <svg
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

const ICONS = {
  up: icon(<path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />),
  down: icon(<path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" />),
  duplicate: icon(
    <>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 3.5v-.5A1.5 1.5 0 0 0 9 1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h.5" />
    </>,
  ),
  save: icon(
    <>
      <path d="M3.5 1.5h7l2.5 2.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2 13V3a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M5 1.5v3.5h5V1.5M5 14.5v-4.5h6v4.5" />
    </>,
  ),
  plus: icon(<path d="M8 3v10M3 8h10" />),
};

type SectionActionsProps = {
  section: Section;
};

/**
 * Builder chrome of a section: move up / down, duplicate and (when the host passes
 * `onSaveSection`) save (top right), and a button on the
 * section's top edge that inserts an empty section above it. Shown on hover or focus.
 */
export function SectionActions({ section }: SectionActionsProps) {
  const { layout, sectionActionLabels, onDuplicateSection, onSaveSection, showSectionToolbar } =
    useBuilderContext();
  const { moveSectionBy, duplicateSection, insertSection } = useBuilderActions();
  const labels = { ...DEFAULT_SECTION_ACTION_LABELS, ...sectionActionLabels };
  const index = layout.sections.findIndex((s) => s.id === section.id);
  const isFirst = index <= 0;
  const isLast = index === layout.sections.length - 1;

  const button = (label: string, content: ReactNode, onClick: () => void, disabled = false) => (
    <button
      type="button"
      className={builder['section-actions__button']}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {content}
    </button>
  );

  return (
    <>
      <div
        className={[builder['section-insert'], isFirst ? builder['section-insert--first'] : '']
          .filter(Boolean)
          .join(' ')}
      >
        {button(labels.insertBefore(section), ICONS.plus, () => insertSection(index))}
      </div>
      {showSectionToolbar ? (
        <div
          className={builder['section-actions']}
          role="toolbar"
          aria-label={labels.toolbar(section)}
        >
          {button(labels.moveUp(section), ICONS.up, () => moveSectionBy(section.id, -1), isFirst)}
          {button(labels.moveDown(section), ICONS.down, () => moveSectionBy(section.id, 1), isLast)}
          {button(labels.duplicate(section), ICONS.duplicate, () =>
            onDuplicateSection ? onDuplicateSection(section.id) : duplicateSection(section.id),
          )}
          {onSaveSection
            ? button(labels.save(section), ICONS.save, () => onSaveSection(section.id))
            : null}
        </div>
      ) : null}
    </>
  );
}
