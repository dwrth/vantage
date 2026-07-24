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

## Per-breakpoint overrides

When the user drags, resizes, or edits a block's `data` while a non-desktop breakpoint is active, Vantage stores an `ItemOverride` instead of mutating the desktop placement. `ItemOverride` can carry `x` / `y` / `w` / `h`, `hidden`, and a partial `data` patch that is shallow-merged on top of the base item data at render time. You can also write overrides explicitly:

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

## Resolution helpers

```ts
resolveSection(section, 'mobile'); // { columns, colGap, rowGap, paddingTop, paddingBottom }
resolveItem(item, section, 'mobile'); // { x, y, w, h, hidden }
mergeBreakpointItemData<HeroData>(item, section, 'mobile'); // base data ∪ BP override (not entity resolve)
resolveEffectiveItemData(item, section, 'mobile', enabled, entityData); // entity ∪ layout/BP
hasItemOverride(item, section, 'mobile'); // boolean
resolveBreakpointFromWidth(width, layout); // for custom preview surfaces
resolveBreakpointFromLayout(width, layout); // alias used by VantagePreview internally
defaultColumnsForBreakpoint('mobile', baseColumns); // 4 by default for mobile, 2/3 of base for tablet
```

Entity resolve is a separate host function (`ResolveItemData`) passed to `ItemDataProvider` — not `mergeBreakpointItemData`. See [Persistence](persistence.md).

The sample layout (`demo/src/sampleLayout.ts`) shows the data shape: a `Hero` section with `columns: 12` desktop and a mobile `overrides.mobile` block setting `columns: 4` plus a per-item `{ x, y, w, h }` map.
