# Testing baseline

Coverage baseline from `npm run test:coverage` (vitest 5, `@vitest/coverage-v8`). 31 test files, 417 tests, all passing. No threshold is enforced yet.

Excluded from coverage: test files, `*.d.ts`, `src/index.ts` (barrel), `src/types.ts` (types only).

## Overall

| Metric     | Pct    | Covered / total |
| ---------- | ------ | --------------- |
| Statements | 84.61% | 2712 / 3205     |
| Branches   | 76.16% | 1799 / 2362     |
| Functions  | 81.87% | 664 / 811       |
| Lines      | 86.15% | 2359 / 2738     |

## Per file

Sorted by lowest line coverage within each group. Columns are statements / branches / functions / lines in percent, plus the line count.

### Pure logic (mutations, lib)

| File                         | Stmts | Branch | Funcs | Lines | LOC |
| ---------------------------- | ----- | ------ | ----- | ----- | --- |
| `lib/inspector.ts`           | 0     | 0      | 0     | 0     | 7   |
| `lib/backgroundDisplay.ts`   | 2.94  | 0      | 0     | 3.33  | 30  |
| `lib/entities.ts`            | 15.38 | 7.69   | 14.28 | 13.04 | 23  |
| `lib/id.ts`                  | 33.33 | 50     | 50    | 33.33 | 6   |
| `lib/interactive.ts`         | 40    | 16.66  | 50    | 50    | 10  |
| `lib/registry.ts`            | 60    | 40     | 60    | 60    | 15  |
| `lib/defaultLabels.ts`       | 75    | 100    | 66.66 | 75    | 4   |
| `lib/pointerSensor.ts`       | 75    | 66.66  | 100   | 75    | 8   |
| `mutations/arrangement.ts`   | 79.71 | 55.17  | 92.3  | 84.74 | 59  |
| `lib/validate.ts`            | 92.27 | 93.79  | 100   | 91.97 | 187 |
| `lib/breakpoint.ts`          | 97.59 | 97.14  | 89.47 | 97.01 | 67  |
| `mutations/layout.ts`        | 95.16 | 87.07  | 95.78 | 97.26 | 548 |
| `lib/diff.ts`                | 97.05 | 95.83  | 90.9  | 98.33 | 60  |
| `lib/arrangement.ts`         | 98.63 | 98.14  | 92.85 | 98.41 | 63  |
| `lib/rowMetrics.ts`          | 90.47 | 60     | 100   | 100   | 17  |
| `mutations/group.ts`         | 95.23 | 83.05  | 100   | 100   | 75  |
| `lib/dropTargeting.ts`       | 96.15 | 87.5   | 100   | 100   | 21  |
| `lib/pointerDrag.ts`         | 96.42 | 75     | 100   | 100   | 24  |
| `lib/grid.ts`                | 98.66 | 98.57  | 100   | 100   | 66  |
| `lib/guides.ts`              | 100   | 96.66  | 100   | 100   | 58  |
| `lib/keyboard.ts`            | 100   | 98.71  | 100   | 100   | 57  |
| `lib/keyboardLabels.ts`      | 100   | 90     | 100   | 100   | 26  |
| `lib/readingOrder.ts`        | 100   | 87.5   | 100   | 100   | 12  |
| `lib/sectionActionLabels.ts` | 100   | 50     | 100   | 100   | 8   |
| `lib/contentAlign.ts`        | 100   | 100    | 100   | 100   | 12  |
| `lib/overlap.ts`             | 100   | 100    | 100   | 100   | 34  |
| `lib/selection.ts`           | 100   | 100    | 100   | 100   | 14  |

### Hooks, context, theme

