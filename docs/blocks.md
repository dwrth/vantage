# Building your own blocks

A block is a typed data shape plus a React component, bundled via `defineKind` and registered under a string `kind`. Vantage owns layout; you own content.

## 1. Define the data shape

```ts
export type HeroData = {
  title: string;
  body: string;
  cta?: string;
};
```

## 2. Write the renderer

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

## 3. Wrap with `defineKind`

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

## 4. Register the kind

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

## Patterns from the demo

The seven kinds in `demo/src/blocks/` cover the common shapes:

- **Static content** — `text`, `image`. Pure data → DOM, no event handling.
- **Variant via data** — `text` flips to a white-on-image `overlay` look when `data.variant === 'overlay'`. Use this instead of forking the kind.
- **Alignment via data** — `button` reads `align` / `vAlign` to position its surface inside the cell. The demo's right-click menu writes those fields per-breakpoint via `updateItemData<ButtonData>(layout, sectionId, itemId, { align: 'left' }, activeBreakpoint)` so mobile alignment doesn't leak into desktop.
- **Composed content** — `card` renders an image, body, and CTA from a single typed object. Wrapper class lifts the cell into a card with a shadow.
- **Form controls** — `input` is a stateless label + input; the host controls the value. The renderer calls `stopPropagation` on `onPointerDown` / `onClick` only when `interactive` is true so dnd-kit doesn't capture the gesture.
- **Stateful blocks** — `form` keeps its own `useState` for the email value and a `submitted` flag. `item.data` is read-only from the block's perspective; for persisted state, lift to the host and call `updateItemData`. See `demo/src/blocks/form/StatefulForm.tsx`.
- **Edit-only chrome** — `block` renders `{w}×{h} @ (x,y)` in edit mode and `null` in preview, useful as a debugging or spacer block.
- **Inspectors** — `text`, `button`, and `image` register an `inspector` on `defineKind`. The demo's `ItemInspector` resolves the selected item and renders that panel. Image and section backgrounds also ship a focal-point cropper for `cover` images.

## Interactivity inside edit mode

In `mode: 'edit'` every cell is a drag target. `interactive` is `true` when the pointer is hovering with intent to click rather than drag. For any interactive child — buttons, links, inputs, contenteditable — stop the gesture so dnd-kit doesn't capture it:

```tsx
<input
  onPointerDown={interactive ? (e) => e.stopPropagation() : undefined}
  onClick={interactive ? (e) => e.stopPropagation() : undefined}
/>
```

`mode: 'preview'` has no drag system; render interactive elements normally.

## Rules and pitfalls

- **No layout CSS on your root.** Do not set `gridColumn`, `gridRow`, `position: absolute/fixed`, `transform`, or `inset` on your component's root element. Vantage owns cell placement; these styles break drag/resize math.
- **Handle `item.data === undefined`.** After `importLayout` or for kinds without `defaults.data`, `data` may be missing. Always destructure with a fallback: `const data = item.data ?? {}`.
- **Same component runs in both modes.** Branch on `mode` for big differences (chrome, editing affordances). Don't ship two registries.
- **Library CSS is chrome only.** `vantage/style.css` styles the grid, drag handles, and section controls — not your content. Ship your own styles per block.
- **`kind` is your stable identifier.** Once layouts are persisted, renaming a `kind` orphans existing items. Treat it like a schema migration.
- **Generic types stay sharp.** `defineKind<HeroData>(...)` makes `item.data` typed as `HeroData | undefined` inside the renderer. Don't widen to `unknown` unless you mean it.
