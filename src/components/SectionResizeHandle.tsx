import { useCallback } from 'react';
import { useBuilderContext } from '../context/BuilderContext';
import { trackPointerDrag } from '../lib/pointerDrag';
import { snapSectionRows } from '../lib/rowMetrics';
import builder from '../styles/builder.module.css';

type SectionResizeHandleProps = {
  label: string;
  rows: number;
  minRows: number;
  rowSteps: number[] | null;
  cellHeight: number;
  /** Live height while dragging; `null` once the drag ends. */
  onDraft: (rows: number | null) => void;
  onCommit: (rows: number) => void;
};

/** Bottom edge of a section in the builder. Drag (or arrow keys) to change its height in rows. */
export function SectionResizeHandle({
  label,
  rows,
  minRows,
  rowSteps,
  cellHeight,
  onDraft,
  onCommit,
}: SectionResizeHandleProps) {
  const { setInteracting } = useBuilderContext();

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.isPrimary || e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      const startY = e.clientY;
      // Row heights as measured at drag start; rows added while dragging extrapolate.
      const steps = rowSteps ?? [];
      let next = rows;
      setInteracting(true);
      trackPointerDrag(e, {
        onMove: (ev) => {
          next = snapSectionRows(rows, ev.clientY - startY, steps, cellHeight, minRows);
          onDraft(next);
        },
        onEnd: () => {
          onDraft(null);
          setInteracting(false);
          if (next !== rows) onCommit(next);
        },
      });
    },
    [rows, minRows, rowSteps, cellHeight, onDraft, onCommit, setInteracting],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const delta = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (delta === 0) return;
      e.preventDefault();
      const next = Math.max(minRows, rows + delta);
      if (next !== rows) onCommit(next);
    },
    [rows, minRows, onCommit],
  );

  return (
    <div
      className={builder['section-resize']}
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      aria-valuenow={rows}
      aria-valuemin={minRows}
      tabIndex={0}
      data-vantage-section-resize=""
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      <span className={builder['section-resize__grip']} aria-hidden="true" />
    </div>
  );
}
