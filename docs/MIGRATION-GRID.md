# Migration Guide: Percentage Layout to Grid Layout

This guide describes how to migrate from the old percentage-based layout
(`LayoutRect`) to the new grid layout (`GridPlacement`).

## Summary

- **Old:** Each element’s layout per breakpoint was `LayoutRect`: `x`, `y`, `w`,
  `h` (0–100% of the section).
- **New:** Each element’s layout per breakpoint is `GridPlacement`:
  `columnStart`, `columnEnd`, `rowStart`, `rowEnd` (0-based grid line indices;
  end values are exclusive).
- **Config:** `gridSize` has been removed. Use `gridColumns` (e.g. 24) and
  `gridRowHeight` (e.g. 8) instead.
- **Rendering:** The editor and LiveView now use CSS Grid. Elements are
  positioned with `grid-column` and `grid-row` (1-based in CSS; the library
  converts from 0-based storage).

## Data mapping (percent to grid)

Conversion from old `LayoutRect` to `GridPlacement` is lossy: you are quantizing
percent space into a discrete grid.

Use the same `gridColumns` and `gridRowHeight` as your new config (e.g. 24 and
8). For a section of width `sectionWidth` and height `sectionHeight`:

```ts
function layoutRectToGridPlacement(
  rect: { x: number; y: number; w: number; h: number },
  gridColumns: number,
  gridRowHeight: number,
  sectionWidth: number,
  sectionHeight: number
): GridPlacement {
  const colWidth = sectionWidth / gridColumns;
  const columnStart = Math.max(
    0,
    Math.min(
      gridColumns - 1,
      Math.floor(((rect.x / 100) * sectionWidth) / colWidth)
    )
  );
  const columnSpan = Math.max(
    1,
    Math.min(
      gridColumns - columnStart,
      Math.round(((rect.w / 100) * sectionWidth) / colWidth)
    )
  );
  const columnEnd = columnStart + columnSpan;

  const rowStart = Math.max(
    0,
    Math.min(
      Math.ceil(sectionHeight / gridRowHeight) - 1,
      Math.floor(((rect.y / 100) * sectionHeight) / gridRowHeight)
    )
  );
  const rowSpan = Math.max(
    1,
    Math.min(
      Math.ceil(sectionHeight / gridRowHeight) - rowStart,
      Math.round(((rect.h / 100) * sectionHeight) / gridRowHeight)
    )
  );
  const rowEnd = rowStart + rowSpan;

  return { columnStart, columnEnd, rowStart, rowEnd };
}
```

Apply this for each breakpoint (desktop, tablet, mobile) using the section
dimensions appropriate for that breakpoint (e.g. `breakpoints.desktop` width for
desktop).

## Migration steps

1. **Back up existing page JSON**  
   Save a copy of any `PageData` (or equivalent) you have stored (localStorage,
   API, etc.).

2. **Convert element layouts**  
   For each element and each breakpoint (`desktop`, `tablet`, `mobile`):
   - Replace `layout.desktop` (and `.tablet`, `.mobile`) with a `GridPlacement`:
     `{ columnStart, columnEnd, rowStart, rowEnd }` (0-based, end exclusive).
   - Remove `layout.responsive` if present (it no longer exists).

3. **Update config**  
   In your editor/config, set:
   - `gridColumns` (e.g. 24)
   - `gridRowHeight` (e.g. 8)  
     Remove `gridSize` if you were using it.

4. **Update custom code**
   - Any code that read or wrote `LayoutRect` (e.g. `x`, `y`, `w`, `h`) must use
     `GridPlacement` and the new grid-based APIs.
   - `updateLayout(id, newPlacement: GridPlacement)` (and similarly
     `updateLayoutBulk` with `placement` instead of `rect`).
   - `ensureBreakpointLayout(element, breakpoint)` now returns `GridPlacement`.
   - The editor instance exposes `gridColumns` and `gridRowHeight` instead of
     `gridSize`.

5. **Dependency**  
   Ensure `react-rnd` is at least **v10.5.3** (or the version that includes the
   grid system: `positionUnit="grid"`, `sizeUnit="grid"`, `layoutMode="grid"`,
   `gridConfig`).

## Optional: one-time conversion script

You can run a one-time script (Node or browser) to convert existing page JSON to
the new shape:

- Load the old JSON.
- For each element, for each of `desktop`, `tablet`, `mobile`, compute
  `GridPlacement` from the old `LayoutRect` using the mapping above (and the
  section width/height for that breakpoint).
- Delete `layout.responsive`.
- Write the result (e.g. back to localStorage or via your API).

Example (Node; adjust paths and section dimensions as needed):

```js
const defaultConfig = { gridColumns: 24, gridRowHeight: 8 };
const breakpoints = { desktop: 1200, tablet: 768, mobile: 375 };

function layoutRectToGridPlacement(
  rect,
  gridColumns,
  gridRowHeight,
  sectionWidth,
  sectionHeight
) {
  const colWidth = sectionWidth / gridColumns;
  const columnStart = Math.max(
    0,
    Math.min(
      gridColumns - 1,
      Math.floor(((rect.x / 100) * sectionWidth) / colWidth)
    )
  );
  const columnSpan = Math.max(
    1,
    Math.min(
      gridColumns - columnStart,
      Math.round(((rect.w / 100) * sectionWidth) / colWidth)
    )
  );
  const rowStart = Math.max(
    0,
    Math.min(
      Math.ceil(sectionHeight / gridRowHeight) - 1,
      Math.floor(((rect.y / 100) * sectionHeight) / gridRowHeight)
    )
  );
  const rowSpan = Math.max(
    1,
    Math.min(
      Math.ceil(sectionHeight / gridRowHeight) - rowStart,
      Math.round(((rect.h / 100) * sectionHeight) / gridRowHeight)
    )
  );
  return {
    columnStart,
    columnEnd: columnStart + columnSpan,
    rowStart,
    rowEnd: rowStart + rowSpan,
  };
}

function migratePageData(pageData, sections) {
  const sectionMap = new Map((sections || []).map(s => [s.id, s]));
  return {
    ...pageData,
    elements: (pageData.elements || []).map(el => {
      const section = el.sectionId ? sectionMap.get(el.sectionId) : null;
      const w = section?.width ?? breakpoints.desktop;
      const h = section?.height ?? 600;
      const desktop = layoutRectToGridPlacement(
        el.layout.desktop,
        defaultConfig.gridColumns,
        defaultConfig.gridRowHeight,
        w,
        h
      );
      const tablet = layoutRectToGridPlacement(
        el.layout.tablet,
        defaultConfig.gridColumns,
        defaultConfig.gridRowHeight,
        Math.min(w, breakpoints.tablet),
        h
      );
      const mobile = layoutRectToGridPlacement(
        el.layout.mobile,
        defaultConfig.gridColumns,
        defaultConfig.gridRowHeight,
        Math.min(w, breakpoints.mobile),
        h
      );
      const { responsive, ...rest } = el.layout;
      return {
        ...el,
        layout: { desktop, tablet, mobile },
      };
    }),
  };
}
```

Run this on your saved page JSON and then save the result where your app loads
page data.
