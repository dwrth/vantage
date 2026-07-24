# Selection

`SelectionRef = { sectionId, itemId }`. Treat it as opaque.

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
