# Vantage

Controlled grid layout builder for React. Drag, resize, restack, and compose sections on a responsive CSS grid. You bring every block component; Vantage handles layout chrome, breakpoints, and the data model.

Demo under `demo/` — toolbar, layers, inspectors, context menu, persistence, seven block kinds:

```bash
cd demo && npm install && npm run dev
```

## Install

Add as a git dependency:

```json
"vantage": "git+https://git@github.com/dwrth/vantage.git"
```

```bash
npm i
```

`prepare` builds `dist/` on install. No separate consumer build step.

## Quick start

```tsx
import { useState } from 'react';
import {
  VantageBuilder,
  VantagePreview,
  createEmptyLayout,
  defineKind,
  type Layout,
  type PreviewRendererProps,
  type EditRendererProps,
} from 'vantage';
import 'vantage/style.css';

type HeroData = { title: string; body: string };

function HeroPreview({ item }: PreviewRendererProps<HeroData>) {
  return (
    <div>
      <h2>{item.data?.title}</h2>
      <p>{item.data?.body}</p>
    </div>
  );
}

function HeroEdit({ item }: EditRendererProps<HeroData>) {
  return (
    <div>
      <h2>{item.data?.title}</h2>
      <p>{item.data?.body}</p>
      <span>Editing</span>
    </div>
  );
}

const heroKind = defineKind<HeroData>({
  component: HeroPreview,
  editComponent: HeroEdit,
  defaults: { w: 6, h: 4, label: 'Hero', data: { title: 'Hello', body: 'World' } },
  displayName: 'Hero',
});

const components = { hero: heroKind };

function App() {
  const [layout, setLayout] = useState<Layout>(createEmptyLayout);
  return (
    <>
      <VantageBuilder value={layout} onChange={(next) => setLayout(next)} components={components} />
      <VantagePreview value={layout} components={components} />
    </>
  );
}
```

Breakpoints, overrides, layers, persistence — all opt-in. Default: single-section desktop builder via `createEmptyLayout()`.

## Docs

| Topic                                      |                                                      |
| ------------------------------------------ | ---------------------------------------------------- |
| [Components](docs/components.md)           | `VantageBuilder`, `VantagePreview`, `defineKind`     |
| [Layout model & mutations](docs/layout.md) | Data shape, sections, items, layering, import/export |
| [Breakpoints](docs/breakpoints.md)         | Responsive overrides, resolution helpers             |
| [Selection](docs/selection.md)             | Controlled / uncontrolled selection                  |
| [Section backgrounds](docs/backgrounds.md) | Color, image, blur, focal crop, parallax             |
| [Persistence](docs/persistence.md)         | `ref`, strip/hydrate, kind persist hooks, file I/O   |
| [Undo / history](docs/history.md)          | `useVantageHistory`, coalesce, reset                 |
| [Custom blocks](docs/blocks.md)            | `defineKind` patterns, interactivity, pitfalls       |
| [Theme / tokens](docs/theme.md)            | `VantageThemeProvider`, opaque CSS token maps        |
| [Host panels](docs/panels.md)              | `VantageInspector`, layers, toolbars (demo patterns) |

## Development

```bash
# library
npm install
npm run build      # dist/
npm run typecheck

# demo
cd demo
npm install
npm run dev        # http://localhost:5173
```