| File                             | Stmts | Branch | Funcs | Lines | LOC |
| -------------------------------- | ----- | ------ | ----- | ----- | --- |
| `hooks/useSelection.ts`          | 0     | 0      | 0     | 0     | 14  |
| `theme/VantageThemeProvider.tsx` | 0     | 100    | 0     | 0     | 2   |
| `hooks/useItemData.ts`           | 28.57 | 0      | 33.33 | 33.33 | 6   |
| `hooks/useBuilderActions.ts`     | 44.06 | 40.9   | 35.89 | 41.07 | 56  |
| `context/BuilderContext.tsx`     | 80    | 50     | 100   | 80    | 5   |
| `hooks/useContainerWidth.ts`     | 78.57 | 25     | 75    | 83.33 | 12  |
| `theme/tokens.ts`                | 76.92 | 60     | 100   | 90    | 10  |
| `hooks/useBuilderKeyboard.ts`    | 97.79 | 88.17  | 95.65 | 99.09 | 111 |
| `context/CanvasDndContext.ts`    | 90    | 92.85  | 100   | 100   | 7   |
| `hooks/useVantageHistory.ts`     | 100   | 100    | 100   | 100   | 58  |
| `theme/VantageThemeContext.ts`   | 100   | 100    | 100   | 100   | 1   |
| `theme/applyRoot.ts`             | 100   | 100    | 100   | 100   | 1   |
| `theme/useVantageTokens.ts`      | 100   | 100    | 100   | 100   | 2   |

### Components

| File                                    | Stmts | Branch | Funcs | Lines | LOC |
| --------------------------------------- | ----- | ------ | ----- | ----- | --- |
| `components/UnknownKind.tsx`            | 0     | 100    | 0     | 0     | 1   |
| `components/VantageInspector.tsx`       | 0     | 0      | 0     | 0     | 23  |
| `components/VantageInteractive.tsx`     | 0     | 100    | 0     | 0     | 1   |
| `components/SectionResizeHandle.tsx`    | 15.38 | 5.26   | 20    | 18.18 | 22  |
| `components/SectionBackground.tsx`      | 39.18 | 19.14  | 27.27 | 40.29 | 67  |
| `components/ArrangementBlock.tsx`       | 65.78 | 55.55  | 45.45 | 65.71 | 35  |
| `components/ArrangementSectionView.tsx` | 66.66 | 44.82  | 58.82 | 68.85 | 61  |
| `components/SectionView.tsx`            | 79.91 | 73.26  | 77.77 | 82.75 | 203 |
| `components/Canvas.tsx`                 | 82.43 | 60.55  | 83.33 | 87.64 | 178 |
| `components/VantagePreview.tsx`         | 84.55 | 85.45  | 86.11 | 88.78 | 107 |
| `components/GridBlock.tsx`              | 88.27 | 79.64  | 81.08 | 88.81 | 152 |
| `components/GroupToolbar.tsx`           | 93.75 | 50     | 85.71 | 93.33 | 15  |
| `components/Builder.tsx`                | 94.11 | 86.2   | 95.45 | 94.44 | 54  |
| `components/AlignmentGuides.tsx`        | 100   | 100    | 100   | 100   | 3   |
| `components/SectionActions.tsx`         | 100   | 100    | 100   | 100   | 20  |

## Existing tests

Default environment is `node`. Component and hook tests that need a DOM opt in with a `// @vitest-environment jsdom` comment at the top of the file (11 files). `VantagePreview.test.tsx` runs in node (server rendering). Component tests mostly mount `Builder` and so cover child components indirectly.

