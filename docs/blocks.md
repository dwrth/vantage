# Building your own blocks

A block is a typed data shape plus React components, bundled via `defineKind` and registered under a string `kind`. Vantage owns layout; you own content.

## 1. Define the data shape

```ts
export type HeroData = {
  title: string;
  body: string;
  cta?: string;
};
```

## 2. Write preview and edit renderers

Register separate FCs for each surface. Render **content only** — Vantage already placed the cell.

| Surface           | Props                                         | When mounted                                               |
| ----------------- | --------------------------------------------- | ---------------------------------------------------------- |
| `component`       | `PreviewRendererProps` (`{ item }`)           | Always in `VantagePreview`                                 |
| `editComponent`   | `EditRendererProps` (`{ item, interactive }`) | Builder, when selected (or always if no `editPlaceholder`) |
| `editPlaceholder` | `PreviewRendererProps` (`{ item }`)           | Builder, until the item is selected                        |

When `editComponent` is omitted, the builder mounts `component` with `{ item }` only. Kinds that need edit gestures (stopPropagation, etc.) must supply `editComponent`.

```tsx
function CardPreview({ item }: PreviewRendererProps<CardData>) {
  /* no chrome, no event handlers */
}

function CardEdit({ item, interactive }: EditRendererProps<CardData>) {
  /* uses `interactive` to stopPropagation on clicks */
}

export const cardKind = defineKind<CardData>({
  component: CardPreview,
  editComponent: CardEdit,
  defaults: { w: 4, h: 7, label: 'Card' },
});
```

Optional light shell until selection (viewport-based mount comes later):

```ts
defineKind({
  component: StagePreview,
  editComponent: StageEdit,
  editPlaceholder: StageShell, // mounted while unselected in the builder
  defaults: { w: 12, h: 8 },
});
```

## 3. Wrap with `defineKind`

```ts
export const heroKind = defineKind<HeroData>({
  component: HeroPreview,
  editComponent: HeroEdit,
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

Pass the **same** registry to both `VantageBuilder` and `VantagePreview`. Missing kinds render a placeholder and log a one-time warning. Every entry must be a `defineKind` descriptor — bare FCs are not accepted.

## Patterns from the demo

The seven kinds in `demo/src/blocks/` cover the common shapes:

- **Static content** — `text`, `image`. Pure data → DOM; `image` reuses one `component` for both surfaces.
- **Variant via data** — `text` flips to a white-on-image `overlay` look when `data.variant === 'overlay'`. Use this instead of forking the kind.
- **Alignment via data** — `button` reads `align` / `vAlign` to position its surface inside the cell. The demo's right-click menu writes those fields per-breakpoint via `updateItemData<ButtonData>(layout, sectionId, itemId, { align: 'left' }, activeBreakpoint)` so mobile alignment doesn't leak into desktop.
- **Composed content** — `card` renders an image, body, and CTA from a single typed object. Wrapper class lifts the cell into a card with a shadow.
- **Form controls** — `input` is a stateless label + input; the host controls the value. The edit renderer calls `stopPropagation` on `onPointerDown` / `onClick` only when `interactive` is true so dnd-kit doesn't capture the gesture.
- **Stateful blocks** — `form` keeps its own `useState` for the email value and a `submitted` flag. `item.data` is read-only from the block's perspective; for persisted state, lift to the host and call `updateItemData`. See `demo/src/blocks/form/StatefulForm.tsx`.
- **Edit-only chrome** — `block` uses `component: () => null` and `editComponent` that shows `{w}×{h} @ (x,y)`, useful as a debugging or spacer block.
- **Inspectors** — `text`, `button`, and `image` register an `inspector` on `defineKind`. The demo's `ItemInspector` resolves the selected item and renders that panel. Image and section backgrounds also ship a focal-point cropper for `cover` images.

## Interactivity inside edit mode

In the builder every cell is a drag target. `interactive` is passed to `editComponent` (currently always `true`). For any interactive child — buttons, links, inputs, contenteditable — stop the gesture so dnd-kit doesn't capture it:

```tsx
<input
  onPointerDown={interactive ? (e) => e.stopPropagation() : undefined}
  onClick={interactive ? (e) => e.stopPropagation() : undefined}
/>
```

Preview has no drag system; mount `component` with normal interactive elements.

## Rules and pitfalls

- **No layout CSS on your root.** Do not set `gridColumn`, `gridRow`, `position: absolute/fixed`, `transform`, or `inset` on your component's root element. Vantage owns cell placement; these styles break drag/resize math.
- **Handle `item.data === undefined`.** After `importLayout` or for kinds without `defaults.data`, `data` may be missing. Always destructure with a fallback: `const data = item.data ?? {}`.
- **Split surfaces on `defineKind`.** Preview and edit are different FCs. Don't branch on a `mode` prop — it does not exist.
- **Library CSS is chrome only.** `vantage/style.css` styles the grid, drag handles, and section controls — not your content. Ship your own styles per block.
- **`kind` is your stable identifier.** Once layouts are persisted, renaming a `kind` orphans existing items. Treat it like a schema migration.
- **Generic types stay sharp.** `defineKind<HeroData>(...)` makes `item.data` typed as `HeroData | undefined` inside the renderer. Don't widen to `unknown` unless you mean it.
