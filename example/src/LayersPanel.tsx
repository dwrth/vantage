import { useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  addSection,
  bringItemToFront,
  clearItemOverride,
  removeItem,
  reorderItemAtIndex,
  resolveItem,
  sendItemToBack,
  setItemHidden,
  type Breakpoint,
  type GridItem,
  type Layout,
  type SelectionRef,
} from 'vantage';
import s from './LayersPanel.module.css';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const KIND_COLORS: Record<string, string> = {
  text: '#6366f1',
  image: '#059669',
  button: '#d97706',
  input: '#7c3aed',
  form: '#db2777',
  card: '#0891b2',
  block: '#64748b',
};

const ID_SEP = '::';
const rowId = (sectionId: string, itemId: string) => `${sectionId}${ID_SEP}${itemId}`;
const parseRowId = (id: string): { sectionId: string; itemId: string } | null => {
  const idx = id.indexOf(ID_SEP);
  if (idx < 0) return null;
  return {
    sectionId: id.slice(0, idx),
    itemId: id.slice(idx + ID_SEP.length),
  };
};

type LayersPanelProps = {
  layout: Layout;
  onChange: (layout: Layout) => void;
  selection: SelectionRef | null;
  onSelectionChange: (next: SelectionRef | null) => void;
  activeBreakpoint: Breakpoint;
};

function updateItemLabel(layout: Layout, sectionId: string, itemId: string, label: string): Layout {
  return {
    ...layout,
    sections: layout.sections.map((section) =>
      section.id !== sectionId
        ? section
        : {
            ...section,
            items: section.items.map((item) => (item.id === itemId ? { ...item, label } : item)),
          },
    ),
  };
}

type RowProps = {
  sectionId: string;
  item: GridItem;
  isSelected: boolean;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDelete: () => void;
  onToggleHidden: () => void;
  onResetPlacement: () => void;
  isHidden: boolean;
  canEditBreakpoint: boolean;
};

function SortableRow({
  sectionId,
  item,
  isSelected,
  isEditing,
  editValue,
  onEditValueChange,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onBringToFront,
  onSendToBack,
  onDelete,
  onToggleHidden,
  onResetPlacement,
  isHidden,
  canEditBreakpoint,
}: RowProps) {
  const id = rowId(sectionId, item.id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isEditing,
  });

  const displayLabel = item.label ?? item.kind;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      className={cx(
        s.row,
        isSelected && s.rowSelected,
        isDragging && s.rowDragging,
        isHidden && s.rowHidden,
      )}
      style={style}
      onClick={onSelect}
      onDoubleClick={onStartRename}
      {...attributes}
      {...listeners}
    >
      <span
        className={s.kindDot}
        style={{ background: KIND_COLORS[item.kind] ?? '#94a3b8' }}
        aria-hidden="true"
      />
      {isEditing ? (
        <input
          className={s.rowLabelInput}
          value={editValue}
          autoFocus
          onChange={(e) => onEditValueChange(e.target.value)}
          onBlur={onCommitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommitRename();
            if (e.key === 'Escape') onCancelRename();
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        />
      ) : (
        <span className={s.rowLabel} title={displayLabel}>
          {displayLabel}
        </span>
      )}
      <span className={s.rowKind}>{item.kind}</span>
      <div
        className={s.rowActions}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={s.rowAction}
          title="Bring to front"
          aria-label="Bring to front"
          onClick={onBringToFront}
        >
          ⤒
        </button>
        <button
          type="button"
          className={s.rowAction}
          title="Send to back"
          aria-label="Send to back"
          onClick={onSendToBack}
        >
          ⤓
        </button>
        {canEditBreakpoint ? (
          <>
            <button
              type="button"
              className={cx(s.rowAction, isHidden && s.rowActionActive)}
              title={isHidden ? 'Show on this breakpoint' : 'Hide on this breakpoint'}
              aria-label={isHidden ? 'Show on this breakpoint' : 'Hide on this breakpoint'}
              onClick={onToggleHidden}
            >
              {isHidden ? '◉' : '○'}
            </button>
            <button
              type="button"
              className={s.rowAction}
              title="Reset placement"
              aria-label="Reset placement"
              onClick={onResetPlacement}
            >
              ↺
            </button>
          </>
        ) : null}
        <button
          type="button"
          className={cx(s.rowAction, s.rowActionDanger)}
          title="Delete"
          aria-label="Delete"
          onClick={onDelete}
        >
          ×
        </button>
      </div>
    </li>
  );
}

