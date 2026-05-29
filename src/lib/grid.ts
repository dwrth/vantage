import type { GridItem } from '../types';

export const CELL_MAX_PX = 96;
export const ROW_MAX_PX = 48;
export const MOBILE_BREAKPOINT_PX = 640;

export function pxToCell(px: number, cellSize: number): number {
  if (cellSize <= 0) return 0;
  return Math.sign(px) * Math.round(Math.abs(px) / cellSize);
}

export function getContentMaxWidth(
  columns: number,
  _gap: number,
  cellMaxPx: number = CELL_MAX_PX,
): number {
  // Section width is independent of column gap: changing gap shrinks
  // the cells, not the overall section width.
  return columns * cellMaxPx;
}

export function getFlexRowHeight(
  containerWidth: number,
  columns: number,
  gap: number,
  rowMaxPx: number = ROW_MAX_PX,
  cellMaxPx: number = CELL_MAX_PX,
): number {
  if (cellMaxPx <= 0) return 0;
  const cellWidth = getCellWidth(containerWidth, columns, gap, cellMaxPx);
  return (cellWidth * rowMaxPx) / cellMaxPx;
}

export function getGridContentWidth(
  containerWidth: number,
  columns: number,
  gap: number,
  cellMaxPx: number = CELL_MAX_PX,
): number {
  const available = Math.max(0, containerWidth - gap * 2);
  return Math.min(available, getContentMaxWidth(columns, gap, cellMaxPx));
}

export function getGridContentOffset(
  containerWidth: number,
  columns: number,
  gap: number,
  cellMaxPx: number = CELL_MAX_PX,
): number {
  const contentWidth = getGridContentWidth(containerWidth, columns, gap, cellMaxPx);
  return Math.max(0, (containerWidth - contentWidth) / 2);
}

export function clampItem(
  item: Pick<GridItem, 'x' | 'y' | 'w' | 'h'>,
  columns: number,
): Pick<GridItem, 'x' | 'y' | 'w' | 'h'> {
  const w = Math.max(1, Math.min(item.w, columns));
  const x = Math.max(0, Math.min(item.x, columns - w));
  const h = Math.max(1, item.h);
  const y = Math.max(0, item.y);
  return { x, y, w, h };
}

export function overlaps(a: GridItem, b: GridItem): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function getCellWidth(
  containerWidth: number,
  columns: number,
  gap: number,
  cellMaxPx: number = CELL_MAX_PX,
): number {
  if (columns <= 0) return 0;
  const inner = getGridContentWidth(containerWidth, columns, gap, cellMaxPx);
  return Math.max(0, (inner - gap * (columns - 1)) / columns);
}

export function getCellHeight(rowHeight: number, gap: number): number {
  return rowHeight + gap;
}

export function getCellXStep(cellWidth: number, gap: number): number {
  if (cellWidth <= 0) return 0;
  return cellWidth + gap;
}

export function deltaToGrid(
  deltaX: number,
  deltaY: number,
  cellXStep: number,
  cellHeight: number,
): { dx: number; dy: number } {
  return {
    dx: pxToCell(deltaX, cellXStep),
    dy: pxToCell(deltaY, cellHeight),
  };
}

export function nextSlot(items: GridItem[]): { x: number; y: number } {
  if (items.length === 0) return { x: 0, y: 0 };
  const maxY = Math.max(...items.map((i) => i.y + i.h));
  return { x: 0, y: maxY };
}

/** Whether a pointer (client coords) lies inside a grid item's cell bounds. */
export function pointerHitsItem(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  item: GridItem,
  cellWidth: number,
  cellXStep: number,
  colGap: number,
  flexRowPx: number,
  rowGap: number,
  contentOffsetX: number = 0,
  contentOffsetY: number = 0,
): boolean {
  const x = clientX - containerRect.left;
  const y = clientY - containerRect.top;
  const itemLeft = contentOffsetX + item.x * cellXStep;
  const itemTop = contentOffsetY + item.y * (flexRowPx + rowGap);
  const itemWidth = item.w * cellWidth + Math.max(0, item.w - 1) * colGap;
  const itemHeight = item.h * flexRowPx + Math.max(0, item.h - 1) * rowGap;
  return x >= itemLeft && x < itemLeft + itemWidth && y >= itemTop && y < itemTop + itemHeight;
}

/** Items under a pointer, top of stack first (later in `items` = on top). */
export function itemsAtPointer(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  items: GridItem[],
  cellWidth: number,
  cellXStep: number,
  colGap: number,
  flexRowPx: number,
  rowGap: number,
  contentOffsetX: number = 0,
  contentOffsetY: number = 0,
): GridItem[] {
  const hits: { item: GridItem; index: number }[] = [];
  items.forEach((item, index) => {
    if (
      pointerHitsItem(
        clientX,
        clientY,
        containerRect,
        item,
        cellWidth,
        cellXStep,
        colGap,
        flexRowPx,
        rowGap,
        contentOffsetX,
        contentOffsetY,
      )
    ) {
      hits.push({ item, index });
    }
  });
  hits.sort((a, b) => b.index - a.index);
  return hits.map((h) => h.item);
}
