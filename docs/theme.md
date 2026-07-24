# Theme / tokens

Hosts style Vantage chrome and kinds through an opaque CSS-variable map. No branded palette taxonomy in the library.

## Override path

**One API:** `VantageThemeProvider` `tokens` prop. CSS custom properties are the transport; do not treat host stylesheets that set `--vantage-*` as the supported override story.

```tsx
import { VantageThemeProvider, VantageBuilder, VantagePreview, useVantageTokens } from 'vantage';
import 'vantage/style.css';

const tokens = {
  '--vantage-color': '#0f172a',
  '--vantage-cell-max-px': '96px',
  '--vantage-row-max-px': '48px',
  '--vantage-kind-accent': '#2563eb',
};

function App() {
  return (
    <VantageThemeProvider tokens={tokens}>
      <VantageBuilder value={layout} onChange={onChange} components={components} />
      <VantagePreview value={layout} components={components} />
    </VantageThemeProvider>
  );
}
```

Provider is context-only. `VantageBuilder`, `VantagePreview`, and `VantageInspector` each apply the merged map as inline vars on their `.vantage-root`.

Without a provider, surfaces use `DEFAULT_VANTAGE_TOKENS`. `useVantageTokens()` always returns the merged map (defaults if outside a provider).

```ts
mergeVantageTokens(overrides?) // host keys win
tokensToStyle(tokens)           // React style object
parsePxToken(value, fallback)   // '96px' → 96
```

## Built-in layout tokens

| Token                   | Default      | Role                                        |
| ----------------------- | ------------ | ------------------------------------------- |
| `--vantage-cell-max-px` | `96px`       | Max cell width (CSS grid + drag math)       |
| `--vantage-row-max-px`  | `48px`       | Max row height ratio (CSS grid + drag math) |
| `--vantage-color`       | `#1f2430`    | Root text color                             |
| `--vantage-font-family` | system stack | Root font                                   |
| `--vantage-line-height` | `1.5`        | Root line height                            |
| `--vantage-font-weight` | `400`        | Root weight                                 |

Changing `--vantage-cell-max-px` / `--vantage-row-max-px` via the provider updates both CSS layout and Builder snap math.

## Kind-facing convention

Prefer `--vantage-kind-*` for block styles (e.g. `--vantage-kind-accent`). The library does not mandate names or a design system. Kinds read tokens with `var(--vantage-kind-…)` in CSS or `useVantageTokens()` in React.

## Chrome vs tokens

`vantage/style.css` styles grid chrome (handles, overlays). Hosts may still theme that chrome with their own CSS. Token overrides for library roots and kinds go through the provider.