export function LayersPanel({
  layout,
  onChange,
  selection,
  onSelectionChange,
  activeBreakpoint,
}: LayersPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsed((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }, []);

  const startRename = useCallback((itemId: string, label: string) => {
    setEditingId(itemId);
    setEditValue(label);
  }, []);

  const commitRename = useCallback(
    (sectionId: string, itemId: string) => {
      const trimmed = editValue.trim();
      if (trimmed) {
        onChange(updateItemLabel(layout, sectionId, itemId, trimmed));
      }
      setEditingId(null);
    },
    [editValue, layout, onChange],
  );

  const handleAddSection = useCallback(() => {
    const { layout: next } = addSection(layout);
    onChange(next);
  }, [layout, onChange]);

  const sectionViews = useMemo(
    () =>
      layout.sections.map((section) => {
        const displayItems = [...section.items].reverse();
        return {
          section,
          displayItems,
          sortableIds: displayItems.map((i) => rowId(section.id, i.id)),
        };
      }),
    [layout.sections],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const from = parseRowId(String(active.id));
      const to = parseRowId(String(over.id));
      if (!from || !to) return;
      if (from.sectionId !== to.sectionId) return;

      const section = layout.sections.find((sec) => sec.id === from.sectionId);
      if (!section) return;

      const len = section.items.length;
      const fromStorage = section.items.findIndex((i) => i.id === from.itemId);
      const toDisplay = section.items
        .slice()
        .reverse()
        .findIndex((i) => i.id === to.itemId);
      if (fromStorage < 0 || toDisplay < 0) return;
      const toStorage = len - 1 - toDisplay;

      onChange(reorderItemAtIndex(layout, from.sectionId, fromStorage, toStorage));
    },
    [layout, onChange],
  );

  if (layout.sections.length === 0) {
    return (
      <aside className={s.panel}>
        <div className={s.panelHeader}>
          <span>Layers</span>
          <button
            type="button"
            className={s.panelHeaderAdd}
            onClick={handleAddSection}
            title="Add section"
            aria-label="Add section"
          >
            + Section
          </button>
        </div>
        <p className={s.panelEmpty}>No sections yet.</p>
      </aside>
    );
  }

  return (
    <aside className={s.panel}>
      <div className={s.panelHeader}>
        <span>Layers</span>
        <button
          type="button"
          className={s.panelHeaderAdd}
          onClick={handleAddSection}
          title="Add section"
          aria-label="Add section"
        >
          + Section
        </button>
      </div>
      <div className={s.panelBody}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          {sectionViews.map(({ section, displayItems, sortableIds }) => {
            const isCollapsed = collapsed[section.id] ?? false;
            return (
              <div key={section.id} className={s.section}>
                <button
                  type="button"
                  className={s.sectionHeader}
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={!isCollapsed}
                >
                  <span
                    className={cx(s.sectionChevron, isCollapsed && s.sectionChevronCollapsed)}
                    aria-hidden="true"
                  >
                    ▼
                  </span>
                  <span>{section.label ?? 'Section'}</span>
                  <span className={s.sectionCount}>{section.items.length}</span>
                </button>
                {!isCollapsed && (
                  <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                    <ul className={s.itemList}>
                      {displayItems.map((item) => {
                        const isSelected =
                          selection?.sectionId === section.id && selection?.itemId === item.id;
                        const isEditing = editingId === item.id;
                        const displayLabel = item.label ?? item.kind;
                        const placement = resolveItem(
                          item,
                          section,
                          activeBreakpoint,
                          layout.breakpoints,
                        );
                        const canEditBreakpoint = activeBreakpoint !== 'desktop';
                        return (
                          <SortableRow
                            key={item.id}
                            sectionId={section.id}
                            item={item}
                            isSelected={isSelected}
                            isEditing={isEditing}
                            editValue={editValue}
                            onEditValueChange={setEditValue}
                            isHidden={placement.hidden}
                            canEditBreakpoint={canEditBreakpoint}
                            onSelect={() =>
                              onSelectionChange({
                                sectionId: section.id,
                                itemId: item.id,
                              })
                            }
                            onStartRename={() => startRename(item.id, displayLabel)}
                            onCommitRename={() => commitRename(section.id, item.id)}
                            onCancelRename={() => setEditingId(null)}
                            onBringToFront={() =>
                              onChange(bringItemToFront(layout, section.id, item.id))
                            }
                            onSendToBack={() =>
                              onChange(sendItemToBack(layout, section.id, item.id))
                            }
                            onToggleHidden={() =>
                              onChange(
                                setItemHidden(
                                  layout,
                                  section.id,
                                  item.id,
                                  activeBreakpoint,
                                  !placement.hidden,
                                ),
                              )
                            }
                            onResetPlacement={() => {
                              if (activeBreakpoint === 'desktop') return;
                              onChange(
                                clearItemOverride(layout, section.id, activeBreakpoint, item.id),
                              );
                            }}
                            onDelete={() => {
                              onChange(removeItem(layout, section.id, item.id));
                              if (
                                selection?.sectionId === section.id &&
                                selection?.itemId === item.id
                              ) {
                                onSelectionChange(null);
                              }
                            }}
                          />
                        );
                      })}
                    </ul>
                  </SortableContext>
                )}
              </div>
            );
          })}
        </DndContext>
      </div>
    </aside>
  );
}
