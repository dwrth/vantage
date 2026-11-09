# Overlap safety

Two builder aids keep blocks readable: a content minimum size that resizing cannot go below,
and a warning on blocks that overlap by accident, with a one-click fix. Both are edit-mode
only; `VantagePreview` renders exactly as before.

## Content minimum size

The host knows how much room a block's content needs; the builder enforces it.

```tsx
<VantageBuilder
  getItemMinSize={(item, breakpoint) => {
    if (item.kind === 'button') return { w: 2, h: 1 };
    const px = measuredHeights.get(item.id); // e.g. from a ResizeObserver on the content
    return px ? { heightPx: px } : null;
  }}
/>
```

`ItemMinSize` is `{ w?: number; h?: number; heightPx?: number }`:

- `w` / `h` are columns / rows of the breakpoint's grid. `w` is capped at the grid's columns.
- `heightPx` is turned into rows at the section's base row height (`rowsForHeight`), so the
  block fits the content without rows having to grow. The larger of `h` and that wins.

The limit is hard: pointer resize (all eight handles) and Shift+arrow keys never shrink a block
below it, on every breakpoint. A block that is already smaller than its minimum (for example
after its content grew) can still be resized, but not made smaller than it was; the builder
does not grow it on its own. The callback runs on render for every block, so keep it cheap.

Pure helpers: `resolveMinSize(min, { columns, cellHeight, rowGap })` → `{ w, h }` in cells,
`resizeFloor(start, minSize)` (the lower bound of one gesture) and
`resizeByHandle(start, edge, dw, dh, columns, rows?, minSize?)`.

## Overlap warning

```ts
findOverlaps(section, breakpoint); // [{ below: 'a', above: 'b' }, ...] in stacking order
overlappingItems(section, breakpoint); // Map<itemId, partnerIds[]>
```

Both use the placement at `breakpoint` (overrides included), skip blocks hidden there, treat
full-bleed blocks as spanning the row, and ignore every pair that involves a block with
`allowOverlap`.

In the builder, overlapping blocks get a dashed amber outline, a `data-vantage-overlap`
attribute on the block body and a badge in the bottom-left corner. The selected block also
shows two buttons:

- **Move below** (`moveItemBelowOverlaps`): the block moves down to the first rows below the
  blocks it overlaps where nothing else is in the way, keeping its column and size. The
  section grows when the block lands below its last row (that breakpoint's `rows` only). One
  layout change, so one undo step.
- **Keep overlap** (`setItemAllowOverlap(layout, sectionId, itemId, true)`): marks intended
  layering, e.g. text on an image. The flag is stored on the item and applies on every
  breakpoint; pass `false` to warn again. Stacking order is still `section.items`.

Labels come from `blockLabels.overlapWarning`, `blockLabels.moveBelow` and
`blockLabels.keepOverlap`. Replace the whole control with `renderOverlapWarning`, or turn the
warning off with `showOverlapWarnings={false}`.

```ts
moveItemBelowOverlaps(layout, sectionId, itemId, breakpoint?); // unchanged layout when no overlap
rowBelowOverlaps(section, itemId, breakpoint); // target row, or null
```
