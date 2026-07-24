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
  data?: TData; // your block-specific payload
};
```

`Layout` serializes cleanly to JSON. Persist it as-is. Validate untrusted input with `isValidLayout(data)` before passing it to `importLayout`.

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
```

### Items

```ts
addItem(layout, sectionId, 'hero', heroKind.defaults);   // pass the kind's defaults
moveItem(layout, sectionId, itemId, x, y, breakpoint?);
resizeItem(layout, sectionId, itemId, w, h, breakpoint?);
removeItem(layout, sectionId, itemId);                   // also strips per-breakpoint overrides
updateItemData<HeroData>(layout, sectionId, itemId, { title: 'New' }, breakpoint?); // shallow merge into data
reorderItemAtIndex(layout, sectionId, fromIndex, toIndex); // for layers-panel DnD
```

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
importLayout(json); // clamps items, prunes invalid overrides
exportLayout(layout); // canonicalizes breakpoints/widths for serialization
isValidLayout(unknown); // type guard for untrusted JSON
```
