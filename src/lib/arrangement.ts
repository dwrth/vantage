import type {
  ArrangementAlign,
  ArrangementPresetId,
  Breakpoint,
  Section,
  SectionArrangement,
} from '../types';

/** Columns of the arrangement grid on desktop; presets divide it. */
export const ARRANGEMENT_COLUMNS = 12;

export const ARRANGEMENT_PRESET_IDS: ArrangementPresetId[] = [
  'single',
  'narrow',
  'two',
  'three',
  'four',
  'thirdTwoThirds',
  'twoThirdsThird',
  'mediaText',
  'cardGrid',
  'inlineRow',
];

export const ARRANGEMENT_ALIGNS: ArrangementAlign[] = ['start', 'center', 'end'];

/** Slots of one row on a grid of `columns`; the sequence repeats row after row. */
export type ArrangementTrack = {
  columns: number;
  spans: number[];
  /** A last row with a single block spans the whole row. */
  fillOrphan?: boolean;
};

type PresetTracks = { desktop: ArrangementTrack; tablet: ArrangementTrack };

export const STACKED_TRACK: ArrangementTrack = { columns: 1, spans: [1] };

const wide = (spans: number[]): ArrangementTrack => ({ columns: ARRANGEMENT_COLUMNS, spans });
const equal = (count: number) => Array<number>(count).fill(ARRANGEMENT_COLUMNS / count);
const twoPerRow: ArrangementTrack = { columns: 2, spans: [1, 1], fillOrphan: true };

export const ARRANGEMENT_PRESETS: Record<ArrangementPresetId, PresetTracks> = {
  single: { desktop: wide([12]), tablet: STACKED_TRACK },
  narrow: { desktop: wide([6]), tablet: wide([10]) },
  two: { desktop: wide(equal(2)), tablet: twoPerRow },
  three: { desktop: wide(equal(3)), tablet: twoPerRow },
  four: { desktop: wide(equal(4)), tablet: twoPerRow },
  thirdTwoThirds: { desktop: wide([4, 8]), tablet: wide([4, 8]) },
  twoThirdsThird: { desktop: wide([8, 4]), tablet: wide([8, 4]) },
  mediaText: { desktop: wide([6, 6]), tablet: wide([6, 6]) },
  cardGrid: { desktop: wide(equal(3)), tablet: twoPerRow },
  inlineRow: { desktop: wide(equal(6)), tablet: wide(equal(4)) },
};

export function isArrangementPreset(value: unknown): value is ArrangementPresetId {
  return typeof value === 'string' && Object.hasOwn(ARRANGEMENT_PRESETS, value);
}

export const isArrangementSection = (section: Pick<Section, 'arrangement'>): boolean =>
  section.arrangement !== undefined;

/** The slot sequence the section uses on `breakpoint`. */
export function arrangementTrack(
  arrangement: SectionArrangement,
  breakpoint: Breakpoint,
): ArrangementTrack {
  const tracks = ARRANGEMENT_PRESETS[arrangement.preset];
  if (breakpoint === 'desktop') return tracks.desktop;
  if (breakpoint === 'mobile' || arrangement.stackOn === 'tablet') return STACKED_TRACK;
  return tracks.tablet;
}

export type ArrangementSlot = {
  /** Zero-based first column. */
  col: number;
  span: number;
  /** Zero-based row. */
  row: number;
};

/** Slot of each of `count` blocks, in order. */
export function arrangeSlots(
  count: number,
  track: ArrangementTrack,
  align: ArrangementAlign = 'start',
): ArrangementSlot[] {
  const perRow = track.spans.length;
  const slots: ArrangementSlot[] = [];
  for (let start = 0; start < count; start += perRow) {
    const rowCount = Math.min(perRow, count - start);
    const orphan = track.fillOrphan === true && rowCount === 1 && perRow > 1;
    const spans = orphan ? [track.columns] : track.spans.slice(0, rowCount);
    const free = track.columns - spans.reduce((sum, span) => sum + span, 0);
    let col = align === 'center' ? Math.floor(free / 2) : align === 'end' ? free : 0;
    for (const span of spans) {
      slots.push({ col, span, row: start / perRow });
      col += span;
    }
  }
  return slots;
}

