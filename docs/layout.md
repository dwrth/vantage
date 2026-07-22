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

Every helper is pure: it returns a new `Layout`. Call `onChange` with the result.

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
  onChange={setLayout}
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
