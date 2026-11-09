import {
  type Active,
  type AutoScrollOptions,
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import builder from '../styles/builder.module.css';
import { useBuilderActions } from '../hooks/useBuilderActions';
import { useBuilderContext } from '../context/BuilderContext';
import {
  CanvasDndContext,
  sameDropTarget,
  type DropTarget,
  type SectionDropHandle,
} from '../context/CanvasDndContext';
import {
  AUTO_SCROLL_THRESHOLD,
  edgeScrollSpeed,
  sectionAtY,
  type ClientPoint,
  type SectionBand,
} from '../lib/dropTargeting';
import type { DropSource } from '../lib/arrangementPreview';
import { VantagePointerSensor } from '../lib/pointerSensor';
import { moveItemToSection } from '../mutations/layout';
import type { ResolvedItemLayout } from '../lib/breakpoint';
import type { GridItem } from '../types';
import { ArrangementSectionView } from './ArrangementSectionView';
import { SectionView } from './SectionView';

export type BlockDragData = {
  type: 'block';
  item: GridItem;
  sectionId: string;
  placement: ResolvedItemLayout;
};

/** Block drags auto-scroll vertically only (dnd-kit default: 20% on both axes). */
const AUTO_SCROLL: AutoScrollOptions = { threshold: { x: 0, y: AUTO_SCROLL_THRESHOLD } };

function activatorPoint(event: DragStartEvent): ClientPoint | null {
  const start = event.activatorEvent as PointerEvent | null;
  if (!start || typeof start.clientX !== 'number') return null;
  return { x: start.clientX, y: start.clientY };
}

/** Nearest ancestor that scrolls vertically, else the page. */
function scrollParent(node: HTMLElement | null): HTMLElement {
  for (let el = node?.parentElement; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (/(auto|scroll|overlay)/.test(overflowY) && el.scrollHeight > el.clientHeight) return el;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

/** Visible vertical extent of a scroll container in client coordinates. */
function visibleBand(el: HTMLElement): { top: number; bottom: number } {
  if (el === document.scrollingElement || el === document.documentElement) {
    return { top: 0, bottom: window.innerHeight };
  }
  const rect = el.getBoundingClientRect();
  return { top: Math.max(0, rect.top), bottom: Math.min(window.innerHeight, rect.bottom) };
}

/**
 * Height of the dragged block: its chrome (as large as the block) around the grabbed handle. The
 * pointer sensor is the only one, so the activator is a pointerdown on a handle inside the block.
 */
function draggedHeight(event: DragStartEvent): number {
  const handle = event.activatorEvent!.target as Element;
  return handle.closest('[data-vantage-block]')!.getBoundingClientRect().height;
}

const topIn = (el: HTMLElement, root: HTMLElement) =>
  el.getBoundingClientRect().top - root.getBoundingClientRect().top;

export function Canvas() {
  const {
    layout,
    onChange,
    activeBreakpoint,
    setInteracting,
    setSelection,
    selectedItems,
    externalDrag,
    onExternalDrop,
    defaultLabels,
  } = useBuilderContext();
  // A group drag stays in its section (cross-section moves are single-block only).
  const groupRef = useRef(selectedItems);
  useEffect(() => {
    groupRef.current = selectedItems;
  });
  const { addSection } = useBuilderActions();
  const { sections } = layout;
  const handles = useRef(new Map<string, SectionDropHandle>());
  const [dropTarget, setDropTargetState] = useState<DropTarget | null>(null);
  const [dragSourceSectionId, setDragSourceSectionId] = useState<string | null>(null);
  const [blockDrag, setBlockDrag] = useState<{ source: DropSource; height: number } | null>(null);

  const setDropTarget = useCallback((next: DropTarget | null) => {
    setDropTargetState((prev) => (sameDropTarget(prev, next) ? prev : next));
  }, []);

  const registerSection = useCallback((sectionId: string, handle: SectionDropHandle) => {
    handles.current.set(sectionId, handle);
    return () => {
      if (handles.current.get(sectionId) === handle) handles.current.delete(sectionId);
    };
  }, []);

  /**
   * Section a drag at `clientY` targets, from the grids' live rects. The band between two grids
   * (header bar, gap, footer) belongs to the section below, so there is always a target.
   */
  const sectionAtPointer = useCallback((clientY: number): string | null => {
    const bands: SectionBand[] = [];
    for (const [sectionId, handle] of handles.current) {
      const rect = handle.getElement()?.getBoundingClientRect();
      if (rect) bands.push({ sectionId, top: rect.top, bottom: rect.bottom });
    }
    return sectionAtY(clientY, bands);
  }, []);

  /*
   * Everything here is in client (viewport) coordinates, read live, so scrolling during a drag
   * cannot skew the target. dnd-kit's `event.delta` must not be used for this: it includes the scroll
   * distance since the drag started (content coordinates), while rects are client coordinates.
   */
  const pointer = useRef<ClientPoint | null>(null);
  const activeBlock = useRef<Active | null>(null);

  /** Cross-section placement for a dragged block, or null when it stays in its section. */
  const crossSectionTarget = useCallback((): DropTarget | null => {
    const active = activeBlock.current;
    const data = active?.data.current as BlockDragData | undefined;
    // The block as drawn under the pointer: its start rect plus the pointer's travel (no scroll).
    const rect = active?.rect.current.translated;
    if (data?.type !== 'block' || !pointer.current || !rect) return null;
    const group = groupRef.current;
    if (
      group.length > 1 &&
      group.some((ref) => ref.sectionId === data.sectionId && ref.itemId === data.item.id)
    ) {
      return null;
    }
    const sectionId = sectionAtPointer(pointer.current.y);
    if (!sectionId) return null;
    const handle = handles.current.get(sectionId);
    if (!handle) return null;
    // Inside its own section a free-grid block is moved by `dropWithin`; an arrangement reorders.
    if (sectionId === data.sectionId && !handle.byPointer) return null;
    const cell = handle.cellAt(
      handle.byPointer ? pointer.current.x : rect.left,
      handle.byPointer ? pointer.current.y : rect.top,
      data.placement.w,
      data.placement.h,
      data.item.id,
    );
    return { sectionId, ...cell };
  }, [sectionAtPointer]);

  const stopTracking = useRef<(() => void) | null>(null);

  /*
   * A preview in a section above the dragged block's own section changes its height and would
   * move the dragged block away from the pointer. The source grid gets the opposite shift as
   * `--vantage-drag-shift-y`, which the dragged block adds to its transform.
   */
  const canvasRef = useRef<HTMLDivElement>(null);
  const sourceOffset = useRef<{ el: HTMLElement; top: number } | null>(null);

  const endDrag = useCallback(() => {
    stopTracking.current?.();
    stopTracking.current = null;
    sourceOffset.current?.el.style.removeProperty('--vantage-drag-shift-y');
    sourceOffset.current = null;
    setInteracting(false);
    setDragSourceSectionId(null);
    setBlockDrag(null);
    setDropTarget(null);
  }, [setInteracting, setDropTarget]);

  useLayoutEffect(() => {
    const source = sourceOffset.current;
    if (!source) return;
    const shift = source.top - topIn(source.el, canvasRef.current!);
    source.el.style.setProperty('--vantage-drag-shift-y', `${shift}px`);
  }, [dropTarget]);

  useEffect(() => () => stopTracking.current?.(), []);

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      setInteracting(true);
      const data = event.active.data.current as BlockDragData | undefined;
      setDragSourceSectionId(data?.sectionId ?? null);
      if (data?.type === 'block') {
        setBlockDrag({
          source: { type: 'block', sectionId: data.sectionId, itemId: data.item.id },
          height: draggedHeight(event),
        });
        const el = handles.current.get(data.sectionId)?.getElement();
        sourceOffset.current = el ? { el, top: topIn(el, canvasRef.current!) } : null;
      }
      setDropTarget(null);
      activeBlock.current = event.active;
      pointer.current = activatorPoint(event);

      // Follow the real pointer, and re-target on any scroll (wheel, trackpad, auto-scroll, nested
      // scroll containers) even while the pointer rests.
      const onPointerMove = (e: PointerEvent) => {
        pointer.current = { x: e.clientX, y: e.clientY };
      };
      const onScroll = () => setDropTarget(crossSectionTarget());
      window.addEventListener('pointermove', onPointerMove, true);
      window.addEventListener('scroll', onScroll, true);
      stopTracking.current?.();
      stopTracking.current = () => {
        window.removeEventListener('pointermove', onPointerMove, true);
        window.removeEventListener('scroll', onScroll, true);
        activeBlock.current = null;
        pointer.current = null;
      };
    },
    [setInteracting, setDropTarget, crossSectionTarget],
  );

  const onDragMove = useCallback(
    (event: DragMoveEvent) => {
      activeBlock.current = event.active;
      setDropTarget(crossSectionTarget());
    },
    [crossSectionTarget, setDropTarget],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const data = event.active.data.current as BlockDragData | undefined;
      activeBlock.current = event.active;
      const target = crossSectionTarget();
      endDrag();
      if (!data) return;
      if (!target) {
        handles.current.get(data.sectionId)?.dropWithin(event);
        return;
      }
      const next = moveItemToSection(layout, data.sectionId, data.item.id, target.sectionId, {
        x: target.x,
        y: target.y,
        index: target.index,
        breakpoint: activeBreakpoint,
      });
      if (next === layout) return;
      onChange(next);
      const targetItems = next.sections.find((s) => s.id === target.sectionId)?.items;
      const moved =
        target.index !== undefined
          ? targetItems?.find((i) => i.id === data.item.id)
          : targetItems?.at(-1);
      if (moved) setSelection({ sectionId: target.sectionId, itemId: moved.id });
    },
    [crossSectionTarget, endDrag, layout, activeBreakpoint, onChange, setSelection],
  );

  const sensors = useSensors(
    useSensor(VantagePointerSensor, { activationConstraint: { distance: 4 } }),
  );

  /*
   * New blocks dragged in from a palette (native HTML5 drag-and-drop). Handled on the canvas, not
   * per grid, so header bars and gaps between sections accept the drop too.
   */
  const externalPointer = useRef<ClientPoint | null>(null);

  const externalTarget = useCallback(
    (point: ClientPoint): DropTarget | null => {
      if (!externalDrag) return null;
      const sectionId = sectionAtPointer(point.y);
      const handle = sectionId ? handles.current.get(sectionId) : undefined;
      if (!sectionId || !handle) return null;
      // The ghost is centered on the pointer.
      const size = handle.blockSize(externalDrag.w, externalDrag.h);
      const cell = handle.cellAt(
        point.x - size.width / 2,
        point.y - size.height / 2,
        externalDrag.w,
        externalDrag.h,
      );
      return { sectionId, ...cell };
    },
    [externalDrag, sectionAtPointer],
  );

  const onExternalDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      const point = { x: e.clientX, y: e.clientY };
      const target = externalTarget(point);
      if (!target) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      externalPointer.current = point;
      setDropTarget(target);
    },
    [externalTarget, setDropTarget],
  );

  const onExternalDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // `relatedTarget` is null in Safari, so check the point: moving between children is no leave.
      const rect = e.currentTarget.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX < rect.right &&
        e.clientY >= rect.top &&
        e.clientY < rect.bottom;
      if (inside) return;
      externalPointer.current = null;
      setDropTarget(null);
    },
    [setDropTarget],
  );

  const onExternalDropEvent = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      const target = externalTarget({ x: e.clientX, y: e.clientY });
      if (!target || !onExternalDrop) return;
      // Also stops a text field under the pointer (e.g. a section name) from inserting the data.
      e.preventDefault();
      externalPointer.current = null;
      setDropTarget(null);
      onExternalDrop({
        sectionId: target.sectionId,
        x: target.x,
        y: target.y,
        index: target.index,
        breakpoint: activeBreakpoint,
        dataTransfer: e.dataTransfer,
      });
    },
    [externalTarget, onExternalDrop, setDropTarget, activeBreakpoint],
  );

  // While a palette item is dragged: re-target on scroll and auto-scroll near the edges.
  const acceptsExternal = Boolean(externalDrag && onExternalDrop);
  useEffect(() => {
    if (!acceptsExternal) return;
    const scroller = scrollParent(canvasRef.current);
    let edgePointer: ClientPoint | null = null;
    let raf = 0;
    let last = 0;

    const onScroll = () => {
      if (externalPointer.current) setDropTarget(externalTarget(externalPointer.current));
    };
    const tick = (now: number) => {
      raf = 0;
      if (!edgePointer) return;
      const band = visibleBand(scroller);
      const speed = edgeScrollSpeed(edgePointer.y, band.top, band.bottom);
      if (speed === 0) return;
      const elapsed = last ? Math.min(now - last, 50) : 16;
      last = now;
      scroller.scrollBy(0, speed * elapsed);
      raf = requestAnimationFrame(tick);
    };
    // Anywhere on the page, so the edge zones work over sticky headers too.
    const onDocumentDragOver = (e: DragEvent) => {
      edgePointer = { x: e.clientX, y: e.clientY };
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      edgePointer = null;
    };
    // Leaving the window fires no further dragover; stop instead of scrolling on.
    const onDocumentDragLeave = (e: DragEvent) => {
      const outside =
        e.clientX <= 0 ||
        e.clientY <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight;
      if (outside) stop();
    };

    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('dragover', onDocumentDragOver, true);
    document.addEventListener('dragleave', onDocumentDragLeave, true);
    document.addEventListener('drop', stop, true);
    document.addEventListener('dragend', stop, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('dragover', onDocumentDragOver, true);
      document.removeEventListener('dragleave', onDocumentDragLeave, true);
      document.removeEventListener('drop', stop, true);
      document.removeEventListener('dragend', stop, true);
      externalPointer.current = null;
    };
  }, [acceptsExternal, externalTarget, setDropTarget]);

  // A target left over from an aborted palette drag (no dragleave/drop fired) must not linger.
  const visibleDropTarget = externalDrag || dragSourceSectionId ? dropTarget : null;
  const externalW = externalDrag?.w;
  const externalH = externalDrag?.h;
  const dragSource = useMemo<DropSource | null>(
    () =>
      blockDrag?.source ??
      (externalW !== undefined && externalH !== undefined
        ? { type: 'new', w: externalW, h: externalH }
        : null),
    [blockDrag, externalW, externalH],
  );
  const dndValue = useMemo(
    () => ({
      registerSection,
      dropTarget: visibleDropTarget,
      setDropTarget,
      dragSourceSectionId,
      dragSource,
      dragHeight: blockDrag?.height ?? null,
    }),
    [registerSection, visibleDropTarget, setDropTarget, dragSourceSectionId, dragSource, blockDrag],
  );

  if (sections.length === 0) {
    return (
      <div className={builder['canvas-empty']}>
        <p>{defaultLabels.noSections}</p>
        <button type="button" onClick={() => addSection()}>
          {defaultLabels.addSection}
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
        autoScroll={AUTO_SCROLL}
      >
        <div
          ref={canvasRef}
          className={builder.canvas}
          onDragOver={acceptsExternal ? onExternalDragOver : undefined}
          onDragLeave={acceptsExternal ? onExternalDragLeave : undefined}
          onDrop={acceptsExternal ? onExternalDropEvent : undefined}
        >
          {sections.map((section) =>
            section.arrangement ? (
              <ArrangementSectionView key={section.id} section={section} />
            ) : (
              <SectionView key={section.id} section={section} />
            ),
          )}
        </div>
      </DndContext>
    </CanvasDndContext.Provider>
  );
}
