import type { ArrangementSlot } from '../lib/arrangement';
import arrangement from '../styles/arrangement.module.css';

type ArrangementDropSlotProps = {
  slot: ArrangementSlot;
  /** The target under the pointer; otherwise an unobtrusive hint where a drop can go. */
  active: boolean;
  /** Minimum height in px (the dropped block's approximate height). */
  height?: number;
};

/**
 * Placeholder cell a drop lands in, on the columns of its slot. Themed by the `--vantage-slot-*`
 * tokens (see docs/arrangement.md).
 */
export function ArrangementDropSlot({ slot, active, height }: ArrangementDropSlotProps) {
  return (
    <div
      className={[arrangement.slot, active ? arrangement['slot--active'] : '']
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
      data-vantage-drop-slot={active ? 'active' : 'inactive'}
      style={{
        gridColumn: `${slot.col + 2} / span ${slot.span}`,
        gridRow: slot.row + 1,
        minHeight: height,
      }}
    />
  );
}
