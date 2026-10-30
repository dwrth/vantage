# Breakpoints and responsive overrides

A layout always has `'desktop'` enabled and can opt into `'tablet'` and `'mobile'`. Each non-desktop breakpoint has:

- An **activation width** (`breakpointWidths.mobile = 640` → mobile applies when the viewport ≤ 640 px).
- A **preview width** (`breakpointPreviewWidths.mobile = 390` → the builder simulates the breakpoint at that frame width).

```ts
setLayoutBreakpoints(layout, ['desktop', 'mobile']);
setBreakpointWidth(layout, 'mobile', 720);
setBreakpointPreviewWidth(layout, 'mobile', 390);

getEnabledBreakpoints(layout); // ['desktop', 'mobile']
getBreakpointWidths(layout); // { mobile: 720 }
getBreakpointPreviewWidths(layout); // { mobile: 390 }
isBreakpointEnabled(layout, 'tablet'); // false
```

## Active breakpoint in the builder

`VantageBuilder` accepts a controlled `activeBreakpoint` so your toolbar can drive the simulated viewport:

```tsx
const [active, setActive] = useState<Breakpoint>('desktop');

<VantageBuilder
  value={layout}
  onChange={(next) => setLayout(next)}
  components={components}
  activeBreakpoint={active}
  onActiveBreakpointChange={setActive}
/>;
```

The demo persists this to `localStorage` and re-clamps on load with `getEnabledBreakpoints` so a previously-saved `tablet` selection doesn't strand the user when tablet is later disabled.

## Auto-arrange

A freshly enabled breakpoint inherits the desktop grid, which rarely fits a phone. `autoArrangeBreakpoint` generates a starting layout from the desktop placement:

```ts
let next = setLayoutBreakpoints(layout, ['desktop', 'mobile']);
next = autoArrangeBreakpoint(next, 'mobile'); // all sections
next = autoArrangeBreakpoint(next, 'mobile', sectionId); // one section
```

- **Mobile** — `columns` becomes `DEFAULT_MOBILE_COLUMNS`; items are stacked top-to-bottom at full width. Items that overlap (e.g. text layered on an image) form a group that is scaled as a unit, so layering survives.
- **Tablet** — `columns` becomes 2/3 of desktop; every item is scaled proportionally, arrangement unchanged.

It overwrites `columns` and item `x` / `y` / `w` / `h` for that breakpoint and keeps gaps, paddings, `hidden` flags and `data` patches. Items hidden on the breakpoint are skipped when stacking (see [Hiding items](#hiding-items)).

## Per-breakpoint overrides

When the user drags, resizes, or edits a block's `data` while a non-desktop breakpoint is active, Vantage stores an `ItemOverride` instead of mutating the desktop placement. `ItemOverride` can carry `x` / `y` / `w` / `h`, `hidden`, `verticalAlign` (see [Alignment](alignment.md)), and a partial `data` patch that is shallow-merged on top of the base item data at render time. You can also write overrides explicitly:

```ts
setSectionOverride(layout, sectionId, 'mobile', {
  columns: 4,
  colGap: 8,
  paddingTop: 24,
});
clearSectionOverride(layout, sectionId, 'mobile');
setItemHidden(layout, sectionId, itemId, 'mobile', true);
clearItemOverride(layout, sectionId, 'mobile', itemId);
```

Section `rows` follow the same rule: resizing a section on tablet or mobile writes `overrides[bp].rows`; without it the breakpoint inherits the desktop `rows` (grown to fit that breakpoint's content).

## Hiding items

`setItemHidden(layout, sectionId, itemId, breakpoint, hidden)` works on every breakpoint, desktop included:

- **Desktop** stores the flag on the item itself (`item.hidden`), next to its desktop `x` / `y` / `w` / `h`. `hidden: false` removes the key.
- **Tablet / mobile** store it in `overrides[bp].items[id].hidden`.

Each breakpoint reads only its own flag: a desktop-hidden item still shows on tablet and mobile unless they hide it too, and the other way round. A breakpoint that is not enabled falls back to desktop, flag included.

A hidden item behaves the same on every breakpoint:

- The builder canvas does not render it; the host's layers panel still lists it (`resolveItem(...).hidden`).
- It takes no space in the section height (`sectionContentRows` / `sectionRows`), so a section can shrink once its bottom item is hidden, and moving or resizing another item does not pin the height to it.
- New, pasted and duplicated items go below the visible content (desktop placement skips desktop-hidden items).
- `VantagePreview` does not render it, or hides it with `data-vp-hidden` inside that breakpoint's `@container` range. The desktop range is everything above the widest enabled non-desktop breakpoint.
- Rows inside the section that only it occupied keep their height (unlike `isItemVisible`, which collapses them).
- `autoArrangeBreakpoint` skips items hidden on the target breakpoint. Desktop-hidden items are shown on tablet and mobile, so they are arranged from their desktop placement.

## Resolution helpers

```ts
resolveSection(section, 'mobile'); // { columns, colGap, rowGap, paddingTop, paddingBottom, rows? }
resolveItem(item, section, 'mobile'); // { x, y, w, h, hidden }
resolveItemVerticalAlign(item, section, 'mobile'); // 'start' | 'center' | 'end' | undefined
mergeBreakpointItemData<HeroData>(item, section, 'mobile'); // base data ∪ BP override (not entity resolve)
resolveEffectiveItemData(item, section, 'mobile', enabled, entityData); // entity ∪ layout/BP
hasItemOverride(item, section, 'mobile'); // boolean
resolveBreakpointFromWidth(width, layout); // for custom preview surfaces
resolveBreakpointFromLayout(width, layout); // container width → breakpoint
defaultColumnsForBreakpoint('mobile', baseColumns); // 4 by default for mobile, 2/3 of base for tablet
```

Entity resolve is a separate host function (`ResolveItemData`) passed to `ItemDataProvider` — not `mergeBreakpointItemData`. See [Persistence](persistence.md).

The sample layout (`demo/src/sampleLayout.ts`) shows the data shape: a `Hero` section with `columns: 12` desktop and a mobile `overrides.mobile` block setting `columns: 4` plus a per-item `{ x, y, w, h }` map.

## Published preview

`VantagePreview` without a `breakpoint` prop renders every enabled breakpoint at once: placements and section settings become CSS variables, and a scoped `<style>` with `@container` width ranges (matching `breakpointWidths`) picks the active one. Markup is therefore correct on the server and before hydration — no desktop/mobile flash. The measured container width is only used to merge per-breakpoint `data` patches (desktop data until measured). Passing `breakpoint` renders that breakpoint only, with inline styles.
