# Vantage

Controlled grid layout builder for React. Drag, resize, restack, and compose sections on a responsive CSS grid. You bring every block component; Vantage handles layout chrome, breakpoints, and the data model.

The demo app under `example/` is a working reference for everything below — toolbar, layers panel, section inspector, context menu, persistence, and a registry of seven block kinds. Run it with `npm run dev`.

## Install

Add Vantage as a git dependency in your `package.json`. The repo is private — use a GitHub PAT with `repo` read access:

```json
"vantage": "git+https://github_pat_<YOUR_GITHUB_PAT>@github.com/stuzubi/vantage.git"
```

Then install:

```bash
yarn
```

The `prepare` script builds `dist/` on install, so no separate build step is needed in the consumer.

## Quick start

Register your block kinds once, pass them to both the builder and the preview:

```tsx
import { useState } from 'react';
import {
  VantageBuilder,
  VantagePreview,
  createEmptyLayout,
  defineKind,
  type Layout,
} from 'vantage';
import 'vantage/style.css';

type HeroData = { title: string; body: string };

const heroKind = defineKind<HeroData>({
  component: ({ item, mode }) => (
    <div>
      <h2>{item.data?.title}</h2>
      <p>{item.data?.body}</p>
      {mode === 'edit' && <span>Editing</span>}
    </div>
  ),
  defaults: { w: 6, h: 4, label: 'Hero', data: { title: 'Hello', body: 'World' } },
  displayName: 'Hero',
});

const components = { hero: heroKind };

function App() {
  const [layout, setLayout] = useState<Layout>(createEmptyLayout);
  return (
    <>
      <VantageBuilder value={layout} onChange={setLayout} components={components} />
      <VantagePreview value={layout} components={components} />
    </>
  );
}
```

Everything past this point — breakpoints, overrides, layers, persistence — is opt-in. The default behavior is a single-section desktop builder backed by `createEmptyLayout()`.

## Components

### `VantageBuilder`

| Prop                       | Required | Description                                                                                       |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `value`                    | yes      | `Layout` to render.                                                                               |
| `onChange`                 | yes      | Called with the next `Layout` after every mutation.                                               |
| `components`               | yes      | `ComponentRegistry` mapping `kind` → renderer.                                                    |
| `selectedItem`             | no       | Controlled selection `{ sectionId, itemId }` or `null`. Omit for uncontrolled.                    |
| `defaultSelectedItem`      | no       | Initial selection when uncontrolled.                                                              |
| `onSelectionChange`        | no       | Fires when the user clicks a block, drags, or right-clicks.                                       |
| `activeBreakpoint`         | no       | Controlled breakpoint (`'desktop' \| 'tablet' \| 'mobile'`). Omit for uncontrolled.               |
| `defaultActiveBreakpoint`  | no       | Initial breakpoint when uncontrolled. Defaults to `'desktop'`.                                    |
| `onActiveBreakpointChange` | no       | Fires when the active breakpoint changes (selection click on a non-active breakpoint, code, etc). |
| `onItemContextMenu`        | no       | `(event, { sectionId, item }) => void` — right-click hook for layer menus, inspectors, deletions. |
| `renderSectionHeader`      | no       | `({ section, activeBreakpoint }) => ReactNode` slot for custom per-section header chrome.         |
| `renderSectionFooter`      | no       | `({ section, activeBreakpoint }) => ReactNode` slot for custom per-section footer chrome.         |
| `renderEditButton`         | no       | `({ sectionId, item, isSelected }) => ReactNode` slot for per-block settings/edit chrome.         |
| `renderDragHandle`         | no       | `({ sectionId, item, isSelected, isDragging, listeners, attributes }) => ReactNode` slot for custom drag-handle chrome. Vantage positions the slot and applies grab/grabbing cursor styling; you style the inner control. Falls back to the built-in handle when omitted. |
| `renderDeleteButton`       | no       | `({ sectionId, item, isSelected, onDelete }) => ReactNode` slot for custom delete chrome. Vantage positions the slot; you style the inner control. Falls back to the built-in delete button when omitted. |
| `className`                | no       | Extra class on the root.                                                                          |
| `children`                 | no       | Rendered above the canvas (use for inline toolbars; the demo uses a separate `Toolbar` instead).  |

### `VantagePreview`

