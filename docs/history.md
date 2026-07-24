# Undo / history

Layout mutations are pure and already emit `(next, changeset)`. `useVantageHistory` wraps that callback so hosts get undo/redo without inventing a stack.

## API

```tsx
import { useState } from 'react';
import { useVantageHistory, VantageBuilder, type Layout } from 'vantage';

function Editor() {
  const [layout, setLayout] = useState<Layout>(/* … */);
  const history = useVantageHistory(layout, (next) => setLayout(next), {
    capacity: 50, // max past entries (default 50)
    coalesceMs: 400, // merge rapid edits (default 400; 0 disables)
  });

  return (
    <>
      <button type="button" disabled={!history.canUndo} onClick={history.undo}>
        Undo
      </button>
      <button type="button" disabled={!history.canRedo} onClick={history.redo}>
        Redo
      </button>
      <VantageBuilder value={history.layout} onChange={history.onChange} components={/* … */} />
    </>
  );
}
```

**One public primitive.** No parallel history middleware or provider.

Host owns `useState`. Hook returns the same `layout` plus a wrapped `onChange` that records history, then forwards to your setter. Undo/redo call your `onChange` with `diffLayouts(current, restored)` so side-effects stay on the PR3 contract.

## What is undoable

Anything that flows through the **wrapped** `onChange`:

- Canvas move / resize / add / delete
- `VantageInspector` data edits
- Host panels that call `emitLayoutChange(…, history.onChange)`

## What is not

- Selection
- Active breakpoint (UI chrome)
- Panel tabs / drawers
- Theme tokens

Keep those in separate state. They never touch the history stack.

## Coalesce

Rapid edits within `coalesceMs` collapse into **one** undo step (inspector typing, width number spinners). Canvas drag/resize already emit once at gesture end, so each gesture is one entry without special casing.

## `reset` — import / sample / clear

External baselines must not leave junk on the stack:

```ts
function applyBaseline(next: Layout) {
  history.reset(next); // clears past/future; does not call onChange
  setLayout(next);
}
```

Use `applyBaseline` for Clear, Sample, Import, and any hydrate from disk/network.

**Bypass rule:** `setLayout` that skips wrapped `onChange` without `reset` desyncs the stacks. Route all layout writes through `history.onChange` or `reset` + `setLayout`.

History holds **working** layouts (payloads included). Call `stripData` only when writing to disk/CMS — not when pushing undo entries.

## `onItemDataChange`

Parallel signal on `VantageInspector` for dirty flags / entity sync — **not** a history input. Undo restores a full layout via `onChange`. Hosts that mirror entity state from `onItemDataChange` must also react to layout `onChange` from undo/redo (or re-derive from layout).

Related: [Layout](layout.md), [Host panels](panels.md), [Persistence](persistence.md).
