import type { DragEndEvent } from '@dnd-kit/core';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { STACKED_TRACK, arrangementSlots, arrangementTrack } from '../lib/arrangement';
import { CELL_ATTR, dropIndexAt, type ArrangementDropState } from '../lib/arrangementDropTarget';
import { arrangementDropPreview, trailingSlot } from '../lib/arrangementPreview';
import { resolveItem, resolveSection } from '../lib/breakpoint';
import { resolveEffectiveItemData } from '../lib/entities';
import { useBuilderContext } from '../context/BuilderContext';
import { useCanvasDnd, type SectionDropHandle } from '../context/CanvasDndContext';
import { useResolveItemData } from '../hooks/useItemData';
import { useReflow } from '../hooks/useReflow';
import { moveItemToIndex } from '../mutations/layout';
import { parsePxToken } from '../theme/tokens';
import { useVantageTokens } from '../theme/useVantageTokens';
import type { Section } from '../types';
import arrangement from '../styles/arrangement.module.css';
import builder from '../styles/builder.module.css';
import { ArrangementBlock } from './ArrangementBlock';
import { ArrangementDropSlot } from './ArrangementDropSlot';
import { CELL_MAX_PX, ROW_MAX_PX } from '../lib/grid';
import { SectionActions } from './SectionActions';
import { SectionBackground } from './SectionBackground';

/** Tallest active drop slot, so a long block does not stretch the preview far down. */
const SLOT_MAX_PX = 320;

const EMPTY_DROP: ArrangementDropState = {
  itemIds: [],
  visibleIds: [],
  slots: new Map(),
  reversed: false,
  preview: null,
};

function editorCanvasMaxWidth(
  breakpoint: ReturnType<typeof useBuilderContext>['activeBreakpoint'],
  widths: ReturnType<typeof useBuilderContext>['breakpointPreviewWidths'],
) {
  if (breakpoint === 'desktop') return '100%';
  const width = breakpoint === 'tablet' ? (widths.tablet ?? widths.mobile) : widths.mobile;
  return width === undefined ? '100%' : `${width}px`;
}

