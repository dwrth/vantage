# Selection

`SelectionRef = { sectionId, itemId }`. Treat it as opaque.

## Single selection

Controlled (recommended once you need cross-component selection — layers panel, inspector, etc.):

```tsx
const [selection, setSelection] = useState<SelectionRef | null>(null);

<VantageBuilder
  value={layout}
  onChange={(next) => setLayout(next)}
  components={components}
  selectedItem={selection}
  onSelectionChange={setSelection}
/>;
```

Or use the hook from inside any descendant of the builder:

```ts
import { useSelection } from '@dwrth/vantage';
const { selection, setSelection } = useSelection();
```

The demo's `LayersPanel` reads `selection` to highlight a row and writes back when the user clicks one.

## Multi-selection

Several blocks of **one section** can be selected at once. The multi-selection API is additive:
`selectedItem` / `onSelectionChange` keep working unchanged, and hosts that pass only those get
multi-select for free (the builder keeps the group itself).

| Gesture                                         | Result                                                     |
| ----------------------------------------------- | ---------------------------------------------------------- |
| Click a block                                   | Selects only that block (also inside a group)              |
| Shift-, Cmd- or Ctrl-click a block              | Adds it to the selection, or removes it                    |
| Shift/Cmd/Ctrl-click a block of another section | Starts a new selection there                               |
| Drag on empty grid space                        | Marquee: selects every block it touches, in that section   |
| Shift/Cmd/Ctrl + marquee                        | Adds the touched blocks to the selection                   |
| Click on empty grid space, Escape               | Clears the selection (Escape during a marquee restores it) |

The **primary block** is the one added last. It is what `selectedItem` / `onSelectionChange` /
`useSelection().selection` report. When the controlled `selectedItem` is not part of the group
(e.g. the host selects another block from a layers panel), the selection becomes that block alone.

```tsx
const [selectedItems, setSelectedItems] = useState<SelectionRef[]>([]);

<VantageBuilder
  selectedItems={selectedItems} // optional; omit to let the builder keep it
  onSelectedItemsChange={setSelectedItems}
  // selectedItem / onSelectionChange work alongside, for the primary block
/>;
```

Inside the builder, `useSelection()` also returns `selectedItems`, `setSelectedItems`,
`toggleSelected(ref)` and `isInSelection(sectionId, itemId)`.

Selection works per breakpoint like everything else: the marquee hits blocks as they are placed
on the active breakpoint, and blocks hidden there (desktop `hidden`, or a tablet/mobile
override) are skipped by every group action.

### Group actions

Each group action is one layout change, so one undo step.

- **Move:** drag the handle of any selected block, or press the arrow keys while a selected block
  has focus. Inside its section the group moves as a unit and stops when its first block reaches
  a section edge; the section never grows. Full-bleed blocks move only vertically. One held
  arrow key is one step.
- **Move to another section (pointer only):** drag the handle of any selected block over another
  section. The target shows a ghost of the group's bounding box; on drop every shown block of
  the group moves there (`moveItemsToSection`), keeping its offsets to the others and its
  stacking order. The box is anchored so that the dragged block lands on the cell under it, also
  below the target's last row, shifted left to fit the target's columns; it starts at most
  directly below the target's last row. If the box reaches below the target, the target grows to
  exactly the rows needed (on the active breakpoint); it never shrinks, and the source keeps its
  height. The moved blocks stay selected in the target. Arrow keys never leave the
  section. Into an arrangement section the blocks are inserted at the drop slot, in stacking
  order. A single block dragged into another section grows the target the same way (see
  [Layout](layout.md)).
- **Align:** left / centre / right or top / middle / bottom over the group's bounding box (on the
  active breakpoint; centre and middle round down to whole cells). Full-bleed blocks ignore
  horizontal alignment.
- **Delete:** Delete / Backspace, or the toolbar's delete button. Focus moves to the next block
  that was not deleted.

Group resize is out of scope: Shift+arrows and the layer keys do nothing while several blocks are
selected, and grouped blocks hide their resize handles. The edit renderer
(`editPlaceholder` swap) needs a single selection.

The built-in toolbar sits above the group's bounding box (`showGroupToolbar={false}` hides it).
Its labels come from `blockLabels.groupToolbar(count)`, `blockLabels.align(alignment)` and
`blockLabels.deleteSelection(count)`. Hosts with their own UI call the pure mutations, or the
`useBuilderActions()` methods of the same name from inside the builder:

```ts
moveItems(layout, sectionId, itemIds, dx, dy, breakpoint?); // clamped as a unit
moveItemsToSection(layout, fromSectionId, itemIds, toSectionId, { x?, y?, breakpoint?, index? }); // x / y: top-left of the group's box
alignItems(layout, sectionId, itemIds, 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom', breakpoint?);
removeItems(layout, sectionId, itemIds);
groupBounds(section, itemIds, breakpoint); // bounding box in cells, or null
groupMoveRange(section, itemIds, breakpoint); // { minDx, maxDx, minDy, maxDy } or null
```

All four mutations return the same layout object when nothing changes.

`moveItemsToSection` moves each block like `moveItemToSection` (see [Layout](layout.md)): ids are
kept (a new one on collision), per-breakpoint `hidden` / `verticalAlign` / `data` overrides
travel along and are removed from the source, positions from the old grid do not. Off desktop
the blocks keep the size they are shown at and get free desktop slots below the target's
content. Blocks hidden at the breakpoint stay in the source. `onChange` fires once; its
changeset lists every moved block in `itemsMoved` and the grown target in `sectionsUpdated`.

### Announcements

The live region reads `announcements.selectionChanged({ count, items })` after Shift-click,
marquee and Escape on a group, and `groupMoved`, `groupAligned` (with `alignment`) and
`groupDeleted` after group actions. A group dropped into another section reads
`groupMovedToSection({ count, items, section })` (default: "2 blocks moved to Hero", or "to
another section" without a section label). See [Keyboard](keyboard.md).

Pure helpers for custom selection UIs: `toggleSelection`, `marqueeHits`, `rectFromPoints`,
`mergeSelection`, `sameSelection`.
