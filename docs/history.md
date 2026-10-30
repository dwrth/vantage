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
  });

  return (
    <>
      <button type="button" disabled={!history.canUndo} onClick={history.undo}>
        Undo
      </button>
      <button type="button" disabled={!history.canRedo} onClick={history.redo}>
        Redo
      </button>
      <VantageBuilder
        value={history.layout}
        onChange={history.onChange}
        history={history} // Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Cmd/Ctrl+Y
        components={/* … */}
      />
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

## Gestures (merging)

One gesture is one undo step. Merging is by gesture, not by time:

- **Pointer drag, resize and section resize** emit once at the end, so each is one step.
- **Group move, align and delete** (multi-selection, see [Selection](selection.md)) are one
  layout change each, so one step for the whole group.
- **Keyboard:** the builder tags the changes of one held key (auto-repeat) with the same
  `mergeKey`. Three separate presses are three steps; holding the key is one.
- **Inspector:** `VantageInspector` tags edits with a key per item, breakpoint and patched
  fields, so typing into one field is one step until anything else changes.
- **Host panels:** pass your own key, e.g. `history.onChange(next, changeset, { mergeKey: 'section-label:' + id })`
  or `emitLayoutChange(prev, next, history.onChange, { mergeKey })`.

Consecutive changes with the same `mergeKey` merge into the step the first one opened. A change
with another key or no key, `undo`, `redo` and `reset` end the gesture. Changes without a key are
always separate steps. `coalesceMs` is deprecated and ignored.

If the host wraps the builder's `onChange`, forward the third argument:

```ts
onChange={(next, changeset, options) => history.onChange(next, changeset, options)}
```

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
