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
import { useSelection } from 'vantage';
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
  has focus. The group moves as a unit and stops when its first block reaches a section edge;
  the section never grows. A group drag stays in its section (moving to another section is a
  single-block action). Full-bleed blocks move only vertically. One held arrow key is one step.
- **Align:** left / centre / right or top / middle / bottom over the group's bounding box (on the
  active breakpoint; centre and middle round down to whole cells). Full-bleed blocks ignore
  horizontal alignment.
- **Delete:** Delete / Backspace, or the toolbar's delete button. Focus moves to the next block
  that was not deleted.

Group resize is out of scope: Shift+arrows and the layer keys do nothing while several blocks are
selected, and grouped blocks hide their resize handles. The edit renderer
(`editPlaceholder` swap) and the overlap fix buttons need a single selection.

The built-in toolbar sits above the group's bounding box (`showGroupToolbar={false}` hides it).
Its labels come from `blockLabels.groupToolbar(count)`, `blockLabels.align(alignment)` and
`blockLabels.deleteSelection(count)`. Hosts with their own UI call the pure mutations, or the
`useBuilderActions()` methods of the same name from inside the builder:

```ts
moveItems(layout, sectionId, itemIds, dx, dy, breakpoint?); // clamped as a unit
alignItems(layout, sectionId, itemIds, 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom', breakpoint?);
removeItems(layout, sectionId, itemIds);
groupBounds(section, itemIds, breakpoint); // bounding box in cells, or null
groupMoveRange(section, itemIds, breakpoint); // { minDx, maxDx, minDy, maxDy } or null
```

All three mutations return the same layout object when nothing changes.

### Announcements

The live region reads `announcements.selectionChanged({ count, items })` after Shift-click,
marquee and Escape on a group, and `groupMoved`, `groupAligned` (with `alignment`) and
`groupDeleted` after group actions. See [Keyboard](keyboard.md).

Pure helpers for custom selection UIs: `toggleSelection`, `marqueeHits`, `rectFromPoints`,
`mergeSelection`, `sameSelection`.
