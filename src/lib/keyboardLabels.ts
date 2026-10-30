import type { GridItem } from '../types';

/** Accessible names and descriptions of builder blocks and their chrome, e.g. for translation. */
export type BlockLabels = {
  /** Accessible name of a block. Default: its `label`, else its `kind`. */
  block: (item: GridItem) => string;
  /** Spoken instead of the generic "group" role. Default: `'block'`. */
  roleDescription: string;
  /** Keyboard help read after a block's name (via `aria-describedby`). */
  instructions: string;
  /** Default drag handle (when no `renderDragHandle`). */
  dragHandle: (item: GridItem) => string;
  /** Default delete button (when no `renderDeleteButton`). */
  deleteButton: (item: GridItem) => string;
};

/** What a keyboard action did to a block. Positions and sizes are 1-based grid cells. */
export type BlockAnnouncementContext = {
  item: GridItem;
  /** The block's accessible name (`BlockLabels.block`). */
  name: string;
  column: number;
  row: number;
  width: number;
  height: number;
};

/** Screen-reader messages for keyboard edits, read through a polite live region. */
export type BlockAnnouncements = {
  moved: (ctx: BlockAnnouncementContext) => string;
  resized: (ctx: BlockAnnouncementContext) => string;
  deleted: (ctx: BlockAnnouncementContext) => string;
  broughtForward: (ctx: BlockAnnouncementContext) => string;
  sentBackward: (ctx: BlockAnnouncementContext) => string;
  deselected: (ctx: BlockAnnouncementContext) => string;
  undone: () => string;
  redone: () => string;
};

const nameOf = (item: GridItem) => item.label ?? item.kind;

export const DEFAULT_BLOCK_LABELS: BlockLabels = {
  block: nameOf,
  roleDescription: 'block',
  instructions:
    'Arrow keys move the block, Shift and arrow keys resize it. Delete removes it, Escape deselects it. Ctrl or Cmd with Shift and up or down arrow changes the layer.',
  dragHandle: (item) => `Drag ${nameOf(item)}`,
  deleteButton: (item) => `Delete ${nameOf(item)}`,
};

export const DEFAULT_BLOCK_ANNOUNCEMENTS: BlockAnnouncements = {
  moved: ({ name, column, row }) => `${name} moved to column ${column}, row ${row}`,
  resized: ({ name, width, height }) => `${name} resized to ${width} columns by ${height} rows`,
  deleted: ({ name }) => `${name} deleted`,
  broughtForward: ({ name }) => `${name} brought forward`,
  sentBackward: ({ name }) => `${name} sent backward`,
  deselected: ({ name }) => `${name} deselected`,
  undone: () => 'Undone',
  redone: () => 'Redone',
};
