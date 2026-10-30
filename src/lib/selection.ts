import type { SelectionRef } from '../context/BuilderContext';

export const sameRef = (a: SelectionRef | null | undefined, b: SelectionRef | null | undefined) =>
  !!a && !!b && a.sectionId === b.sectionId && a.itemId === b.itemId;

export const sameSelection = (a: readonly SelectionRef[], b: readonly SelectionRef[]) =>
  a.length === b.length && a.every((ref, i) => sameRef(ref, b[i]));

/**
 * Shift/Cmd/Ctrl-click: adds `ref` to the selection, or removes it when it is already selected.
 * A selection holds blocks of one section, so a block of another section starts a new one. The
 * last entry is the primary block (`selectedItem`).
 */
export function toggleSelection(
  current: readonly SelectionRef[],
  ref: SelectionRef,
): SelectionRef[] {
  if (current.length > 0 && current[0]!.sectionId !== ref.sectionId) return [ref];
  if (current.some((r) => sameRef(r, ref))) return current.filter((r) => !sameRef(r, ref));
  return [...current, ref];
}

/** A rectangle in client (or any shared) coordinates. */
export type ClientRect = { left: number; top: number; right: number; bottom: number };

/** The rectangle spanned by two corner points. */
export function rectFromPoints(ax: number, ay: number, bx: number, by: number): ClientRect {
  return {
    left: Math.min(ax, bx),
    top: Math.min(ay, by),
    right: Math.max(ax, bx),
    bottom: Math.max(ay, by),
  };
}

/**
 * Marquee hit-testing: ids of the blocks whose rectangle the marquee touches (any overlap with
 * area; edges that only meet do not count), in the order given.
 */
export function marqueeHits(
  blocks: readonly ({ id: string } & ClientRect)[],
  marquee: ClientRect,
): string[] {
  return blocks
    .filter(
      (b) =>
        b.left < marquee.right &&
        b.right > marquee.left &&
        b.top < marquee.bottom &&
        b.bottom > marquee.top,
    )
    .map((b) => b.id);
}

/** `base` plus `added` (in that order), without duplicates. */
export function mergeSelection(
  base: readonly SelectionRef[],
  added: readonly SelectionRef[],
): SelectionRef[] {
  const merged = [...base];
  for (const ref of added) if (!merged.some((r) => sameRef(r, ref))) merged.push(ref);
  return merged;
}
