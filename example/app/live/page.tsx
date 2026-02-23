"use client";

import { useEffect, useState } from "react";
import { LiveView, PageData, LocalStorageAdapter } from "@vantage/page-builder";
import { customComponents } from "@/components/CustomComponents";
import { GRID_COLUMNS, GRID_ROW_HEIGHT } from "../page";

type ExampleElementType =
  | "button"
  | "card"
  | "counter"
  | "form"
  | "alert"
  | "todo";

/**
 * Live preview – loads page data from storage and renders with LiveView (grid layout).
 */
export default function LivePage() {
  const [pageData, setPageData] = useState<PageData<ExampleElementType> | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storage = new LocalStorageAdapter();
    const loaded = storage.load("demo") as PageData<ExampleElementType> | null;
    if (loaded) setPageData(loaded);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-700">Loading page...</p>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8">
          <h2 className="text-2xl font-semibold mb-2">No page data found</h2>
          <p className="text-slate-700">
            Create a page in the editor first, then view it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-semibold">📄 Live Preview</h1>
        <p className="text-sm text-slate-700 mt-1">
          This is how your page looks to visitors
        </p>
      </div>
      <LiveView
        pageData={pageData}
        components={customComponents}
        gridColumns={GRID_COLUMNS}
        gridRowHeight={GRID_ROW_HEIGHT}
      />
    </div>
  );
}