| Prop         | Required | Description                                                                |
| ------------ | -------- | -------------------------------------------------------------------------- |
| `value`      | yes      | Same `Layout` shape as the builder.                                        |
| `components` | yes      | Same registry. Reuse it; do not ship a second one.                         |
| `breakpoint` | no       | Force a specific breakpoint. Omit to auto-detect from the container width. |
| `className`  | no       | Extra class on the root.                                                   |

Preview has no drag system, no chrome, no selection. It is safe to render at any size — render it inside an iframe, on a separate route (the demo uses `/preview`), or inline next to the builder.

Builder canvas ships without section header/footer chrome by default; the demo wires its own controls with `renderSectionHeader` and `renderSectionFooter`.

### `defineKind`

Bundles a renderer with the defaults used when the user clicks **+ Add** for that kind.

```ts
defineKind<TData>({
  component,             // FC<ItemRendererProps<TData>>
  defaults: {            // applied on add
    w, h,                // initial grid size in columns × rows
    label?,              // shown in the add menu and layers list
    data?,               // seed `data` so the first render is non-empty
  },
  displayName?,          // fallback label for menus / dev tools
  editWrapperClass?,     // class applied to the builder cell wrapper
  previewWrapperClass?,  // class applied to the preview cell wrapper
});
```

Wrappers are useful for transparent text cells, drop shadows, or overlay variants. The demo gives every block its own pair (`button.module.css`, `card.module.css`, …) so kinds can opt into different cell-level styling in each mode.

You can also register a bare function instead of a descriptor — fallback size is 3×2 and `data` starts `undefined`:

```ts
const components = { divider: ({ mode }) => <hr data-mode={mode} /> };
```

## Layout model

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

Stack order inside a section is the order of `section.items` — later items render on top when cells overlap. Use the layering helpers (below) to reorder.

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

Edge positions are no-ops. The demo wires these to a right-click context menu (`example/src/App.tsx` → `ContextMenu`):

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

## Breakpoints and responsive overrides

A layout always has `'desktop'` enabled and can opt into `'tablet'` and `'mobile'`. Each non-desktop breakpoint has:

- An **activation width** (`breakpointWidths.mobile = 640` → mobile applies when the viewport ≤ 640 px).
- A **preview width** (`breakpointPreviewWidths.mobile = 390` → the builder simulates the breakpoint at that frame width).

```ts
setLayoutBreakpoints(layout, ['desktop', 'mobile']);
setBreakpointWidth(layout, 'mobile', 720);
setBreakpointPreviewWidth(layout, 'mobile', 390);

getEnabledBreakpoints(layout); // ['desktop', 'mobile']
getBreakpointWidths(layout); // { mobile: 720 }
getBreakpointPreviewWidths(layout); // { mobile: 390 }
isBreakpointEnabled(layout, 'tablet'); // false
```

### Active breakpoint in the builder

`VantageBuilder` accepts a controlled `activeBreakpoint` so your toolbar can drive the simulated viewport:

```tsx
const [active, setActive] = useState<Breakpoint>('desktop');

<VantageBuilder
  value={layout}
  onChange={setLayout}
  components={components}
  activeBreakpoint={active}
  onActiveBreakpointChange={setActive}
/>;
```

The demo persists this to `localStorage` and re-clamps on load with `getEnabledBreakpoints` so a previously-saved `tablet` selection doesn't strand the user when tablet is later disabled.

### Per-breakpoint overrides

When the user drags, resizes, or edits a block's `data` while a non-desktop breakpoint is active, Vantage stores an `ItemOverride` instead of mutating the desktop placement. `ItemOverride` can carry `x` / `y` / `w` / `h`, `hidden`, and a partial `data` patch that is shallow-merged on top of the base item data at render time. You can also write overrides explicitly:

```ts
setSectionOverride(layout, sectionId, 'mobile', {
  columns: 4,
  colGap: 8,
  paddingTop: 24,
});
clearSectionOverride(layout, sectionId, 'mobile');
setItemHidden(layout, sectionId, itemId, 'mobile', true);
clearItemOverride(layout, sectionId, 'mobile', itemId);
```

Read the effective values with the resolution helpers:

```ts
resolveSection(section, 'mobile'); // { columns, colGap, rowGap, paddingTop, paddingBottom }
resolveItem(item, section, 'mobile'); // { x, y, w, h, hidden }
resolveItemData<HeroData>(item, section, 'mobile'); // item.data merged with the breakpoint's data override
hasItemOverride(item, section, 'mobile'); // boolean
resolveBreakpointFromWidth(width, layout); // for custom preview surfaces
resolveBreakpointFromLayout(width, layout); // alias used by VantagePreview internally
defaultColumnsForBreakpoint('mobile', baseColumns); // 4 by default for mobile, 2/3 of base for tablet
```

