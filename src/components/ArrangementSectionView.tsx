import type { DragEndEvent } from '@dnd-kit/core';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  arrangementSlots,
  arrangementTrack,
  insertionIndexAt,
  insertionLine,
} from '../lib/arrangement';
import { resolveItem, resolveSection } from '../lib/breakpoint';
import { resolveEffectiveItemData } from '../lib/entities';
import { useBuilderContext } from '../context/BuilderContext';
import { useCanvasDnd, type SectionDropHandle } from '../context/CanvasDndContext';
import { useResolveItemData } from '../hooks/useItemData';
import { moveItemToIndex } from '../mutations/layout';
import { parsePxToken } from '../theme/tokens';
import { useVantageTokens } from '../theme/useVantageTokens';
import type { Section } from '../types';
import arrangement from '../styles/arrangement.module.css';
import builder from '../styles/builder.module.css';
import { ArrangementBlock } from './ArrangementBlock';
import { CELL_MAX_PX, ROW_MAX_PX } from '../lib/grid';
import { SectionActions } from './SectionActions';
import { SectionBackground } from './SectionBackground';

const CELL_ATTR = 'data-vantage-arrangement-cell';

type Box = { left: number; top: number; right: number; bottom: number };
type Line = { left: number; top: number; width: number; height: number };

/**
 * Rects of the section's blocks without the one being dragged (and `excludeId`), relative to
 * `origin` when given.
 */
function blockRects(grid: HTMLElement | null, excludeId?: string, origin?: DOMRect): Box[] {
  if (!grid) return [];
  return Array.from(
    grid.querySelectorAll<HTMLElement>(`[${CELL_ATTR}]:not([data-vantage-dragging])`),
  )
    .filter((el) => el.getAttribute(CELL_ATTR) !== excludeId)
    .map((el) => {
      const r = el.getBoundingClientRect();
      const dx = origin?.left ?? 0;
      const dy = origin?.top ?? 0;
      return { left: r.left - dx, top: r.top - dy, right: r.right - dx, bottom: r.bottom - dy };
    });
}

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
  const { registerSection, dropTarget, dragSourceSectionId } = useCanvasDnd();
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

  const latest = useRef({ layout, onChange, id });
  useLayoutEffect(() => {
    latest.current = { layout, onChange, id };
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
        index: insertionIndexAt(blockRects(containerRef.current, excludeItemId), {
          x: left,
          y: top,
        }),
      }),
      blockSize: () => ({ width: 0, height: 0 }),
      dropWithin: (event: DragEndEvent) => {
        const dragged = (event.active.data.current as { item?: { id: string } } | undefined)?.item;
        const rect = event.active.rect.current.translated;
        if (!dragged || !rect) return;
        const index = insertionIndexAt(blockRects(containerRef.current, dragged.id), {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
        const { layout: current, onChange: emit, id: sectionId } = latest.current;
        const next = moveItemToIndex(current, sectionId, dragged.id, index);
        if (next !== current) emit(next);
      },
    };
    return registerSection(id, handle);
  }, [registerSection, id, containerRef]);

  const ghost = dropTarget?.sectionId === id ? dropTarget : null;
  const dropIndex = ghost?.index;
  const [line, setLine] = useState<Line | null>(null);
  useLayoutEffect(() => {
    const grid = containerRef.current;
    if (dropIndex === undefined || !grid) {
      setLine(null);
      return;
    }
    const origin = grid.getBoundingClientRect();
    setLine(insertionLine(blockRects(grid, undefined, origin), dropIndex, resolved.colGap));
  }, [dropIndex, containerRef, resolved.colGap]);

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
                slot={slots.get(item.id)!}
              />
            ))}
            {visible.length === 0 ? <div className={arrangement.empty} aria-hidden="true" /> : null}
            {line ? (
              <div
                className={arrangement['insertion-line']}
                aria-hidden="true"
                style={{ left: line.left, top: line.top, width: line.width, height: line.height }}
              />
            ) : null}
          </div>
        </div>
      </div>
      {showSectionActions ? <SectionActions section={section} /> : null}
      {renderSectionFooter ? renderSectionFooter(chromeCtx) : null}
    </section>
  );
}
