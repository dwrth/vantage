# Building your own panels

`LayersPanel`, `SectionInspector`, `ItemInspector`, `Toolbar`, and `ContextMenu` in `demo/src/` are **host code**, not part of the library — Vantage exposes the mutations and resolution helpers, you build the UI.

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

Related: [Selection](selection.md), [Persistence](persistence.md), [Breakpoints](breakpoints.md).
