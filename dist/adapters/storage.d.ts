import { PageData } from '../core/types';
export interface StorageAdapter {
    save(pageId: string, data: PageData): Promise<void> | void;
    load(pageId: string): Promise<PageData | null> | PageData | null;
    delete?(pageId: string): Promise<void> | void;
}
export declare class LocalStorageAdapter implements StorageAdapter {
    private keyPrefix;
    constructor(keyPrefix?: string);
    save(pageId: string, data: PageData): void;
    load(pageId: string): PageData | null;
    delete(pageId: string): void;
}
export declare class ApiStorageAdapter implements StorageAdapter {
    private apiUrl;
    private headers?;
    constructor(apiUrl: string, headers?: Record<string, string> | undefined);
    save(pageId: string, data: PageData): Promise<void>;
    load(pageId: string): Promise<PageData | null>;
    delete(pageId: string): Promise<void>;
}
//# sourceMappingURL=storage.d.ts.map