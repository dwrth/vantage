# Components

## `VantageBuilder`

| Prop                       | Required | Description                                                                                                                                                                                                                                                               |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                    | yes      | `Layout` to render.                                                                                                                                                                                                                                                       |
| `onChange`                 | yes      | `(next, changeset) => void` after every mutation.                                                                                                                                                                                                                         |
| `components`               | yes      | `ComponentRegistry` mapping `kind` → renderer.                                                                                                                                                                                                                            |
| `selectedItem`             | no       | Controlled selection `{ sectionId, itemId }` or `null`. Omit for uncontrolled.                                                                                                                                                                                            |
| `defaultSelectedItem`      | no       | Initial selection when uncontrolled.                                                                                                                                                                                                                                      |
| `onSelectionChange`        | no       | Fires when the user clicks a block, drags, or right-clicks.                                                                                                                                                                                                               |
| `activeBreakpoint`         | no       | Controlled breakpoint (`'desktop' \| 'tablet' \| 'mobile'`). Omit for uncontrolled.                                                                                                                                                                                       |
| `defaultActiveBreakpoint`  | no       | Initial breakpoint when uncontrolled. Defaults to `'desktop'`.                                                                                                                                                                                                            |
| `onActiveBreakpointChange` | no       | Fires when the active breakpoint changes (selection click on a non-active breakpoint, code, etc).                                                                                                                                                                         |
| `onItemContextMenu`        | no       | `(event, { sectionId, item }) => void` — right-click hook for layer menus, inspectors, deletions.                                                                                                                                                                         |
| `renderSectionHeader`      | no       | `({ section, activeBreakpoint }) => ReactNode` slot for custom per-section header chrome.                                                                                                                                                                                 |
| `renderSectionFooter`      | no       | `({ section, activeBreakpoint }) => ReactNode` slot for custom per-section footer chrome.                                                                                                                                                                                 |
| `renderEditButton`         | no       | `({ sectionId, item, isSelected }) => ReactNode` slot for per-block settings/edit chrome.                                                                                                                                                                                 |
| `renderDragHandle`         | no       | `({ sectionId, item, isSelected, isDragging, listeners, attributes }) => ReactNode` slot for custom drag-handle chrome. Vantage positions the slot and applies grab/grabbing cursor styling; you style the inner control. Falls back to the built-in handle when omitted. |
| `renderDeleteButton`       | no       | `({ sectionId, item, isSelected, onDelete }) => ReactNode` slot for custom delete chrome. Vantage positions the slot; you style the inner control. Falls back to the built-in delete button when omitted.                                                                 |
| `className`                | no       | Extra class on the root.                                                                                                                                                                                                                                                  |
| `children`                 | no       | Rendered above the canvas (use for inline toolbars; the demo uses a separate `Toolbar` instead).                                                                                                                                                                          |

Builder canvas ships without section header/footer chrome by default; the demo wires its own controls with `renderSectionHeader` and `renderSectionFooter`.

## `VantagePreview`

| Prop         | Required | Description                                                                |
| ------------ | -------- | -------------------------------------------------------------------------- |
| `value`      | yes      | Same `Layout` shape as the builder.                                        |
| `components` | yes      | Same registry. Reuse it; do not ship a second one.                         |
| `breakpoint` | no       | Force a specific breakpoint. Omit to auto-detect from the container width. |
| `className`  | no       | Extra class on the root.                                                   |

Preview has no drag system, no chrome, no selection. Safe at any size — iframe, separate route (demo uses `/preview`), or inline next to the builder.

## `VantageInspector`

Mounts the selected item's kind `inspector` and writes via `updateItemData`. Place it beside `VantageBuilder` (same controlled `layout` / `selection` / `activeBreakpoint`).

| Prop               | Required | Description                                                                                                 |
| ------------------ | -------- | ----------------------------------------------------------------------------------------------------------- |
| `layout`           | yes      | Current `Layout`.                                                                                           |
| `onChange`         | yes      | `(next, changeset) => void` after each inspector patch.                                                     |
| `components`       | yes      | Same `ComponentRegistry` as the builder.                                                                    |
| `selection`        | yes      | `{ sectionId, itemId }` or `null`.                                                                          |
| `activeBreakpoint` | yes      | Breakpoint used for resolve + `scope: 'active'` writes.                                                     |
| `onItemDataChange` | no       | `(event) => void` — granular patch signal (`sectionId`, `itemId`, `patch`, `breakpoint`, `scope`, `dirty`). |
| `className`        | no       | Root class.                                                                                                 |
| `emptyState`       | no       | Shown when nothing is selected.                                                                             |
| `renderHeader`     | no       | `({ section, item, … }) => ReactNode` chrome above the kind panel.                                          |

Kind panels receive `InspectorProps` and call `onChange(patch, { scope?, dirty? })`. Library maps scope → breakpoint, applies `updateItemData`, then fires layout `onChange(next, changeset)` + optional `onItemDataChange`.

Chrome is unstyled — skin with `className` / `renderHeader`. Kind field UIs stay host-authored on `defineKind`.

See [Host panels](panels.md).

## `defineKind`

Bundles preview/edit renderers with the defaults used when the user clicks **+ Add** for that kind.

```ts
defineKind<TData>({
  component,             // FC<PreviewRendererProps<TData>> — always mounted in preview
  editComponent?,        // FC<EditRendererProps<TData>> — builder; omit → reuse component with { item }
  editPlaceholder?,      // FC<PreviewRendererProps<TData>> — builder shell until selected
  inspector?,            // FC<InspectorProps<TData>> — mounted by VantageInspector
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

Wrappers are useful for transparent text cells, drop shadows, or overlay variants. The demo passes Tailwind / daisyUI classes via `editWrapperClass` / `previewWrapperClass` so kinds can opt into different cell-level styling per surface.

Every registry entry must be a `KindDescriptor` from `defineKind`. Bare function entries are not supported.

See [Custom blocks](blocks.md) for full patterns.