| Test file                                    | Covers                                                      | Env   |
| -------------------------------------------- | ----------------------------------------------------------- | ----- |
| `lib/arrangement.test.ts`                    | `lib/arrangement`                                           | node  |
| `lib/breakpoint.test.ts`                     | `lib/breakpoint`                                            | node  |
| `lib/contentAlign.test.ts`                   | `lib/contentAlign`                                          | node  |
| `lib/dropTargeting.test.ts`                  | `lib/dropTargeting`                                         | node  |
| `lib/grid.test.ts`                           | `lib/grid`                                                  | node  |
| `lib/guides.test.ts`                         | `lib/guides`                                                | node  |
| `lib/keyboard.test.ts`                       | `lib/keyboard`, `lib/readingOrder`                          | node  |
| `lib/minSize.test.ts`                        | `lib/grid`, `lib/keyboard` (minimum size behavior)          | node  |
| `lib/overlap.test.ts`                        | `lib/overlap`                                               | node  |
| `lib/pointerDrag.test.ts`                    | `lib/pointerDrag`                                           | node  |
| `lib/selection.test.ts`                      | `lib/selection`                                             | node  |
| `lib/validate.test.ts`                       | `lib/validate`                                              | node  |
| `mutations/arrangement.test.ts`              | `mutations/arrangement`, `mutations/layout`, preview        | node  |
| `mutations/clone.test.ts`                    | `mutations/layout` (clone)                                  | node  |
| `mutations/group.test.ts`                    | `mutations/group`                                           | node  |
| `mutations/layout.test.ts`                   | `mutations/layout`                                          | node  |
| `mutations/sectionRows.test.ts`              | `mutations/layout` (section rows), `lib/diff`, `rowMetrics` | node  |
| `styles/arrangement.test.ts`                 | CSS source assertions                                       | node  |
| `styles/hoverGuard.test.ts`                  | CSS source assertions                                       | node  |
| `hooks/useVantageHistory.test.ts`            | `hooks/useVantageHistory`, `lib/diff`                       | jsdom |
| `components/VantagePreview.test.tsx`         | `components/VantagePreview`                                 | node  |
| `components/AlignmentGuides.test.tsx`        | `Builder`, `AlignmentGuides`                                | jsdom |
| `components/ArrangementBuilder.test.tsx`     | `Builder` with arrangement sections                         | jsdom |
| `components/BuilderKeyboard.test.tsx`        | `Builder`, `useBuilderKeyboard`                             | jsdom |
| `components/CanvasDrag.test.tsx`             | `Builder`, `Canvas` drag                                    | jsdom |
| `components/DefaultLabels.test.tsx`          | `Builder`, default labels                                   | jsdom |
| `components/MultiSelect.test.tsx`            | `Builder`, selection, `BuilderContext`                      | jsdom |
| `components/OverlapSafety.test.tsx`          | `Builder`, overlap handling                                 | jsdom |
| `components/SectionActions.test.tsx`         | `Builder`, `SectionActions`                                 | jsdom |
| `components/SectionHeaderPlacement.test.tsx` | `Builder`, section headers                                  | jsdom |
| `components/SectionResizeHandle.test.tsx`    | `Builder`, `SectionResizeHandle`                            | jsdom |

`fast-check` is not a dependency yet; property-based slices need it added first.

## Recommended slices

Ordered by value for effort. Each slice should be one follow-up agent and one PR.

1. **Small untested lib modules** (node, example-based): `lib/id`, `lib/entities`, `lib/registry`, `lib/interactive`, `lib/inspector`, `lib/defaultLabels`, `lib/pointerSensor`, `lib/backgroundDisplay`, `lib/sectionActionLabels`. Quick wins. `entities` and `backgroundDisplay` are good property-based candidates.
2. **Mutation branches** (node, property-based): `mutations/layout` (548 lines, 87% branches), `mutations/arrangement` (55% branches), `mutations/group`. Add `fast-check` and assert invariants after random mutation sequences: no overlap, items in bounds, `validate` accepts the result, undo-style round trips.
3. **Core lib gaps** (node, property-based): `lib/validate`, `lib/grid`, `lib/breakpoint`, `lib/overlap`, `lib/dropTargeting`, `lib/pointerDrag`, `lib/rowMetrics`, `lib/diff`, `lib/arrangement`, `lib/keyboard`, `lib/readingOrder`. Properties: grid clamping idempotent, diff/apply round trip, resolver outputs never overlap.
4. **Hooks** (jsdom with `renderHook`, no real browser): `useBuilderActions` (41%), `useSelection`, `useItemData`, `useContainerWidth` (needs a `ResizeObserver` stub), plus the remaining branches in `useBuilderKeyboard`. `useBuilderActions` can be driven through `Builder` instead.
5. **Theme and context** (jsdom): `VantageThemeProvider`, `theme/tokens`, `BuilderContext`.
6. **Simple components** (jsdom): `UnknownKind`, `VantageInteractive`, `VantageInspector`, `GroupToolbar`, `SectionResizeHandle` (resize needs pointer events), `SectionBackground` (40%, focal point and image modes).
7. **Arrangement components** (jsdom): `ArrangementBlock`, `ArrangementSectionView`.
8. **Large components** (jsdom, interaction heavy): `SectionView`, `Canvas`, `GridBlock`, `VantagePreview`, `Builder`. jsdom has no layout, so real geometry-dependent drag and resize paths may need a browser runner (vitest browser mode with Playwright) or stay covered by pure-logic tests; decide after slices 1 to 7 and look at the remaining uncovered lines.
9. **Threshold**: once the numbers settle, add `coverage.thresholds` to `vitest.config.ts` just below the achieved values to prevent regression.
