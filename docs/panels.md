# Building your own panels

`LayersPanel`, `SectionInspector`, `Toolbar`, and `ContextMenu` in `demo/src/` are **host code**. Item settings use the library `<VantageInspector>` — register kind panels on `defineKind({ inspector })` and mount the shell next to your builder.

| Need                                         | Helpers / component                                                    |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| Edit selected item `data`                    | `<VantageInspector>` (+ kind `inspector` on `defineKind`)              |
| Granular data-edit signal (dirty / sync)     | `onItemDataChange` on `<VantageInspector>`                             |
| Custom item settings shell                   | `resolveSelectedItem`, `updateItemData`, `descriptor.inspector`        |
| Render a sortable list of items in a section | `section.items`, `reorderItemAtIndex`, `setSelection`                  |
| Hide / show an item per breakpoint           | `setItemHidden`, `resolveItem`, `hasItemOverride`                      |
| Reset a per-breakpoint tweak                 | `clearItemOverride`, `clearSectionOverride`                            |
| Inspect a section's effective layout         | `resolveSection(section, activeBreakpoint)`                            |
| Edit section gaps / padding / columns        | `updateSection`, `setSectionOverride`                                  |
| Patch a single field of `item.data`          | `updateItemData<TData>(layout, sectionId, itemId, patch, breakpoint?)` |
| Read effective `item.data` at a breakpoint   | `resolveItemData<TData>(item, section, breakpoint)`                    |
| Import / export                              | `exportLayout`, `importLayout`, `isValidLayout`                        |

## `VantageInspector`

Standalone (out-of-tree) shell: resolves the selection, mounts the kind's `inspector`, applies scoped `updateItemData`, and notifies via `onItemDataChange`.

```tsx
<VantageInspector
  layout={layout}
  onChange={(next) => setLayout(next)}
  components={components}
  selection={selection}
  activeBreakpoint={activeBreakpoint}
  onItemDataChange={(event) => {
    // event: { sectionId, itemId, patch, breakpoint, scope, dirty }
  }}
  className="…"
  renderHeader={({ item }) => <header>{item.kind}</header>}
/>
```

Scope contract for kind panels: `{ scope: 'base' }` writes desktop base data; omit / `'active'` writes at `activeBreakpoint`. `dirty` defaults to `true`.

Related: [Components](components.md), [Selection](selection.md), [Persistence](persistence.md), [Breakpoints](breakpoints.md), [Undo / history](history.md).
