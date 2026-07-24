# Persistence

Vantage stores nothing. Host owns layout JSON **and** entity payloads. Layout may hold inline `data`, or only `ref` with payloads in a separate store.

## Layout vs entities

| Concern                       | Where                                                          |
| ----------------------------- | -------------------------------------------------------------- |
| Placement, kinds, breakpoints | `Layout`                                                       |
| CMS / DB row payload          | Host map keyed by `GridItem.ref`                               |
| Working editor state          | Hydrated layout (`data` filled) **or** live `ItemDataProvider` |

**Precedence at render:** entity (via `ref`) as base; layout `data` + breakpoint override wins on shallow merge (`resolveEffectiveItemData`).

```ts
import {
  exportLayout,
  hydrate,
  importLayout,
  isValidLayout,
  stripData,
  ItemDataProvider,
} from 'vantage';

// Persist layout without payloads
localStorage.setItem(KEY, JSON.stringify(exportLayout(stripData(layout), registry)));

// Load
const parsed = JSON.parse(raw);
if (!isValidLayout(parsed)) return createEmptyLayout();
const next = hydrate(importLayout(parsed, registry), entities);

// Live resolve without writing entity into layout
<ItemDataProvider resolveItemData={(item) => (item.ref ? entities[item.ref] : undefined)}>
  <VantageBuilder … />
</ItemDataProvider>
```

- `stripData(layout)` — drops `data` only on items (and their overrides) that have a `ref`; inline-only items keep payloads
- `hydrate(layout, entities)` — for each `ref` hit in the map, sets `data` (overwrite). Miss leaves `data` as-is
- `exportLayout(layout, registry)` / `importLayout(data, registry)` — run kind `toPersistedData` / `fromPersistedData` / `validate` when present

## Kind persist hooks

```ts
defineKind<ImageData>({
  component,
  defaults,
  toPersistedData: (data) => ({ url: data.content, … }),
  fromPersistedData: (raw) => ({ content: raw.url, … }),
  validate: (data) => (/* string[] errors or void */),
});
```

Kinds without hooks pass `data` through unchanged.

## History boundary

`useVantageHistory` stacks **working** layouts (with `data`). Strip only at the persist boundary (disk / CMS). After undo/redo, re-sync entity maps from layout or from `onItemDataChange` (see [Undo / history](history.md)).

## Demo

`demo/src/App.tsx` saves `stripData` + `exportLayout` to `localStorage`, keeps entities in a second key, wraps the tree in `ItemDataProvider`, and hydrates on load. Hero visual uses `ref: 'entity-hero-visual'`. File export/import in `Toolbar.tsx` follows the same path.

## Preview as a separate route

`VantagePreview` has no chrome. Demo branches on `/preview`:

```tsx
if (window.location.pathname.startsWith('/preview')) {
  return (
    <ItemDataProvider resolveItemData={resolveItemData}>
      <VantagePreview value={layout} components={demoComponents} />
    </ItemDataProvider>
  );
}
```
