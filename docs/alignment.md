# Alignment guides and content alignment

## Guides while dragging and resizing

While a block is dragged or resized, the builder draws thin lines (`--vantage-guide-color`, default orange) where the block lines up with other blocks of the same section, on the active breakpoint:

- **Edges and centres.** Left, centre and right of the block against the same edges of every other block (vertical lines), and top, middle and bottom (horizontal lines). Only like edges are compared: a block whose left edge touches another block's right edge is a neighbour, not aligned, and gets no line.
- **Section centre.** A dashed line when the block is centred in the section, horizontally (`columns / 2`) or vertically (`rows / 2`).
- **Size matches.** A small bar with end ticks (`--vantage-size-match-color`, defaults to the guide colour) on the block and on every block of the same width (bar at the bottom) or height (bar on the right).

A block dragged in from another section or a palette is compared through its drop ghost. Full-bleed blocks take part only vertically: their sides are the section's sides. Guides and markers disappear on drop, on Escape and when the gesture is cancelled. They are `aria-hidden` and ignore the pointer.

**No snapping to guides.** Placements already snap to whole cells, so a guide is simply "same column or row value as block K", exact in grid units, and the grid snap that exists today puts the block on the guide. Extra snapping would only help with sub-cell positions, which do not exist, and a magnetic pull within one cell would make it impossible to place a block one column next to another. The guides are visual hints.

The computation is pure and exported for hosts that draw their own overlay:

```ts
import { computeAlignment, guideBox } from 'vantage';

const { guides, sizeMatches } = computeAlignment(
  { id: 'a', x: 2, y: 0, w: 4, h: 2 }, // moving block (cells), `fullBleed?` optional
  otherBlocks, // GuideRect[]; the moving id is skipped
  { columns: 12, rows: 8 },
);
// guides: { orientation, edge, position, from, to, itemIds, sectionCenter }[] (grid units)
// sizeMatches: { dimension: 'w' | 'h', itemIds }[]
guideBox(guides[0], geometry); // { left, top, width, height } in px inside the grid element
```

## Content alignment inside a block

`GridItem.verticalAlign` (`'start' | 'center' | 'end'`) sets where a block's content sits vertically in its cell. The cell wrapper is a flex column, so the value maps to `justify-content` (with `safe`, so content taller than the cell is clipped at the bottom, not the top). Content that fills its cell (images, videos, anything with `height: 100%` or `flex: 1`) is unaffected.

It is per breakpoint, like placement: heights differ between breakpoints, so centring may only make sense on some of them. Desktop writes the item's own value, which tablet and mobile inherit; tablet and mobile write `ItemOverride.verticalAlign`.

```ts
setItemVerticalAlign(layout, sectionId, itemId, 'center'); // desktop
setItemVerticalAlign(layout, sectionId, itemId, 'end', 'mobile'); // mobile override
setItemVerticalAlign(layout, sectionId, itemId, undefined, 'mobile'); // inherit desktop again
resolveItemVerticalAlign(item, section, 'mobile'); // 'end'
```

Unset means "the kind decides": no alignment style is emitted, so a kind's `editWrapperClass` / `previewWrapperClass` keeps its own alignment (for example a button centred in its cell). An explicit `'start'` overrides it. The builder marks the block body with `data-valign`; `VantagePreview` does the same in single-breakpoint mode and emits `data-vp-valign="<breakpoint>-<value> …"` plus scoped `@container` rules in responsive mode. `moveItemToSection` carries the overrides, `hasItemOverride` counts them, and `validateLayout` accepts the field on items and item overrides.
