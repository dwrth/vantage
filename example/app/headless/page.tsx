'use client';

import { useState } from 'react';
import { usePageData, usePageActions } from '@vantage/page-builder';
import type { PageData } from '@vantage/page-builder';
import { customComponents } from '@/components/CustomComponents';

/**
 * Headless example - demonstrates building a custom UI using the headless hooks
 * This shows how to use usePageData and usePageActions to build your own editor
 */
export default function HeadlessPage() {
 const [showSaveStatus, setShowSaveStatus] = useState(false);

 const { pageData, setPageData, save } = usePageData<'button' | 'card' | 'counter'>('headless-demo', {
  // Uses localStorage by default (LocalStorageAdapter)
  autoSaveDelay: 3000,
  // Optional: Add server-side saving alongside localStorage
  onSave: async (data) => {
   // Custom save logic - could be API call, etc.
   // This runs in addition to localStorage saving
   console.log('💾 Custom save callback (localStorage also saves):', data);
   setShowSaveStatus(true);
   setTimeout(() => setShowSaveStatus(false), 2000);
   
   // Example: Sync to server
   // await fetch('/api/pages/headless-demo', {
   //   method: 'POST',
   //   headers: { 'Content-Type': 'application/json' },
   //   body: JSON.stringify(data),
   // });
  },
 });

 const { addElement, updateLayout, deleteElement } = usePageActions(
  pageData,
  setPageData
 );

 return (
  <div className="h-screen flex flex-col bg-gray-50">
   <div className="p-4 bg-white border-b border-gray-200">
    <h1 className="text-2xl font-semibold mb-2">🧩 Headless Example</h1>
    <p className="text-sm text-slate-600 mb-4">
     Custom UI built with usePageData and usePageActions hooks
    </p>
    <div className="flex gap-2">
     <button
      onClick={() => addElement('button', { label: 'New Button' })}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
     >
      Add Button
     </button>
     <button
      onClick={() => addElement('card', { title: 'New Card', content: 'Card content' })}
      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
     >
      Add Card
     </button>
     <button
      onClick={() => addElement('counter')}
      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
     >
      Add Counter
     </button>
     <button
      onClick={() => save()}
      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 ml-auto"
     >
      Save Now
     </button>
     {showSaveStatus && (
      <span className="px-4 py-2 text-green-600 font-medium">✓ Saved!</span>
     )}
    </div>
   </div>

   <div className="flex-1 p-4 overflow-auto">
    <div className="max-w-4xl mx-auto">
     <div className="bg-white rounded-lg shadow p-6 mb-4">
      <h2 className="text-lg font-semibold mb-4">Page Data</h2>
      <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
       {JSON.stringify(pageData, null, 2)}
      </pre>
     </div>

     <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Elements ({pageData.elements.length})</h2>
      {pageData.elements.length === 0 ? (
       <p className="text-slate-500 text-center py-8">
        No elements yet. Click buttons above to add elements.
       </p>
      ) : (
       <div className="space-y-2">
        {pageData.elements.map((el) => {
         const Component = customComponents[el.type as keyof typeof customComponents];
         return (
          <div
           key={el.id}
           className="border border-gray-200 rounded p-4 flex items-center justify-between"
          >
           <div className="flex-1">
            <div className="font-medium">{el.type}</div>
            <div className="text-sm text-slate-600">
             Position: ({el.layout.desktop.x}, {el.layout.desktop.y}) | Size:{' '}
             {el.layout.desktop.w} × {el.layout.desktop.h}
            </div>
            {Component && (
             <div className="mt-2 p-2 bg-gray-50 rounded">
              <Component {...(el.content as any)} />
             </div>
            )}
           </div>
           <button
            onClick={() => deleteElement(el.id)}
            className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
           >
            Delete
           </button>
          </div>
         );
        })}
       </div>
      )}
     </div>
    </div>
   </div>
  </div>
 );
}