The sample layout (`example/sampleLayout.ts`) shows the data shape: a `Hero` section with `columns: 16` desktop and a mobile `overrides.mobile` block setting `columns: 4` plus a per-item `{ x, y, w, h }` map.

## Selection

`SelectionRef = { sectionId, itemId }`. Treat it as opaque.

Controlled (recommended once you need cross-component selection — layers panel, inspector, etc.):

```tsx
const [selection, setSelection] = useState<SelectionRef | null>(null);

<VantageBuilder
  value={layout}
  onChange={setLayout}
  components={components}
  selectedItem={selection}
  onSelectionChange={setSelection}
/>;
```

Or use the hook from inside any descendant of the builder:

```ts
import { useSelection } from 'vantage';
const { selection, setSelection } = useSelection();
```

The demo's `LayersPanel` reads `selection` to highlight a row and writes back when the user clicks one.

## Section backgrounds

```ts
type SectionBackground = {
  color?: string; // any valid CSS color
  image?: string; // URL
  imageSize?: 'cover' | 'contain' | 'auto';
  imagePosition?: string; // CSS background-position
  imageRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  blur?: number; // 0..200 px
  opacity?: number; // 0..1
};
```

Apply via `updateSection`:

```ts
updateSection(layout, sectionId, {
  background: {
    color: '#0f172a',
    image: 'https://picsum.photos/seed/hero/1600/900',
    imageSize: 'cover',
    blur: 24,
    opacity: 0.55,
  },
});
```

