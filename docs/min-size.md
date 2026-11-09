# Content minimum size

The host knows how much room a block's content needs; the builder enforces it while editing.
`VantagePreview` is unaffected.

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
