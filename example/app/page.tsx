'use client';

import { PageEditor } from '@vantage/page-builder';
import { customComponents } from '../components/CustomComponents';

/**
 * This page demonstrates:
 * 1. ANY React component can be made resizable by registering it
 * 2. Auto-saving to localStorage (default behavior)
 * 3. Optional server-side saving via onSave callback (commented example)
 *
 * Try adding components from the sidebar - they're all regular React components
 * that instantly become draggable and resizable!
 */
export default function Home() {
 return (
  <div className="h-screen flex flex-col">
   <div className="p-4 bg-blue-50 border-b border-blue-200">
    <h1 className="m-0 text-2xl font-semibold">🎨 Page Builder Demo</h1>
    <p className="mt-2 text-sm text-slate-600">
     Demonstrates <strong>any React component</strong> can be resizable.
     Auto-saves to localStorage (default). See code comments for server-side saving examples.
    </p>
   </div>
   <div className="flex-1">
    <PageEditor
     pageId="demo"
     config={{
      components: customComponents,
      // Uses localStorage by default (LocalStorageAdapter)
      // Auto-saves every 2 seconds
      autoSaveDelay: 2000,
      
      // Optional: Add server-side saving alongside localStorage
      // onSave: async (data) => {
      //   // Sync to your API while still using localStorage
      //   await fetch('/api/pages/demo', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(data),
      //   });
      // },
      
      // Alternative: Use API storage instead of localStorage
      // import { ApiStorageAdapter } from '@vantage/page-builder';
      // storage: new ApiStorageAdapter('https://api.example.com'),
     }}
    />
   </div>
  </div>
 );
}
