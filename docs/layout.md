# Layout model & mutations

## Data shape

```ts
type Layout = {
  sections: Section[];
  breakpoints: Breakpoint[]; // ['desktop', ...]
  breakpointWidths: Partial<Record<'mobile' | 'tablet', number>>; // activation cutoffs (px)
  breakpointPreviewWidths: Partial<Record<'mobile' | 'tablet', number>>; // canvas widths
};

type Section = {
  id: string;
  label?: string;
  columns: number; // grid columns
  colGap: number; // px
  rowGap: number; // px
  paddingTop?: number; // px, default 24
  paddingBottom?: number; // px, default 24
  rows?: number; // height in grid rows; unset = follows content (new sections: 4)
  items: GridItem[];
  background?: SectionBackground; // color / image / blur / opacity
  overrides?: Partial<Record<'tablet' | 'mobile', SectionOverride>>;
};

type GridItem<TData = unknown> = {
  id: string;
  x: number;
  y: number; // 0-indexed grid coords
  w: number;
  h: number; // grid units
  kind: string; // registry key
  label?: string;
  ref?: string; // external entity id (optional)
  data?: TData; // block payload (optional when `ref` resolves externally)
};
```

`Layout` serializes to JSON. Prefer `stripData` + `exportLayout(layout, registry)` when payloads live outside the layout. Validate with `isValidLayout` before `importLayout(raw, registry)`, then `hydrate` from your entity map. See [Persistence](persistence.md).

Stack order inside a section is the order of `section.items` — later items render on top when cells overlap. Use the layering helpers below to reorder.

## Mutating the layout

Every helper is pure: it returns a new `Layout`. Emit via `onChange(next, changeset)` — Builder and `VantageInspector` compute the changeset for you. Host panels outside those trees should use `emitLayoutChange`:

```ts
import { emitLayoutChange, updateSection } from 'vantage';

emitLayoutChange(layout, updateSection(layout, sectionId, { columns: 16 }), onChange);
// equivalent to: onChange(next, diffLayouts(layout, next))
```

`LayoutChangeset` lists what changed (empty arrays / `null` when nothing matches):

| Field                                                         | When                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `itemsAdded` / `itemsRemoved` / `itemsUpdated` / `itemsMoved` | Item identity / ref / cross-section moves                                                      |
| `itemsReordered`                                              | Same item ids, different stack order                                                           |
| `sectionsAdded` / `sectionsRemoved` / `sectionsUpdated`       | Section identity; chrome fields (`columns`, gaps, padding, background, overrides, meta, label) |
| `layoutUpdated`                                               | Top-level breakpoints / widths / meta                                                          |

Unchanged sections and items keep the same object references (structural sharing).

For undo/redo, wrap your host `onChange` with [`useVantageHistory`](history.md) — same `(next, changeset)` signature.

### Sections

```ts
const { layout: next, sectionId } = addSection(layout); // appends a default section
removeSection(layout, sectionId);
updateSection(layout, sectionId, { columns: 16, colGap: 4, paddingTop: 48 });
resizeSection(layout, sectionId, rows, breakpoint?);  // height in rows; never below content
sectionRows(section, breakpoint);                     // rows the section spans there
```

Section height is `rows` grid rows. The builder sets it with the resize edge at the bottom of each section (drag snaps to rows; arrow keys step one row). `resizeSection` never shrinks below the content at that breakpoint or `MIN_SECTION_ROWS`, and writes the breakpoint's override off desktop. `rows` is a floor when rendering: content below it still shows. Without `rows` (older layouts) the height follows the content, or `DEFAULT_SECTION_ROWS` while empty.

Dragging blocks never resizes a section. `moveItem`, `resizeItem`, `moveItemToSection` and `addItem` with an explicit `y` first pin the section's current height at that breakpoint (writing `rows` if it was unset), then clamp the block into it: it stops at the last row, and a block taller than the section shrinks to its height, the same way a too-wide block shrinks to `columns`. `addItem` without a position still appends below the content and extends the section.

### Items

```ts
addItem(layout, sectionId, 'hero', heroKind.defaults);   // pass the kind's defaults
moveItem(layout, sectionId, itemId, x, y, breakpoint?);
moveItemToSection(layout, fromSectionId, itemId, toSectionId, { x?, y?, breakpoint? });
resizeItem(layout, sectionId, itemId, x, y, w, h, breakpoint?);
removeItem(layout, sectionId, itemId);                   // also strips per-breakpoint overrides
updateItemData<HeroData>(layout, sectionId, itemId, { title: 'New' }, breakpoint?); // shallow merge into data
reorderItemAtIndex(layout, sectionId, fromIndex, toIndex); // for layers-panel DnD
```

`addItem` accepts optional desktop `x` / `y` in its defaults (otherwise the next free slot).

`moveItemToSection` keeps the item's id, size, `ref`, `data` and `meta`, puts it on top of the target stack and carries per-breakpoint `hidden` / `data` overrides; positions from the old grid are dropped. `x` / `y` refer to `breakpoint`'s grid (desktop placement goes to the next free slot when moving on a non-desktop breakpoint). `diffLayouts` reports a cross-section move as `itemsRemoved` + `itemsAdded`.

`moveItem` / `resizeItem` / `updateItemData` write to the section's items when `breakpoint === 'desktop'` (the default) and to that breakpoint's overrides otherwise. For `updateItemData`, the patch is shallow-merged on top of the resolved data (base + any existing override) so unaffected fields keep falling through from desktop.

### Layering (z-order within a section)

```ts
bringItemForward(layout, sectionId, itemId); // one step toward the front
sendItemBackward(layout, sectionId, itemId); // one step toward the back
bringItemToFront(layout, sectionId, itemId); // move to top of stack
sendItemToBack(layout, sectionId, itemId); // move to bottom of stack
```

Edge positions are no-ops. The demo wires these to a right-click context menu (`demo/src/App.tsx` → `ContextMenu`):

```tsx
<VantageBuilder
  value={layout}
  onChange={(next) => setLayout(next)}
  components={components}
  onItemContextMenu={(e, { sectionId, item }) => {
    setLayerMenu({ x: e.clientX, y: e.clientY, sectionId, itemId: item.id });
  }}
/>
```

### Lifecycle

```ts
createEmptyLayout(); // default ['desktop','mobile'] enabled
clearLayout(); // same as above; useful as a button handler
importLayout(json, registry); // fromPersistedData + validate + clamp
exportLayout(layout, registry); // toPersistedData + canonicalize breakpoints
stripData(layout); // drop payloads; keep ref
hydrate(layout, entities); // fill data from entities[ref]
isValidLayout(unknown); // structural type guard (accepts optional ref)
```
