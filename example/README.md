# Page Builder Example

This example demonstrates how to use `@vantage/page-builder` with custom React components and headless hooks.

## Key Features

### 1. Any React Component Works!

The page builder accepts **any React component** via the component registry. Simply register your component and it instantly becomes draggable and resizable!

### 2. Headless Hooks for Custom UIs

Build your own UI using `usePageData` and `usePageActions` hooks - perfect for server-side saving and custom implementations.

### 3. Server-Side Saving

Use `onSave` callbacks or custom `StorageAdapter` implementations to save to your API.

## Example Components

This example includes several custom components to demonstrate the flexibility:

- **Button** - Simple button component
- **Card** - Card with image and text
- **Counter** - Component with internal state (React hooks)
- **Form** - Form with inputs and submit handler
- **Alert** - Alert/badge component
- **TodoList** - Complex component with state management

## Pages

### `/` - Main Editor

Full-featured editor with drag & drop, demonstrates:

- Custom components
- Auto-saving to localStorage (default)
- Optional server-side saving examples (commented)

```tsx
<PageEditor
  pageId="demo"
  config={{
    components: customComponents,
    // Uses localStorage by default
    autoSaveDelay: 2000,
    // Optional: Add server sync alongside localStorage
    // onSave: async (data) => {
    //   await fetch('/api/pages', { method: 'POST', body: JSON.stringify(data) });
    // },
  }}
/>
```

### `/live` - Live Preview

Shows how to load and render saved pages:

```tsx
const { pageData } = usePageData("demo", { storage: apiStorage });
<LiveView pageData={pageData} components={customComponents} />;
```

### `/headless` - Headless Example

Demonstrates building a custom UI using headless hooks:

```tsx
// Uses localStorage by default
const { pageData, setPageData, save } = usePageData("demo", {
  autoSaveDelay: 3000,
  // Optional: Add server sync alongside localStorage
  // onSave: async (data) => {
  //   await fetch('/api/pages', { method: 'POST', body: JSON.stringify(data) });
  // },
});

const { addElement, updateLayout, deleteElement } = usePageActions(
  pageData,
  setPageData,
);

// Build your custom UI
```

## Running

```bash
npm run dev
```

Visit:

- `/` - Main editor with custom components and server-side saving
- `/live` - Live preview of saved pages
- `/headless` - Custom UI built with headless hooks

## Storage & Saving

### Default: localStorage

By default, the page builder uses `LocalStorageAdapter` to save to browser localStorage:

```tsx
<PageEditor pageId="demo" config={{ autoSaveDelay: 2000 }} />
// Automatically saves to localStorage every 2 seconds
```

### Option 1: Add Server Sync (alongside localStorage)

Keep localStorage but also sync to your server:

```tsx
<PageEditor
  pageId="demo"
  config={{
    // Still uses localStorage
    autoSaveDelay: 2000,
    // Also syncs to server
    onSave: async (data) => {
      await fetch("/api/pages/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
  }}
/>
```

### Option 2: Replace with API Storage

Use API storage instead of localStorage:

```tsx
// Implement your own storage adapter (see main README.md for examples)
// The package never makes network requests - you provide your own implementation

<PageEditor pageId="demo" config={{ storage }} />
```

### Option 3: Headless Hooks with Custom Save

```tsx
const { pageData, save } = usePageData("demo", {
  // Uses localStorage by default
  autoSaveDelay: 2000,
  // Optional: Add server sync
  // onSave: async (data) => {
  //   await fetch('/api/pages', { method: 'POST', body: JSON.stringify(data) });
  // },
});
```
