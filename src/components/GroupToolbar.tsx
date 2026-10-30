import { useBuilderContext } from '../context/BuilderContext';
import { useBuilderActions } from '../hooks/useBuilderActions';
import type { PlacementRect } from '../lib/grid';
import { GROUP_ALIGNMENTS, type GroupAlignment } from '../mutations/group';
import builder from '../styles/builder.module.css';

// 16x16 strokes: a guide line and two bars that line up with it.
const ALIGN_ICON: Record<GroupAlignment, string> = {
  left: 'M2 1v14M4 4h9M4 10h5',
  center: 'M8 1v14M3 4h10M5 10h6',
  right: 'M14 1v14M3 4h9M7 10h5',
  top: 'M1 2h14M4 4v9M10 4v5',
  middle: 'M1 8h14M4 3v10M10 5v6',
  bottom: 'M1 14h14M4 3v9M10 7v5',
};

type GroupToolbarProps = {
  sectionId: string;
  itemIds: string[];
  /** Bounding box of the group on the active grid. */
  bounds: PlacementRect;
};

/** Dashed box around a multi-selection with align and delete buttons above it. */
export function GroupToolbar({ sectionId, itemIds, bounds }: GroupToolbarProps) {
  const { layout, blockLabels, announcements, announce, setSelection } = useBuilderContext();
  const { alignItems, removeItems } = useBuilderActions();
  const items = (layout.sections.find((s) => s.id === sectionId)?.items ?? []).filter((item) =>
    itemIds.includes(item.id),
  );
  const ctx = { count: items.length, items };
  const label = blockLabels.groupToolbar(items.length);

  return (
    <div
      className={builder['group-box']}
      data-vantage-group-box=""
      style={{
        gridColumn: `${bounds.x + 2} / span ${bounds.w}`,
        gridRow: `${bounds.y + 1} / span ${bounds.h}`,
      }}
    >
      <div
        className={builder['group-toolbar']}
        role="toolbar"
        aria-label={label}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span className={builder['group-toolbar__count']} aria-hidden="true">
          {label}
        </span>
        {GROUP_ALIGNMENTS.map((alignment) => (
          <button
            key={alignment}
            type="button"
            className={builder['group-toolbar__button']}
            aria-label={blockLabels.align(alignment)}
            title={blockLabels.align(alignment)}
            data-vantage-align={alignment}
            onClick={() => {
              alignItems(sectionId, itemIds, alignment);
              announce(announcements.groupAligned({ ...ctx, alignment }));
            }}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
              <path
                d={ALIGN_ICON[alignment]}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ))}
        <button
          type="button"
          className={[
            builder['group-toolbar__button'],
            builder['group-toolbar__button--danger'],
          ].join(' ')}
          aria-label={blockLabels.deleteSelection(items.length)}
          title={blockLabels.deleteSelection(items.length)}
          data-vantage-group-delete=""
          onClick={() => {
            removeItems(sectionId, itemIds);
            setSelection(null);
            announce(announcements.groupDeleted(ctx));
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
