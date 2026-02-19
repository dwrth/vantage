# @vantage/page-builder

A responsive, headless page builder with drag-and-drop functionality for React
applications.

## Features

- 🎨 Drag and drop page builder
- 📱 Responsive breakpoints (desktop, tablet, mobile)
- 🎯 Grid-based snapping
- 💾 Pluggable storage adapters (localStorage, API, etc.)
- 🔧 **Any React component works** - Just register it and it becomes resizable!
- 📐 Percentage-based responsive layouts
- 🎛️ Fully configurable
- 🧩 **Headless hooks** - Build your own UI with exposed hooks

## Installation

### From npm (when published)

```bash
npm install @vantage/page-builder react-rnd
```

### From GitHub

```bash
npm install github:dwrth/vantage react-rnd
# or
npm install git+https://github.com/dwrth/vantage.git react-rnd
# or with specific branch/tag
npm install github:dwrth/vantage#main react-rnd
```

**Note:** The package will automatically build on install via the `prepare`
script.

## Basic Usage

The editor is driven by a **vantageEditor instance** (like React Hook Form's
`useForm`). Create the instance with `useVantageEditor`, then pass it to
`PageEditor`:

```tsx
import { PageEditor, useVantageEditor } from "@vantage/page-builder";

function App() {
  const editor = useVantageEditor({ pageId: "home" });
  return <PageEditor editor={editor} />;
}
```

## Custom UI (Wire the instance to your own UI)

The same `editor` instance exposes all state and actions so you can build your
own toolbar, sidebar, or headless canvas:

```tsx
import {
  useVantageEditor,
  PageEditor,
  LiveView,
  type VantageEditorInstance,
} from "@vantage/page-builder";

function CustomEditor() {
  const editor = useVantageEditor({
    pageId: "page-1",
    components: myComponents,
    storage: myStorage,
  });

  // Use the built-in PageEditor (default UI)
  return <PageEditor editor={editor} />;
}

// Or build your own UI with the same instance:
function MyCustomUI() {
  const editor = useVantageEditor({
    pageId: "page-1",
    components: myComponents,
  });

  return (
    <div>
      <button onClick={editor.undo} disabled={!editor.canUndo}>
        Undo
      </button>
      <button onClick={editor.redo} disabled={!editor.canRedo}>
        Redo
      </button>
      <button onClick={() => editor.addSection(false)}>Add section</button>
      <button onClick={() => editor.addElement("text")}>Add text</button>
      <select
        value={editor.breakpoint}
        onChange={e => editor.setBreakpoint(e.target.value as any)}
      >
        <option value="desktop">Desktop</option>
        <option value="tablet">Tablet</option>
        <option value="mobile">Mobile</option>
      </select>
      {/* Read-only preview using editor data */}
      <LiveView
        pageData={editor.pageData}
        components={editor.components}
        breakpoints={editor.breakpoints}
        currentBreakpoint={editor.breakpoint}
      />
    </div>
  );
}
```

**Instance API (VantageEditorInstance):**

- **State:** `pageData`, `breakpoint`, `selectedIds`, `showGrid`, `canUndo`,
  `canRedo`, `historyLoading`, `gridSize`, `breakpoints`, `canvasHeight`,
  `defaultSectionHeight`
- **Setters:** `setBreakpoint`, `setSelectedIds`, `setShowGrid`, `setPageData`,
  `selectElements`
- **Element actions:** `addElement`, `updateElement`, `updateLayout`,
  `updateLayoutBulk`, `deleteElement`, `updateZIndex`, `ensureBreakpointLayout`
- **Section actions:** `addSection`, `deleteSection`, `updateSectionHeight`,
  `updateSectionFullWidth`
- **History:** `undo`, `redo`, `save`
- **Rendering:** `components` (for use with `LiveView` or a custom canvas)

## Custom Storage

The package **never makes network requests**. You provide your own storage
implementation using any HTTP client you prefer (axios, fetch, server actions,
etc.).

### Using localStorage (Default)

```tsx
import {
  PageEditor,
  useVantageEditor,
  LocalStorageAdapter,
} from "@vantage/page-builder";

function App() {
  const storage = new LocalStorageAdapter();
  const editor = useVantageEditor({ pageId: "home", storage });
  return <PageEditor editor={editor} />;
}
```

### Custom Storage with Axios

