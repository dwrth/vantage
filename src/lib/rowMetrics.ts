export function getRowStart(row: number, rowHeights: number[], fallbackStep: number): number {
  if (row <= 0) return 0;
  let y = 0;
  for (let i = 0; i < row; i += 1) {
    y += rowHeights[i] ?? fallbackStep;
  }
  return y;
}

export function closestRowForOffset(
  offset: number,
  rowHeights: number[],
  fallbackStep: number,
): number {
  if (fallbackStep <= 0) return 0;
  const safeOffset = Math.max(0, offset);
  let row = 0;
  let current = 0;

  while (row < rowHeights.length) {
    const next = current + (rowHeights[row] ?? fallbackStep);
    if (safeOffset <= (current + next) / 2) return row;
    current = next;
    row += 1;
  }

  return row + Math.round((safeOffset - current) / fallbackStep);
}

/**
 * Section height (in rows) after dragging its bottom edge by `dy` px from `startRows`.
 * Snaps to the nearest row boundary and never goes below `minRows`.
 */
export function snapSectionRows(
  startRows: number,
  dy: number,
  rowHeights: number[],
  fallbackStep: number,
  minRows: number,
): number {
  const bottom = getRowStart(startRows, rowHeights, fallbackStep) + dy;
  return Math.max(minRows, closestRowForOffset(bottom, rowHeights, fallbackStep));
}
