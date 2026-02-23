"use client";

import { useMemo } from "react";
import {
  LocalStorageAdapter,
  PageEditor,
  useVantageEditor,
} from "@vantage/page-builder";
import { customComponents } from "../components/CustomComponents";

/** Grid config (match react-rnd grid story: 24 columns, 8px row height). */
export const GRID_COLUMNS = 24;
export const GRID_ROW_HEIGHT = 8;

/**
 * Grid-based page builder demo.
 * Uses gridColumns / gridRowHeight; PageEditor places elements by grid coordinates.
 */
export default function Home() {
  const storage = useMemo(() => new LocalStorageAdapter(), []);
  const editor = useVantageEditor({
    pageId: "demo",
    components: customComponents,
    autoSaveDelay: 3,
    persistHistory: true,
    storage,
    maxSectionWidth: 1500,
    gridColumns: GRID_COLUMNS,
    gridRowHeight: GRID_ROW_HEIGHT,
  });

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 bg-blue-50 border-b border-blue-200">
        <h1 className="m-0 text-2xl font-semibold">🎨 Page Builder Demo</h1>
        <p className="mt-2 text-sm text-slate-700">
          Grid-based layout: {GRID_COLUMNS} columns, {GRID_ROW_HEIGHT}px row
          height. Auto-saves to localStorage.
        </p>
      </div>
      <div className="flex-1">
        <PageEditor editor={editor} />
      </div>
    </div>
  );
}
