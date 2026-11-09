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
- `setSectionArrangement(layout, sectionId, arrangement | null)` switches a section. From a free grid the blocks are ordered by their desktop reading order and the grid placement of the breakpoints is dropped. `null` writes the current arrangement out as explicit `x / y / w / h` on every breakpoint (rows as tall as their tallest block), on the grid a free-grid section gets: desktop keeps `section.columns`, tablet and mobile get `defaultColumnsForBreakpoint(section.columns, bp)` (8 and 4 for 12 columns), and the preset's slots scale onto those columns. The preset's own track columns (one column when stacked) are not kept.
- `validateLayout` / `isValidLayout` check the preset and the options.

## Builder

- Dragging a block (or a palette item, through `externalDrag`) targets an index in `items`; `onExternalDrop` reports it as `index` (and `x: 0, y: 0`). Arrow keys reorder the selected block; resize and layer keys do nothing.
- **Drop preview.** While a drag hovers an arrangement section, the section shows the layout the drop would produce: the other blocks take their new slots (preset, columns, stacking and `mobileOrder` of the active breakpoint) and the dropped block's slot is an active drop slot of its columns and approximate height (the dragged block's height, or `h` rows for a palette item, at most 320px). The preview comes from `arrangementDropPreview`, which runs the drop's own mutation (`moveItemToSection`, or `addItem` for a palette item) on a copy; the layout and history change only on drop. Leaving the section or cancelling removes it. Blocks glide to their preview slots (160ms, none under `prefers-reduced-motion: reduce`). The dragged block keeps its place under the pointer, also when a preview above its own section changes that section's position.
- **Drop slots.** While anything is dragged, every arrangement section that is not hovered shows an inactive slot where an appended block would go (an empty section shows it instead of its placeholder). The hovered section shows the active slot instead. Slots carry `data-vantage-drop-slot="active" | "inactive"` and are themed by `--vantage-slot-color` (default `--vantage-drop-color`, then `#2563eb`) and `--vantage-slot-radius` (default `6px`); inactive slots use the color faintly. Hovering the slot keeps the target, so the reflow cannot make it flip.
- Blocks use the same chrome (`renderEditButton`, `renderDragHandle`, `renderDeleteButton`) as in a free grid. There is no marquee, group selection, alignment guide or section resize handle in an arrangement.
- Pure helpers: `arrangeSlots`, `arrangementSlots`, `arrangementTrack`, `insertionIndexAt`, `insertionLine`, `arrangementDropLayout`, `arrangementDropPreview`, `trailingSlot`.