/** An arrangement section in the builder: blocks flow by the preset; drag reorders, nothing is placed on a grid. */
export function ArrangementSectionView({ section }: { section: Section }) {
  const { id, items, background } = section;
  const config = section.arrangement!;
  const {
    layout,
    onChange,
    isInteracting,
    selection,
    activeBreakpoint,
    breakpointPreviewWidths,
    renderSectionHeader,
    sectionHeaderPlacement,
    renderSectionFooter,
    showSectionActions,
  } = useBuilderContext();
  const { registerSection, dropTarget, dragSourceSectionId, dragSource, dragHeight } =
    useCanvasDnd();
  const resolveEntity = useResolveItemData();
  const enabled = layout.breakpoints;
  const tokens = useVantageTokens();
  const cellMaxPx = parsePxToken(tokens['--vantage-cell-max-px'], CELL_MAX_PX);
  const rowMaxPx = parsePxToken(tokens['--vantage-row-max-px'], ROW_MAX_PX);

  const resolved = resolveSection(section, activeBreakpoint, enabled);
  const track = arrangementTrack(config, activeBreakpoint);
  const visible = useMemo(
    () =>
      items
        .filter((item) => !resolveItem(item, section, activeBreakpoint, enabled).hidden)
        .map((item) => ({
          ...item,
          data: resolveEffectiveItemData(
            item,
            section,
            activeBreakpoint,
            enabled,
            resolveEntity?.(item),
          ),
        })),
    [items, section, activeBreakpoint, enabled, resolveEntity],
  );
  const slots = useMemo(
    () => arrangementSlots(visible, config, activeBreakpoint),
    [visible, config, activeBreakpoint],
  );

  const containerRef = useRef<HTMLDivElement>(null);

  const ghost = dropTarget?.sectionId === id ? dropTarget : null;
  const dropIndex = ghost?.index;
  // How the section looks after a drop at the hovered index; nothing is written until the drop.
  const preview = useMemo(
    () =>
      dropIndex === undefined || !dragSource
        ? null
        : arrangementDropPreview(layout, id, dragSource, dropIndex, activeBreakpoint),
    [layout, id, dragSource, dropIndex, activeBreakpoint],
  );
  const draggedId =
    dragSource?.type === 'block' && dragSource.sectionId === id ? dragSource.itemId : undefined;
  const activeSlot = preview?.slots.get(preview.droppedId);
  const inactiveSlot =
    dragSource && !activeSlot ? trailingSlot(visible.length, track, config.align) : undefined;
  const slotHeight = !dragSource
    ? 0
    : Math.min(
        SLOT_MAX_PX,
        dragSource.type === 'block' ? (dragHeight ?? 0) : dragSource.h * rowMaxPx,
      );

  // Blocks glide to their preview slots, and back when the drag leaves or is cancelled.
  useReflow(containerRef, CELL_ATTR, preview !== null);

  const latest = useRef({ layout, onChange, id, drop: EMPTY_DROP });
  useLayoutEffect(() => {
    latest.current = {
      layout,
      onChange,
      id,
      drop: {
        itemIds: items.map((item) => item.id),
        visibleIds: visible.map((item) => item.id),
        slots,
        reversed: track === STACKED_TRACK && config.mobileOrder === 'reversed',
        preview,
      },
    };
  });
  useEffect(() => {
    const handle: SectionDropHandle = {
      getElement: () => containerRef.current,
      byPointer: true,
      cellAt: (left, top, w, h, excludeItemId) => ({
        x: 0,
        y: 0,
        w,
        h,
        index: dropIndexAt(
          containerRef.current,
          latest.current.drop,
          { x: left, y: top },
          excludeItemId,
        ),
      }),
      blockSize: () => ({ width: 0, height: 0 }),
      dropWithin: (event: DragEndEvent) => {
        const dragged = (event.active.data.current as { item?: { id: string } } | undefined)?.item;
        const rect = event.active.rect.current.translated;
        if (!dragged || !rect) return;
        const { layout: current, onChange: emit, id: sectionId, drop } = latest.current;
        const index = dropIndexAt(
          containerRef.current,
          drop,
          { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
          dragged.id,
        );
        const next = moveItemToIndex(current, sectionId, dragged.id, index);
        if (next !== current) emit(next);
      },
    };
    return registerSection(id, handle);
  }, [registerSection, id, containerRef]);

  const hasSelection = selection?.sectionId === id;
  const chromeCtx = { section, activeBreakpoint, hasSelection, isDropTarget: ghost !== null };
  const header = renderSectionHeader ? renderSectionHeader(chromeCtx) : null;
  const sectionClass = [
    builder.section,
    dragSourceSectionId === id ? builder['section--drag-source'] : '',
    ghost ? builder['section--drop-target'] : '',
  ]
    .filter(Boolean)
    .join(' ');
  const gridClass = [
    builder['builder-grid'],
    arrangement.flow,
    isInteracting || ghost ? builder['builder-grid--active'] : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={sectionClass}
      data-vantage-section={id}
      data-vantage-arrangement={config.preset}
      data-vantage-section-selected={hasSelection ? '' : undefined}
      data-vantage-drop-target={ghost ? '' : undefined}
    >
      {sectionHeaderPlacement === 'section' ? header : null}
      <div
        className={builder['canvas-frame']}
        style={{ maxWidth: editorCanvasMaxWidth(activeBreakpoint, breakpointPreviewWidths) }}
      >
        {sectionHeaderPlacement === 'canvas' ? header : null}
        <div className={builder['canvas-wrap']}>
          <div
            ref={containerRef}
            className={gridClass}
            data-vantage-section-frame={id}
            tabIndex={-1}
            style={
              {
                '--cols': track.columns,
                '--col-gap-px': `${resolved.colGap}px`,
                '--row-gap-px': `${resolved.rowGap}px`,
                '--row-ratio': cellMaxPx > 0 ? rowMaxPx / cellMaxPx : 1,
                '--section-pad-top-px': `${resolved.paddingTop}px`,
                '--section-pad-bottom-px': `${resolved.paddingBottom}px`,
                gridTemplateRows: 'none',
                alignItems: config.equalHeight
                  ? 'stretch'
                  : { start: 'start', center: 'center', end: 'end' }[
                      config.verticalAlign ?? 'start'
                    ],
              } as React.CSSProperties
            }
          >
            <SectionBackground background={background} className={builder['section-bg']} />
            {visible.map((item) => (
              <ArrangementBlock
                key={item.id}
                sectionId={id}
                item={item}
                slot={
                  (item.id === draggedId ? undefined : preview?.slots.get(item.id)) ??
                  slots.get(item.id)!
                }
              />
            ))}
            {visible.length === 0 && !dragSource ? (
              <div className={arrangement.empty} aria-hidden="true" />
            ) : null}
            {activeSlot ? (
              <ArrangementDropSlot slot={activeSlot} active height={slotHeight || undefined} />
            ) : inactiveSlot ? (
              <ArrangementDropSlot slot={inactiveSlot} active={false} />
            ) : null}
          </div>
        </div>
      </div>
      {showSectionActions ? <SectionActions section={section} /> : null}
      {renderSectionFooter ? renderSectionFooter(chromeCtx) : null}
    </section>
  );
}
