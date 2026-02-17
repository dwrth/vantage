import { PageData } from '../core/types';
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
    saveHistory?(pageId: string, history: HistorySnapshot[]): Promise<void> | void;
    loadHistory?(pageId: string): Promise<HistorySnapshot[] | null> | HistorySnapshot[] | null;
    clearHistory?(pageId: string): Promise<void> | void;
}
/**
 * LocalStorage adapter - for development/testing
 * No network requests, stores data in browser localStorage
 */
export declare class LocalStorageAdapter implements StorageAdapter {
    private keyPrefix;
    constructor(keyPrefix?: string);
    save(pageId: string, data: PageData): void;
    load(pageId: string): PageData | null;
    delete(pageId: string): void;
    saveHistory(pageId: string, history: HistorySnapshot[]): void;
    loadHistory(pageId: string): HistorySnapshot[] | null;
    clearHistory(pageId: string): void;
}
//# sourceMappingURL=storage.d.ts.map