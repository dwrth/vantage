# Arrangement sections

A section is a free grid by default. Setting `section.arrangement` makes it an **arrangement**: a flow of blocks that the preset lays out on every breakpoint, with no coordinates to edit.

```ts
type SectionArrangement = {
  preset: ArrangementPresetId; // single, narrow, two, three, four, thirdTwoThirds, twoThirdsThird, mediaText, cardGrid, inlineRow
  align?: 'start' | 'center' | 'end'; // a row that is not full
  verticalAlign?: 'start' | 'center' | 'end'; // blocks of different height in a row
  equalHeight?: boolean; // every block as tall as the tallest of its row
  stackOn?: 'tablet' | 'mobile'; // default 'mobile'
  mobileOrder?: 'asis' | 'reversed'; // order once the section is one column
};
```

## Model

- The order of `section.items` is the order of the slots. `x`, `y`, `w`, `h` and `rows` are ignored (new blocks get `0, 0` and the kind's size).
- Desktop is a 12 column track; the preset divides it (`ARRANGEMENT_PRESETS`). Tablet uses the preset's tablet track (two columns for the equal presets, with a lone last block spanning the row), or one column when `stackOn` is `'tablet'`. Mobile is always one column.
- `colGap` and `rowGap` are the spacing; `paddingTop` / `paddingBottom` and the per-breakpoint gap overrides still apply.
- Blocks are as tall as their content. A kind that fills its cell (images, video) declares `arrangementAspectRatio(item)`; the block then keeps that ratio at its column width.
- Per-block hiding per breakpoint is the existing `setItemHidden(layout, sectionId, itemId, breakpoint, hidden)`. A hidden block takes no slot on that breakpoint. Nothing else is overridden per breakpoint.

## Mutations

- `addSection(layout, { arrangement })` creates an arrangement section.
- `addItem(layout, sectionId, kind, { index })` inserts at an index (appended without one).
- `moveItemToIndex(layout, sectionId, itemId, index)` reorders; `moveItemToSection(..., { index })` moves between sections.
- `setSectionArrangement(layout, sectionId, arrangement | null)` switches a section. From a free grid the blocks are ordered by their desktop reading order and the grid placement of the breakpoints is dropped. `null` writes the current arrangement out as explicit `x / y / w / h` on every breakpoint (rows as tall as their tallest block).
- `validateLayout` / `isValidLayout` check the preset and the options.

## Builder

- Dragging a block (or a palette item, through `externalDrag`) targets an index: the canvas shows an insertion line and `onExternalDrop` reports `index` (and `x: 0, y: 0`). Arrow keys reorder the selected block; resize and layer keys do nothing.
- Blocks use the same chrome (`renderEditButton`, `renderDragHandle`, `renderDeleteButton`) as in a free grid. There is no marquee, group selection, alignment guide or section resize handle in an arrangement.
- Pure helpers: `arrangeSlots`, `arrangementSlots`, `arrangementTrack`, `insertionIndexAt`, `insertionLine`.