```tsx
import {
  PageEditor,
  StorageAdapter,
  HistorySnapshot,
} from "@vantage/page-builder";
import axios from "axios";

class AxiosStorageAdapter implements StorageAdapter {
  async save(pageId: string, data: PageData): Promise<void> {
    await axios.put(`/api/pages/${pageId}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async load(pageId: string): Promise<PageData | null> {
    const res = await axios.get(`/api/pages/${pageId}`);
    return res.data;
  }

  async saveHistory(pageId: string, history: HistorySnapshot[]): Promise<void> {
    await axios.put(`/api/pages/${pageId}/history`, { history });
  }

  async loadHistory(pageId: string): Promise<HistorySnapshot[] | null> {
    const res = await axios.get(`/api/pages/${pageId}/history`);
    return res.data.history;
  }
}

const storage = new AxiosStorageAdapter();
const editor = useVantageEditor({ pageId: "home", storage });
<PageEditor editor={editor} />;
```

### Custom Storage with Next.js Server Actions

```tsx
import { PageEditor, StorageAdapter } from "@vantage/page-builder";
import {
  savePage,
  loadPage,
  savePageHistory,
  loadPageHistory,
} from "./actions";

class ServerActionStorageAdapter implements StorageAdapter {
  async save(pageId: string, data: PageData): Promise<void> {
    await savePage(pageId, data);
  }

  async load(pageId: string): Promise<PageData | null> {
    return await loadPage(pageId);
  }

  async saveHistory(pageId: string, history: HistorySnapshot[]): Promise<void> {
    await savePageHistory(pageId, history);
  }

  async loadHistory(pageId: string): Promise<HistorySnapshot[] | null> {
    return await loadPageHistory(pageId);
  }
}

const storage = new ServerActionStorageAdapter();
const editor = useVantageEditor({ pageId: "home", storage });
<PageEditor editor={editor} />;
```

### Custom Storage with Fetch

```tsx
import { PageEditor, StorageAdapter } from "@vantage/page-builder";

