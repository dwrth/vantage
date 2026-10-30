# Components

## `VantageBuilder`

| Prop                       | Required | Description                                                                                                                                                                                                                                                               |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                    | yes      | `Layout` to render.                                                                                                                                                                                                                                                       |
| `onChange`                 | yes      | `(next, changeset, options?) => void` after every mutation. `options.mergeKey` marks one gesture (see [Keyboard](keyboard.md)); forward it to `useVantageHistory`.                                                                                                        |
| `components`               | yes      | `ComponentRegistry` mapping `kind` → renderer.                                                                                                                                                                                                                            |
| `selectedItem`             | no       | Controlled selection `{ sectionId, itemId }` or `null`. Omit for uncontrolled.                                                                                                                                                                                            |
| `defaultSelectedItem`      | no       | Initial selection when uncontrolled.                                                                                                                                                                                                                                      |
| `onSelectionChange`        | no       | Fires when the user clicks a block, drags, or right-clicks.                                                                                                                                                                                                               |
| `activeBreakpoint`         | no       | Controlled breakpoint (`'desktop' \| 'tablet' \| 'mobile'`). Omit for uncontrolled.                                                                                                                                                                                       |
| `defaultActiveBreakpoint`  | no       | Initial breakpoint when uncontrolled. Defaults to `'desktop'`.                                                                                                                                                                                                            |
| `onActiveBreakpointChange` | no       | Fires when the active breakpoint changes (selection click on a non-active breakpoint, code, etc).                                                                                                                                                                         |
| `onItemContextMenu`        | no       | `(event, { sectionId, item }) => void` — right-click hook for layer menus, inspectors, deletions.                                                                                                                                                                         |
| `renderSectionHeader`      | no       | `({ section, activeBreakpoint, hasSelection, isDropTarget }) => ReactNode` slot for custom per-section header chrome.                                                                                                                                                     |
| `renderSectionFooter`      | no       | `({ section, activeBreakpoint, hasSelection, isDropTarget }) => ReactNode` slot for custom per-section footer chrome.                                                                                                                                                     |
| `sectionResizeLabel`       | no       | `(section) => string` accessible name (`aria-label`) of each section's bottom resize edge, e.g. to translate it. Defaults to `Resize ${section.label ?? 'section'} height`.                                                                                               |
| `showSectionActions`       | no       | Section toolbar (move up / down, duplicate) at each section's top right and an "add section above" button on its top edge. Shown on hover or focus. Defaults to `true`.                                                                                                   |
| `sectionActionLabels`      | no       | `Partial<SectionActionLabels>`: `(section) => string` per button (`toolbar`, `moveUp`, `moveDown`, `duplicate`, `insertBefore`), e.g. to translate them. Defaults: `DEFAULT_SECTION_ACTION_LABELS`.                                                                       |
| `history`                  | no       | `{ undo, redo, canUndo, canRedo }`, e.g. `useVantageHistory`'s result. Enables Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z and Cmd/Ctrl+Y. See [Keyboard](keyboard.md).                                                                                                                  |
| `blockLabels`              | no       | `Partial<BlockLabels>`: block name, role description, keyboard help, default drag/delete button names, e.g. to translate them. Defaults: `DEFAULT_BLOCK_LABELS`.                                                                                                          |
| `announcements`            | no       | `Partial<BlockAnnouncements>`: live-region messages for keyboard edits (moved, resized, deleted, layer, deselected, undone, redone). Defaults: `DEFAULT_BLOCK_ANNOUNCEMENTS`.                                                                                             |
| `onDuplicateSection`       | no       | `(sectionId) => void`. Replaces the built-in duplicate, e.g. when the host must clone the entities behind the items (`duplicateSection` with `cloneItem`).                                                                                                                |
| `renderEditButton`         | no       | `({ sectionId, item, isSelected }) => ReactNode` slot for per-block settings/edit chrome.                                                                                                                                                                                 |
| `isItemRestricted`         | no       | `(item: GridItem) => boolean`. Blocks for which it returns true get a dashed instead of solid hover/selection outline (e.g. blocks with an access rule).                                                                                                                  |
| `renderDragHandle`         | no       | `({ sectionId, item, isSelected, isDragging, listeners, attributes }) => ReactNode` slot for custom drag-handle chrome. Vantage positions the slot and applies grab/grabbing cursor styling; you style the inner control. Falls back to the built-in handle when omitted. |
| `renderDeleteButton`       | no       | `({ sectionId, item, isSelected, onDelete }) => ReactNode` slot for custom delete chrome. Vantage positions the slot; you style the inner control. Falls back to the built-in delete button when omitted.                                                                 |
| `externalDrag`             | no       | `{ w, h }` while the host drags a new block over the canvas with native HTML5 drag-and-drop (e.g. a component palette). Sections then accept the drop and show a ghost of that size.                                                                                      |
| `onExternalDrop`           | no       | `({ sectionId, x, y, breakpoint, dataTransfer }) => void` when an `externalDrag` lands. `x` / `y` are on `breakpoint`'s grid; insert the block there (`addItem` takes desktop `x` / `y`).                                                                                 |
| `className`                | no       | Extra class on the root.                                                                                                                                                                                                                                                  |
| `children`                 | no       | Rendered above the canvas (use for inline toolbars; the demo uses a separate `Toolbar` instead).                                                                                                                                                                          |

Builder canvas ships without section header/footer chrome by default (only the section actions above); the demo wires its own controls with `renderSectionHeader` and `renderSectionFooter`.

### Drag and drop

All sections share one drag context. Dragging a block within its section snaps it on that grid (`moveItem`). Dragging it over another section shows a dashed ghost there and drops it with `moveItemToSection`; selection follows the block. Each `<section>` carries `data-vantage-section`, plus `data-vantage-section-selected` when it holds the selection and `data-vantage-drop-target` while something would land in it, so host chrome can show/hide itself with CSS. Sections are `position: relative`, so header chrome can float over the grid instead of pushing it down. The drop accent colour is `--vantage-drop-color`. Blocks stay inside their section's height; drags and drops never resize it. Each section's bottom edge (`data-vantage-section-resize`, editor only) changes its height in rows by drag, touch or arrow keys.

## `VantagePreview`

| Prop            | Required | Description                                                                |
| --------------- | -------- | -------------------------------------------------------------------------- |
| `value`         | yes      | Same `Layout` shape as the builder.                                        |
| `components`    | yes      | Same registry. Reuse it; do not ship a second one.                         |
| `breakpoint`    | no       | Force a specific breakpoint. Omit to auto-detect from the container width. |
| `className`     | no       | Extra class on the root.                                                   |
| `isItemVisible` | no       | `(item) => boolean` render-time filter, e.g. per-viewer access rules.      |

Items filtered out by `isItemVisible` render on no breakpoint, and grid rows that only they occupied collapse so content below moves up. Rows still holding a visible item (or left empty on purpose) keep their height. Per-breakpoint `hidden` overrides keep their slot as before.

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
