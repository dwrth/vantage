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

const KIND_STATUS: Record<string, string> = {
  text: 'status-info',
  image: 'status-success',
  button: 'status-warning',
  input: 'status-secondary',
  form: 'status-accent',
  card: 'status-primary',
  block: 'status-neutral',
};

const ID_SEP = '::';
const rowId = (sectionId: string, itemId: string) => `${sectionId}${ID_SEP}${itemId}`;
const parseRowId = (id: string): { sectionId: string; itemId: string } | null => {
  const idx = id.indexOf(ID_SEP);
  if (idx < 0) return null;
  return { sectionId: id.slice(0, idx), itemId: id.slice(idx + ID_SEP.length) };
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

  return (
    <li
      ref={setNodeRef}
      className={[
        'group flex cursor-grab items-center gap-1.5 rounded-field px-1.5 py-1 text-sm active:cursor-grabbing',
        isSelected ? 'bg-primary/15 text-base-content' : 'hover:bg-base-300/50',
        isDragging ? 'opacity-60' : '',
        isHidden ? 'opacity-40' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onSelect}
      onDoubleClick={onStartRename}
      {...attributes}
      {...listeners}
    >
      <span className={`status status-xs ${KIND_STATUS[item.kind] ?? 'status-neutral'}`} />
      {isEditing ? (
        <input
          className="input input-xs min-w-0 flex-1"
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
        <span className="min-w-0 flex-1 truncate font-medium">{displayLabel}</span>
      )}
      <span className="font-mono text-[10px] text-base-content/40">{item.kind}</span>
      <div
        className="join opacity-0 transition-opacity group-hover:opacity-100"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tooltip tooltip-left" data-tip="Bring to front">
          <button type="button" className="btn btn-ghost btn-xs join-item" onClick={onBringToFront}>
            ⤒
          </button>
        </div>
        <div className="tooltip tooltip-left" data-tip="Send to back">
          <button type="button" className="btn btn-ghost btn-xs join-item" onClick={onSendToBack}>
            ⤓
          </button>
        </div>
        {canEditBreakpoint ? (
          <>
            <div
              className="tooltip tooltip-left"
              data-tip={isHidden ? 'Show on breakpoint' : 'Hide on breakpoint'}
            >
              <button
                type="button"
                className={`btn btn-ghost btn-xs join-item ${isHidden ? 'btn-active' : ''}`}
                onClick={onToggleHidden}
              >
                {isHidden ? '◉' : '○'}
              </button>
            </div>
            <div className="tooltip tooltip-left" data-tip="Reset placement">
              <button
                type="button"
                className="btn btn-ghost btn-xs join-item"
                onClick={onResetPlacement}
              >
                ↺
              </button>
            </div>
          </>
        ) : null}
        <div className="tooltip tooltip-left" data-tip="Delete">
          <button
            type="button"
            className="btn btn-ghost btn-xs join-item text-error"
            onClick={onDelete}
          >
            ×
          </button>
        </div>
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

  const handleAddSection = useCallback(() => {
    const { layout: next } = addSection(layout);
    onChange(next);
  }, [layout, onChange]);

  const commitRename = useCallback(
    (sectionId: string, itemId: string) => {
      const trimmed = editValue.trim();
      if (trimmed) onChange(updateItemLabel(layout, sectionId, itemId, trimmed));
      setEditingId(null);
    },
    [editValue, layout, onChange],
  );

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
      if (!from || !to || from.sectionId !== to.sectionId) return;
      const section = layout.sections.find((sec) => sec.id === from.sectionId);
      if (!section) return;
      const len = section.items.length;
      const fromStorage = section.items.findIndex((i) => i.id === from.itemId);
      const toDisplay = section.items
        .slice()
        .reverse()
        .findIndex((i) => i.id === to.itemId);
      if (fromStorage < 0 || toDisplay < 0) return;
      onChange(reorderItemAtIndex(layout, from.sectionId, fromStorage, len - 1 - toDisplay));
    },
    [layout, onChange],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-base-300/50 px-3 py-2">
        <span className="text-xs font-semibold tracking-wider text-base-content/60 uppercase">
          Layers
        </span>
        <button type="button" className="btn btn-ghost btn-xs" onClick={handleAddSection}>
          + Section
        </button>
      </div>

      {layout.sections.length === 0 ? (
        <p className="p-3 text-sm text-base-content/50">No sections yet.</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            {sectionViews.map(({ section, displayItems, sortableIds }) => {
              const isCollapsed = collapsed[section.id] ?? false;
              return (
                <div key={section.id} className="mb-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-field px-2 py-1.5 text-left text-sm font-medium hover:bg-base-300/40"
                    onClick={() =>
                      setCollapsed((prev) => ({ ...prev, [section.id]: !prev[section.id] }))
                    }
                    aria-expanded={!isCollapsed}
                  >
                    <span
                      className={`text-[10px] text-base-content/40 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                    >
                      ▼
                    </span>
                    <span className="min-w-0 flex-1 truncate">{section.label ?? 'Section'}</span>
                    <span className="badge badge-ghost badge-xs">{section.items.length}</span>
                  </button>
                  {!isCollapsed ? (
                    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                      <ul className="menu menu-xs w-full gap-0.5 p-0 pl-2">
                        {displayItems.map((item) => {
                          const placement = resolveItem(
                            item,
                            section,
                            activeBreakpoint,
                            layout.breakpoints,
                          );
                          return (
                            <SortableRow
                              key={item.id}
                              sectionId={section.id}
                              item={item}
                              isSelected={
                                selection?.sectionId === section.id && selection?.itemId === item.id
                              }
                              isEditing={editingId === item.id}
                              editValue={editValue}
                              onEditValueChange={setEditValue}
                              isHidden={placement.hidden}
                              canEditBreakpoint={activeBreakpoint !== 'desktop'}
                              onSelect={() =>
                                onSelectionChange({ sectionId: section.id, itemId: item.id })
                              }
                              onStartRename={() => {
                                setEditingId(item.id);
                                setEditValue(item.label ?? item.kind);
                              }}
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
                  ) : null}
                </div>
              );
            })}
          </DndContext>
        </div>
      )}
    </div>
  );
}
