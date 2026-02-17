// Storage adapter interface - allows plugging in different storage backends
/**
 * LocalStorage adapter - for development/testing
 * No network requests, stores data in browser localStorage
 */
export class LocalStorageAdapter {
    constructor(keyPrefix = "page-builder-") {
        this.keyPrefix = keyPrefix;
    }
    save(pageId, data) {
        try {
            if (typeof window === "undefined")
                return;
            localStorage.setItem(`${this.keyPrefix}${pageId}`, JSON.stringify(data));
        }
        catch (error) {
            console.error("Failed to save page data:", error);
        }
    }
    load(pageId) {
        try {
            if (typeof window === "undefined")
                return null;
            const stored = localStorage.getItem(`${this.keyPrefix}${pageId}`);
            if (!stored)
                return null;
            return JSON.parse(stored);
        }
        catch (error) {
            console.error("Failed to load page data:", error);
            return null;
        }
    }
    delete(pageId) {
        try {
            if (typeof window === "undefined")
                return;
            localStorage.removeItem(`${this.keyPrefix}${pageId}`);
            localStorage.removeItem(`${this.keyPrefix}${pageId}-history`);
        }
        catch (error) {
            console.error("Failed to delete page data:", error);
        }
    }
    // LocalStorage history support (for development/testing)
    saveHistory(pageId, history) {
        try {
            if (typeof window === "undefined")
                return;
            localStorage.setItem(`${this.keyPrefix}${pageId}-history`, JSON.stringify(history));
        }
        catch (error) {
            console.error("Failed to save history:", error);
        }
    }
    loadHistory(pageId) {
        try {
            if (typeof window === "undefined")
                return null;
            const stored = localStorage.getItem(`${this.keyPrefix}${pageId}-history`);
            if (!stored)
                return null;
            return JSON.parse(stored);
        }
        catch (error) {
            console.error("Failed to load history:", error);
            return null;
        }
    }
    clearHistory(pageId) {
        try {
            if (typeof window === "undefined")
                return;
            localStorage.removeItem(`${this.keyPrefix}${pageId}-history`);
        }
        catch (error) {
            console.error("Failed to clear history:", error);
        }
    }
}
