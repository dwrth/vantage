# Persistence

Vantage stores nothing for you. The demo serializes to `localStorage` on every change and reloads it on mount:

```ts
const STORAGE_KEY = 'app.layout';

function load(): Layout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyLayout();
    const parsed = JSON.parse(raw);
    if (!isValidLayout(parsed)) return createEmptyLayout();
    return importLayout(parsed);
  } catch {
    return createEmptyLayout();
  }
}

useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}, [layout]);
```

For file-based import/export the same pattern works with `exportLayout` (canonicalizes breakpoint widths) and a `Blob`/`FileReader`. See `demo/src/Toolbar.tsx` for the full implementation, including a hidden `<input type="file">` and graceful `isValidLayout` rejection.

## Preview as a separate route

`VantagePreview` has no chrome, so it's well-suited to a `/preview` route or a popout window. The demo branches on `window.location.pathname` inside `App.tsx`:

```tsx
if (window.location.pathname.startsWith('/preview')) {
  return <VantagePreview value={layout} components={demoComponents} />;
}
```

Opening `/preview` in a new tab gives the user a clean render without dragging the builder along.
