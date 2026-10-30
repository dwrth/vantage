# Keyboard and accessibility

## Shortcuts

Block keys act on the selected block while focus is inside it (its body or chrome) or nowhere.
Text fields (`input`, `textarea`, `select`, contenteditable) keep every key.

| Keys                                           | Action                                  |
| ---------------------------------------------- | --------------------------------------- |
| Tab / Shift+Tab                                | Next / previous block (reading order)   |
| Arrow keys                                     | Move one grid cell                      |
| Shift+arrow keys                               | Resize by one cell (top-left stays put) |
| Cmd/Ctrl+Shift+↑ / ↓                           | Bring forward / send backward one layer |
| Delete / Backspace                             | Delete; focus moves to the next block   |
| Escape                                         | Deselect                                |
| Enter / Space (on a focused, unselected block) | Select                                  |
| Cmd/Ctrl+Z                                     | Undo (needs the `history` prop)         |
| Shift+Cmd/Ctrl+Z, Cmd/Ctrl+Y                   | Redo (needs the `history` prop)         |

With several blocks selected (see [Selection](selection.md)), the keys act from any selected
block: arrows move the whole group as a unit, Delete / Backspace removes it and Escape clears
it. Shift+arrows and the layer keys do nothing for a group.

Moves and resizes stay inside the section, like pointer drags, and write the active
breakpoint's override off desktop. Resizes stop at the block's content minimum
(`getItemMinSize`, see [Overlap safety](overlap.md)), like pointer resizes. Full-bleed blocks only move and resize vertically.

**Not handled by the library:** Cmd/Ctrl+C, V, D and every other key. Copy, paste and duplicate
need host decisions (entity records, clipboard scope), so the host binds them. Each key has
exactly one owner: the library never reacts to those keys, and the host should not bind the
keys above.

Undo/redo work wherever focus is, except text fields and dialogs outside the builder. When
nothing can be undone, the key falls through to the browser.

## Undo steps

One held key is one undo step: its changes share a `mergeKey` (see [Undo / history](history.md)).

## Focus and reading order

- Blocks are tab stops (`role="group"`, `aria-roledescription="block"`, named by
  `blockLabels.block`, described by `blockLabels.instructions`). Selection follows focus.
- The DOM order of blocks is reading order: by row, then column, per section. Stacking still
  follows `section.items` through `z-index` (`--vantage-z`). `VantagePreview` uses the same
  order (for the breakpoint in use; desktop before measurement) and CSS `order` for stacking.
- Chrome (drag handle, edit and delete buttons) is never `aria-hidden`. Focusing a control in it
  selects its block. The drag handle is not a tab stop; the block itself is the keyboard
  equivalent. The eight resize handles are pointer-only (`aria-hidden`); Shift+arrows replace
  them.
- Focusing a block selects it, so the selection outline is the focus indicator; no separate focus ring is drawn.

## Announcements

Keyboard edits are announced through a polite live region inside the builder. Translate them
with `announcements` and `blockLabels`:

```tsx
<VantageBuilder
  blockLabels={{ block: (item) => item.label ?? t(item.kind), instructions: t('help') }}
  announcements={{ moved: ({ name, column, row }) => t('moved', { name, column, row }) }}
/>
```

Positions and sizes in `BlockAnnouncementContext` are 1-based grid cells. Selection and group
messages (`selectionChanged`, `groupMoved`, `groupAligned`, `groupDeleted`) get a
`GroupAnnouncementContext` (`{ count, items }`).
