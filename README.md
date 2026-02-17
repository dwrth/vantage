# @vantage/page-builder

A responsive, headless page builder with drag-and-drop functionality for React applications.

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

```bash
npm install @vantage/page-builder react-rnd
```

## Basic Usage

```tsx
import { PageEditor } from '@vantage/page-builder';

function App() {
  return <PageEditor pageId="home" />;
}
```

## Headless Usage (Custom UI)

Build your own UI using the headless hooks:

```tsx
import { usePageData, usePageActions, ApiStorageAdapter } from '@vantage/page-builder';

function CustomEditor() {
  const storage = new ApiStorageAdapter('https://api.example.com');
  
  const { pageData, setPageData, save } = usePageData('page-1', {
    storage,
    autoSaveDelay: 5000, // 5 seconds
    onSave: async (data) => {
      // Custom save logic
      await fetch('/api/pages', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  });

  const { addElement, updateLayout, deleteElement } = usePageActions(
    pageData,
    setPageData
  );

  // Build your custom UI using pageData and actions
  return (
    <div>
      <button onClick={() => addElement('button')}>Add Button</button>
      <button onClick={() => save()}>Save Now</button>
      {/* Your custom canvas UI */}
    </div>
  );
}
```

## Custom Storage

```tsx
import { PageEditor, ApiStorageAdapter } from '@vantage/page-builder';

const storage = new ApiStorageAdapter('https://api.example.com');

<PageEditor
  pageId="home"
  config={{
    storage,
  }}
/>
```

## Custom Components

**Any React component works!** Just register it and it instantly becomes draggable and resizable.

```tsx
import { PageEditor, ComponentRegistry } from '@vantage/page-builder';

const components: ComponentRegistry<'button' | 'card'> = {
  button: ({ label, onClick }) => (
    <button onClick={onClick}>{label}</button>
  ),
  card: ({ title, children }) => (
    <div className="card">
      <h3>{title}</h3>
      {children}
    </div>
  ),
};

<PageEditor
  pageId="home"
  config={{ components }}
/>
```

## Custom Configuration

```tsx
<PageEditor
  pageId="home"
  config={{
    gridSize: 50,
    breakpoints: {
      desktop: 1440,
      tablet: 1024,
      mobile: 375,
    },
    onSave: (data) => {
      console.log('Page saved:', data);
    },
  }}
/>
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
import { usePageData, usePageActions } from '@vantage/page-builder';

class ServerStorageAdapter implements StorageAdapter {
  async save(pageId: string, data: PageData) {
    await fetch(`/api/pages/${pageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async load(pageId: string): Promise<PageData | null> {
    const res = await fetch(`/api/pages/${pageId}`);
    return res.json();
  }
}

function MyEditor() {
  const storage = new ServerStorageAdapter();
  
  const { pageData, setPageData, save } = usePageData('page-1', {
    storage,
    autoSaveDelay: 2000, // Auto-save every 2 seconds
  });

  const { addElement, updateLayout } = usePageActions(pageData, setPageData);

  // Your custom UI here
}
```

## Live View

```tsx
import { LiveView } from '@vantage/page-builder';

<LiveView pageData={pageData} components={components} />
```

## Development

### Build Package

```bash
npm run build
```

### Run Example App

```bash
npm run example:dev
```

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

- `usePageEditor` - Full editor logic hook (with UI state)
- `usePageData` - Headless data management hook
- `usePageActions` - Headless element manipulation hook

### Adapters

- `StorageAdapter` - Storage interface
- `LocalStorageAdapter` - Browser localStorage implementation
- `ApiStorageAdapter` - API-based storage
- `ComponentRegistry` - Component registry interface

## License

MIT
