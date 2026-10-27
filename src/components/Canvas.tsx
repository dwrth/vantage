import {
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useCallback, useMemo, useRef, useState } from 'react';
import builder from '../styles/builder.module.css';
import { useBuilderActions } from '../hooks/useBuilderActions';
import { useBuilderContext } from '../context/BuilderContext';
import {
  CanvasDndContext,
  sameDropTarget,
  type DropTarget,
  type SectionDropHandle,
} from '../context/CanvasDndContext';
import { VantagePointerSensor } from '../lib/pointerSensor';
import { moveItemToSection } from '../mutations/layout';
import type { ResolvedItemLayout } from '../lib/breakpoint';
import type { GridItem } from '../types';
import { SectionView } from './SectionView';

export type BlockDragData = {
  type: 'block';
  item: GridItem;
  sectionId: string;
  placement: ResolvedItemLayout;
};

function pointerOf(event: DragMoveEvent | DragEndEvent): { x: number; y: number } | null {
  const start = event.activatorEvent as PointerEvent | null;
  if (!start || typeof start.clientX !== 'number') return null;
  return { x: start.clientX + event.delta.x, y: start.clientY + event.delta.y };
}

export function Canvas() {
  const { layout, onChange, activeBreakpoint, setInteracting, setSelection, externalDrag } =
    useBuilderContext();
  const { addSection } = useBuilderActions();
  const { sections } = layout;
  const handles = useRef(new Map<string, SectionDropHandle>());
  const [dropTarget, setDropTargetState] = useState<DropTarget | null>(null);
  const [dragSourceSectionId, setDragSourceSectionId] = useState<string | null>(null);

  const setDropTarget = useCallback((next: DropTarget | null) => {
    setDropTargetState((prev) => (sameDropTarget(prev, next) ? prev : next));
  }, []);

  const registerSection = useCallback((sectionId: string, handle: SectionDropHandle) => {
    handles.current.set(sectionId, handle);
    return () => {
      if (handles.current.get(sectionId) === handle) handles.current.delete(sectionId);
    };
  }, []);

  /** Section under the pointer (vertical bounds only, so gutters still count). */
  const sectionAtPointer = useCallback((y: number): string | null => {
    for (const [sectionId, handle] of handles.current) {
      const rect = handle.getElement()?.getBoundingClientRect();
      if (rect && y >= rect.top && y < rect.bottom) return sectionId;
    }
    return null;
  }, []);

  /** Cross-section placement for a dragged block, or null when it stays in its section. */
  const crossSectionTarget = useCallback(
    (event: DragMoveEvent | DragEndEvent): DropTarget | null => {
      const data = event.active.data.current as BlockDragData | undefined;
      const pointer = pointerOf(event);
      const rect = event.active.rect.current.translated;
      if (data?.type !== 'block' || !pointer || !rect) return null;
      const sectionId = sectionAtPointer(pointer.y);
      if (!sectionId || sectionId === data.sectionId) return null;
      const handle = handles.current.get(sectionId);
      if (!handle) return null;
      const cell = handle.cellAt(rect.left, rect.top, data.placement.w, data.placement.h);
      return { sectionId, ...cell };
    },
    [sectionAtPointer],
  );

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      setInteracting(true);
      const data = event.active.data.current as BlockDragData | undefined;
      setDragSourceSectionId(data?.sectionId ?? null);
      setDropTarget(null);
    },
    [setInteracting, setDropTarget],
  );

  const onDragMove = useCallback(
    (event: DragMoveEvent) => setDropTarget(crossSectionTarget(event)),
    [crossSectionTarget, setDropTarget],
  );

  const endDrag = useCallback(() => {
    setInteracting(false);
    setDragSourceSectionId(null);
    setDropTarget(null);
  }, [setInteracting, setDropTarget]);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const data = event.active.data.current as BlockDragData | undefined;
      const target = crossSectionTarget(event);
      endDrag();
      if (!data) return;
      if (!target) {
        handles.current.get(data.sectionId)?.dropWithin(event);
        return;
      }
      const next = moveItemToSection(layout, data.sectionId, data.item.id, target.sectionId, {
        x: target.x,
        y: target.y,
        breakpoint: activeBreakpoint,
      });
      if (next === layout) return;
      onChange(next);
      const moved = next.sections.find((s) => s.id === target.sectionId)?.items.at(-1);
      if (moved) setSelection({ sectionId: target.sectionId, itemId: moved.id });
    },
    [crossSectionTarget, endDrag, layout, activeBreakpoint, onChange, setSelection],
  );

  const sensors = useSensors(
    useSensor(VantagePointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // A target left over from an aborted palette drag (no dragleave/drop fired) must not linger.
  const visibleDropTarget = externalDrag || dragSourceSectionId ? dropTarget : null;
  const dndValue = useMemo(
    () => ({ registerSection, dropTarget: visibleDropTarget, setDropTarget, dragSourceSectionId }),
    [registerSection, visibleDropTarget, setDropTarget, dragSourceSectionId],
  );

  if (sections.length === 0) {
    return (
      <div className={builder['canvas-empty']}>
        <p>No sections yet.</p>
        <button type="button" onClick={() => addSection()}>
          Add section
        </button>
      </div>
    );
  }

  return (
    <CanvasDndContext.Provider value={dndValue}>
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onDragCancel={endDrag}
      >
        <div className={builder.canvas}>
          {sections.map((section) => (
            <SectionView key={section.id} section={section} />
          ))}
        </div>
      </DndContext>
    </CanvasDndContext.Provider>
  );
}
