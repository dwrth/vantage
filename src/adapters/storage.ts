// Storage adapter interface - allows plugging in different storage backends

import { PageData } from "../core/types";

export interface HistorySnapshot {
  data: PageData;
  timestamp: number;
  version?: number;
}

/**
 * Storage adapter interface
 * Implement this interface to provide your own storage backend
 * (axios, fetch, server actions, GraphQL, etc.)
 */
export interface StorageAdapter {
  save(pageId: string, data: PageData): Promise<void> | void;
  load(pageId: string): Promise<PageData | null> | PageData | null;
  delete?(pageId: string): Promise<void> | void;

  // History operations (optional - implement for server-side history)
  saveHistory?(
    pageId: string,
    history: HistorySnapshot[],
  ): Promise<void> | void;
  loadHistory?(
    pageId: string,
  ): Promise<HistorySnapshot[] | null> | HistorySnapshot[] | null;
  clearHistory?(pageId: string): Promise<void> | void;
}

/**
 * LocalStorage adapter - for development/testing
 * No network requests, stores data in browser localStorage
 */
export class LocalStorageAdapter implements StorageAdapter {
  constructor(private keyPrefix: string = "page-builder-") {}

  save(pageId: string, data: PageData): void {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(`${this.keyPrefix}${pageId}`, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save page data:", error);
    }
  }

  load(pageId: string): PageData | null {
    try {
      if (typeof window === "undefined") return null;
      const stored = localStorage.getItem(`${this.keyPrefix}${pageId}`);
      if (!stored) return null;
      return JSON.parse(stored) as PageData;
    } catch (error) {
      console.error("Failed to load page data:", error);
      return null;
    }
  }

  delete(pageId: string): void {
    try {
      if (typeof window === "undefined") return;
      localStorage.removeItem(`${this.keyPrefix}${pageId}`);
      localStorage.removeItem(`${this.keyPrefix}${pageId}-history`);
    } catch (error) {
      console.error("Failed to delete page data:", error);
    }
  }

  // LocalStorage history support (for development/testing)
  saveHistory(pageId: string, history: HistorySnapshot[]): void {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(
        `${this.keyPrefix}${pageId}-history`,
        JSON.stringify(history),
      );
    } catch (error) {
      console.error("Failed to save history:", error);
    }
  }

  loadHistory(pageId: string): HistorySnapshot[] | null {
    try {
      if (typeof window === "undefined") return null;
      const stored = localStorage.getItem(`${this.keyPrefix}${pageId}-history`);
      if (!stored) return null;
      return JSON.parse(stored) as HistorySnapshot[];
    } catch (error) {
      console.error("Failed to load history:", error);
      return null;
    }
  }

  clearHistory(pageId: string): void {
    try {
      if (typeof window === "undefined") return;
      localStorage.removeItem(`${this.keyPrefix}${pageId}-history`);
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  }
}
