"use client";

import { useEffect, useState } from "react";
import { LiveView, PageData, LocalStorageAdapter } from "@vantage/page-builder";
import { customComponents } from "@/components/CustomComponents";

/**
 * Live preview page - demonstrates loading page data
 * In production, you'd use usePageData hook or load from your API
 */
export default function LivePage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Example: Loading from localStorage
    // In production, use usePageData hook or fetch from API:
    // const { pageData } = usePageData('demo', { storage: apiStorage });

    const storage = new LocalStorageAdapter();
    const loaded = storage.load("demo");

    if (loaded) {
      setPageData(loaded);
    }
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
      <LiveView pageData={pageData} components={customComponents} />
    </div>
  );
}