/**
 * Slot of each block (by id) on `breakpoint`. `visible` are the blocks shown there, in `items`
 * order; the stacked breakpoint reverses them when `mobileOrder` is 'reversed'.
 */
export function arrangementSlots<T extends { id: string }>(
  visible: T[],
  arrangement: SectionArrangement,
  breakpoint: Breakpoint,
): Map<string, ArrangementSlot> {
  const track = arrangementTrack(arrangement, breakpoint);
  const ordered =
    track === STACKED_TRACK && arrangement.mobileOrder === 'reversed'
      ? [...visible].reverse()
      : visible;
  const slots = arrangeSlots(ordered.length, track, arrangement.align);
  return new Map(ordered.map((item, index) => [item.id, slots[index]!]));
}

type Rect = { left: number; top: number; right: number; bottom: number };

const shareRow = (a: Rect, b: Rect) => a.top < b.bottom && b.top < a.bottom;

/**
 * Index among the blocks without the dragged one where a block dropped at a client point lands.
 * `rects` are those blocks as shown, in `items` order. The nearest block decides: a point after
 * its middle (horizontally within its row, else vertically) lands behind it.
 */
export function insertionIndexAt(rects: Rect[], point: { x: number; y: number }): number {
  if (rects.length === 0) return 0;
  let nearest = 0;
  let best = Number.POSITIVE_INFINITY;
  rects.forEach((rect, index) => {
    const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
    const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
    const distance = dx * dx + dy * dy;
    if (distance < best) {
      best = distance;
      nearest = index;
    }
  });
  const rect = rects[nearest]!;
  const inRow = [rects[nearest - 1], rects[nearest + 1]].some(
    (mate) => mate && shareRow(mate, rect),
  );
  const after =
    inRow && point.y >= rect.top && point.y <= rect.bottom
      ? point.x > (rect.left + rect.right) / 2
      : point.y > (rect.top + rect.bottom) / 2;
  return nearest + (after ? 1 : 0);
}

const LINE_PX = 3;

/**
 * Insertion line for dropping at `index` among blocks laid out at `rects` (same coordinate
 * space, `items` order): vertical in a row of several blocks, horizontal between rows.
 * `null` without blocks.
 */
export function insertionLine(
  rects: Rect[],
  index: number,
  gap: number,
): { left: number; top: number; width: number; height: number } | null {
  if (rects.length === 0) return null;
  const at = Math.max(0, Math.min(index, rects.length));
  const after = rects[at];
  const before = rects[at - 1];
  const half = gap / 2;
  if (after && before && shareRow(before, after)) {
    const top = Math.min(before.top, after.top);
    const bottom = Math.max(before.bottom, after.bottom);
    return {
      left: (before.right + after.left) / 2 - LINE_PX / 2,
      top,
      width: LINE_PX,
      height: bottom - top,
    };
  }
  if (after) {
    const next = rects[at + 1];
    return next && shareRow(after, next)
      ? {
          left: after.left - half - LINE_PX / 2,
          top: after.top,
          width: LINE_PX,
          height: after.bottom - after.top,
        }
      : {
          left: after.left,
          top: after.top - half - LINE_PX / 2,
          width: after.right - after.left,
          height: LINE_PX,
        };
  }
  const last = rects[rects.length - 1]!;
  const prev = rects[rects.length - 2];
  return prev && shareRow(prev, last)
    ? {
        left: last.right + half - LINE_PX / 2,
        top: last.top,
        width: LINE_PX,
        height: last.bottom - last.top,
      }
    : {
        left: last.left,
        top: last.bottom + half - LINE_PX / 2,
        width: last.right - last.left,
        height: LINE_PX,
      };
}