The background sits behind the grid (separate layer, so `blur` doesn't affect content). The demo's `SectionInspector` lets the user edit every field; it's pure host code on top of `updateSection`, so you can build the same panel however you like.

## Persistence

Vantage stores nothing for you. The demo serializes to `localStorage` on every change and reloads it on mount:

```ts
const STORAGE_KEY = 'app.layout';

function load(): Layout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyLayout();
    const parsed = JSON.parse(raw);
    if (!isValidLayout(parsed)) return createEmptyLayout();
    return importLayout(parsed);
  } catch {
    return createEmptyLayout();
  }
}

useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}, [layout]);
```

For file-based import/export the same pattern works with `exportLayout` (canonicalizes breakpoint widths) and a `Blob`/`FileReader`. See `example/src/Toolbar.tsx` for the full implementation, including a hidden `<input type="file">` and graceful `isValidLayout` rejection.

## Preview as a separate route

`VantagePreview` has no chrome, so it's well-suited to a `/preview` route or a popout window. The demo branches on `window.location.pathname` inside `App.tsx`:

```tsx
if (window.location.pathname.startsWith('/preview')) {
  return <VantagePreview value={layout} components={exampleComponents} />;
}
```

Opening `/preview` in a new tab gives the user a clean render without dragging the builder along.

## Building your own blocks

A block is a typed data shape plus a React component, bundled via `defineKind` and registered under a string `kind`. Vantage owns layout; you own content.

### 1. Define the data shape

```ts
export type HeroData = {
  title: string;
  body: string;
  cta?: string;
};
```

### 2. Write the renderer

A renderer is `FC<ItemRendererProps<TData>>`. Vantage calls it in both builder (`mode: 'edit'`) and preview (`mode: 'preview'`). Render **content only** — Vantage already placed the cell.

For non-trivial blocks, split into `*Edit` / `*Preview` sub-components and pick inside the exported renderer. The demo follows this pattern for every block:

```tsx
function CardEdit({ item, interactive }: ItemRendererProps<CardData>) {
  /* uses `interactive` to stopPropagation on clicks */
}
function CardPreview({ item }: ItemRendererProps<CardData>) {
  /* no chrome, no event handlers */
}
export function CardComponent(props: ItemRendererProps<CardData>) {
  return props.mode === 'preview' ? <CardPreview {...props} /> : <CardEdit {...props} />;
}
```

### 3. Wrap with `defineKind`

```ts
export const heroKind = defineKind<HeroData>({
  component: HeroComponent,
  defaults: {
    w: 6,
    h: 4,
    label: 'Hero',
    data: { title: 'Headline', body: 'Supporting copy.', cta: 'Learn more' },
  },
  displayName: 'Hero',
  editWrapperClass: 'hero-cell--edit',
  previewWrapperClass: 'hero-cell--preview',
});
```

### 4. Register the kind

Plain object, keyed by `kind`. Keys are case-sensitive and must match `GridItem.kind` in saved layouts:

```ts
import type { ComponentRegistry } from 'vantage';

export const components: ComponentRegistry = {
  hero: heroKind,
  text: textKind,
  image: imageKind,
};
```

Pass the **same** registry to both `VantageBuilder` and `VantagePreview`. Missing kinds render a placeholder and log a one-time warning.

### Patterns from the demo

The seven kinds in `example/src/blocks/` cover the common shapes:

- **Static content** — `text`, `image`. Pure data → DOM, no event handling.
- **Variant via data** — `text` flips to a white-on-image `overlay` look when `data.variant === 'overlay'`. Use this instead of forking the kind.
- **Alignment via data** — `button` reads `align` / `vAlign` to position its surface inside the cell. The demo's right-click menu writes those fields per-breakpoint via `updateItemData<ButtonData>(layout, sectionId, itemId, { align: 'left' }, activeBreakpoint)` so mobile alignment doesn't leak into desktop.
- **Composed content** — `card` renders an image, body, and CTA from a single typed object. Wrapper class lifts the cell into a card with a shadow.
- **Form controls** — `input` is a stateless label + input; the host controls the value. The renderer calls `stopPropagation` on `onPointerDown` / `onClick` only when `interactive` is true so dnd-kit doesn't capture the gesture.
- **Stateful blocks** — `form` keeps its own `useState` for the email value and a `submitted` flag. `item.data` is read-only from the block's perspective; for persisted state, lift to the host and call `updateItemData`. See `example/src/blocks/form/StatefulForm.tsx`.
- **Edit-only chrome** — `block` renders `{w}×{h} @ (x,y)` in edit mode and `null` in preview, useful as a debugging or spacer block.

### Interactivity inside edit mode

In `mode: 'edit'` every cell is a drag target. `interactive` is `true` when the pointer is hovering with intent to click rather than drag. For any interactive child — buttons, links, inputs, contenteditable — stop the gesture so dnd-kit doesn't capture it:

```tsx
<input
  onPointerDown={interactive ? (e) => e.stopPropagation() : undefined}
  onClick={interactive ? (e) => e.stopPropagation() : undefined}
/>
```

`mode: 'preview'` has no drag system; render interactive elements normally.

### Rules and pitfalls

- **No layout CSS on your root.** Do not set `gridColumn`, `gridRow`, `position: absolute/fixed`, `transform`, or `inset` on your component's root element. Vantage owns cell placement; these styles break drag/resize math.
- **Handle `item.data === undefined`.** After `importLayout` or for kinds without `defaults.data`, `data` may be missing. Always destructure with a fallback: `const data = item.data ?? {}`.
- **Same component runs in both modes.** Branch on `mode` for big differences (chrome, editing affordances). Don't ship two registries.
- **Library CSS is chrome only.** `vantage/style.css` styles the grid, drag handles, and section controls — not your content. Ship your own styles per block.
- **`kind` is your stable identifier.** Once layouts are persisted, renaming a `kind` orphans existing items. Treat it like a schema migration.
- **Generic types stay sharp.** `defineKind<HeroData>(...)` makes `item.data` typed as `HeroData | undefined` inside the renderer. Don't widen to `unknown` unless you mean it.

## Building your own panels

`LayersPanel`, `SectionInspector`, `Toolbar`, and `ContextMenu` in `example/src/` are **host code**, not part of the library — Vantage exposes the mutations and resolution helpers, you build the UI. The pieces you'll most often reach for:

| Need                                         | Helpers                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| Render a sortable list of items in a section | `section.items`, `reorderItemAtIndex`, `setSelection`                  |
| Hide / show an item per breakpoint           | `setItemHidden`, `resolveItem`, `hasItemOverride`                      |
| Reset a per-breakpoint tweak                 | `clearItemOverride`, `clearSectionOverride`                            |
| Inspect a section's effective layout         | `resolveSection(section, activeBreakpoint)`                            |
| Edit section gaps / padding / columns        | `updateSection`, `setSectionOverride`                                  |
| Patch a single field of `item.data`          | `updateItemData<TData>(layout, sectionId, itemId, patch, breakpoint?)` |
| Read effective `item.data` at a breakpoint   | `resolveItemData<TData>(item, section, breakpoint)`                    |
| Import / export                              | `exportLayout`, `importLayout`, `isValidLayout`                        |

## Development

```bash
npm install
npm run dev        # example app on http://localhost:5173
npm run build      # library dist/
npm run typecheck
```