class FetchStorageAdapter implements StorageAdapter {
  async save(pageId: string, data: PageData): Promise<void> {
    await fetch(`/api/pages/${pageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async load(pageId: string): Promise<PageData | null> {
    const res = await fetch(`/api/pages/${pageId}`);
    if (!res.ok) return null;
    return res.json();
  }

  // History methods are optional
  async saveHistory(pageId: string, history: HistorySnapshot[]): Promise<void> {
    await fetch(`/api/pages/${pageId}/history`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history }),
    });
  }

  async loadHistory(pageId: string): Promise<HistorySnapshot[] | null> {
    const res = await fetch(`/api/pages/${pageId}/history`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.history;
  }
}

const storage = new FetchStorageAdapter();
const editor = useVantageEditor({ pageId: "home", storage });
<PageEditor editor={editor} />;
```

## Custom Components

**Any React component works!** Just register it and it instantly becomes
draggable and resizable.

```tsx
import {
  PageEditor,
  useVantageEditor,
  ComponentRegistry,
} from "@vantage/page-builder";

const components: ComponentRegistry<"button" | "card"> = {
  button: ({ label, onClick }) => <button onClick={onClick}>{label}</button>,
  card: ({ title, children }) => (
    <div className="card">
      <h3>{title}</h3>
      {children}
    </div>
  ),
};

const editor = useVantageEditor({ pageId: "home", components });
<PageEditor editor={editor} />;
```

## Custom Configuration

```tsx
const editor = useVantageEditor({
  pageId: "home",
  gridSize: 50,
  breakpoints: {
    desktop: 1440,
    tablet: 1024,
    mobile: 375,
  },
  onSave: data => {
    console.log("Page saved:", data);
  },
});
<PageEditor editor={editor} />;
```

## Headless Hooks API

### `usePageData`

Manages page data and saving:

```tsx
const { pageData, setPageData, save } = usePageData(pageId, {
  storage?: StorageAdapter,
  autoSaveDelay?: number,
  onSave?: (data: PageData) => void,
  initialData?: PageData,
});
```

### `usePageActions`

Provides actions for manipulating elements:

```tsx
const {
  addElement,
  updateLayout,
  updateElement,
  deleteElement,
  updateZIndex,
  ensureBreakpointLayout,
} = usePageActions(pageData, setPageData, {
  gridSize?: number,
  breakpoints?: Record<Breakpoint, number>,
  canvasHeight?: number,
});
```

## Server-Side Saving Example

```tsx
import {
  usePageData,
  usePageActions,
  StorageAdapter,
} from "@vantage/page-builder";
import axios from "axios";

// Implement your own storage adapter
class MyStorageAdapter implements StorageAdapter {
  async save(pageId: string, data: PageData): Promise<void> {
    await axios.put(`/api/pages/${pageId}`, data);
  }

  async load(pageId: string): Promise<PageData | null> {
    const res = await axios.get(`/api/pages/${pageId}`);
    return res.data;
  }
}

function MyEditor() {
  const storage = new MyStorageAdapter();

  const { pageData, setPageData, save } = usePageData("page-1", {
    storage,
    autoSaveDelay: 2000, // Auto-save every 2 seconds (optimistic updates)
  });

  const { addElement, updateLayout } = usePageActions(pageData, setPageData);

  // Your custom UI here
}
```

## Server-Side History (Undo/Redo)

Enable persistent history that survives page refreshes:

```tsx
import {
  PageEditor,
  StorageAdapter,
  HistorySnapshot,
} from "@vantage/page-builder";
import axios from "axios";

class MyStorageAdapter implements StorageAdapter {
  async save(pageId: string, data: PageData): Promise<void> {
    await axios.put(`/api/pages/${pageId}`, data);
  }

  async load(pageId: string): Promise<PageData | null> {
    const res = await axios.get(`/api/pages/${pageId}`);
    return res.data;
  }

  // History methods (required for persistHistory: true)
  async saveHistory(pageId: string, history: HistorySnapshot[]): Promise<void> {
    await axios.put(`/api/pages/${pageId}/history`, { history });
  }

  async loadHistory(pageId: string): Promise<HistorySnapshot[] | null> {
    const res = await axios.get(`/api/pages/${pageId}/history`);
    return res.data?.history || null;
  }

  async clearHistory(pageId: string): Promise<void> {
    await axios.delete(`/api/pages/${pageId}/history`);
  }
}

const storage = new MyStorageAdapter();
const editor = useVantageEditor({
  pageId: "home",
  storage,
  persistHistory: true, // Enable server-side history
  maxHistorySize: 100, // Store up to 100 undo steps
});
<PageEditor editor={editor} />;
```

**How it works:**

- **Optimistic Updates**: UI updates immediately, server syncs in background
- **History Persistence**: Undo/redo history is saved via your storage adapter
- **Auto-Load**: History loads automatically when page opens
- **Debounced**: History saves are debounced (1 second) to reduce server calls

**Note:** The package never makes network requests. You implement `saveHistory`,
`loadHistory`, and `clearHistory` methods using your preferred HTTP client.

## Live View

```tsx
import { LiveView } from "@vantage/page-builder";

<LiveView pageData={pageData} components={components} />;
```

## Development

### Build Package

```bash
npm run build
```

**Note:** The `prepare` script will automatically build the package on install.
However, committing `dist/` is recommended for:

- **Faster installs** - No build step needed
- **More reliable** - No risk of build failures or missing TypeScript
- **Better CI/CD** - Consuming projects don't need TypeScript installed

### Run Example App

```bash
npm run example:dev
```

### Publishing to GitHub

1. Build the package: `npm run build`
2. Commit the `dist/` folder (recommended for faster installs)
3. Push to GitHub
4. Install via: `npm install github:dwrth/vantage`

## Project Structure

```
.
├── src/                    # Package source code
│   ├── core/              # Core types and config
│   ├── hooks/             # React hooks
│   │   ├── usePageEditor.ts  # Full editor hook
│   │   ├── usePageData.ts    # Headless data management
│   │   └── usePageActions.ts # Headless element actions
│   ├── components/        # React components
│   ├── utils/             # Utility functions
│   └── adapters/          # Storage and component adapters
├── example/               # Example Next.js app
│   └── app/               # Example app pages
└── dist/                  # Built package (generated)
```

## API Reference

### Components

- `PageEditor` - Main editor component
- `LiveView` - Preview/published view component
- `BreakpointSwitcher` - Breakpoint selector
- `GridOverlay` - Visual grid overlay

### Hooks

- `useVantageEditor` - Creates the editor instance (recommended). Pass options
  `{ pageId, ...config }`; returns `VantageEditorInstance`.
- `usePageEditor` - Lower-level editor hook (same return shape as
  useVantageEditor; useVantageEditor is the public API).
- `usePageData` - Headless data management hook
- `usePageActions` - Headless element manipulation hook

### Types

- `VantageEditorInstance<T>` - The editor instance type. Use it to type props or
  custom UI that receives the instance.

### Adapters

- `StorageAdapter` - Storage interface
- `LocalStorageAdapter` - Browser localStorage implementation
- `StorageAdapter` - Interface for custom storage implementations
- `ComponentRegistry` - Component registry interface

## License

MIT
