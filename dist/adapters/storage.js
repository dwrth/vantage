// Storage adapter interface - allows plugging in different storage backends
// Default localStorage adapter
export class LocalStorageAdapter {
    constructor(keyPrefix = 'page-builder-') {
        this.keyPrefix = keyPrefix;
    }
    save(pageId, data) {
        try {
            if (typeof window === 'undefined')
                return;
            localStorage.setItem(`${this.keyPrefix}${pageId}`, JSON.stringify(data));
        }
        catch (error) {
            console.error('Failed to save page data:', error);
        }
    }
    load(pageId) {
        try {
            if (typeof window === 'undefined')
                return null;
            const stored = localStorage.getItem(`${this.keyPrefix}${pageId}`);
            if (!stored)
                return null;
            return JSON.parse(stored);
        }
        catch (error) {
            console.error('Failed to load page data:', error);
            return null;
        }
    }
    delete(pageId) {
        try {
            if (typeof window === 'undefined')
                return;
            localStorage.removeItem(`${this.keyPrefix}${pageId}`);
        }
        catch (error) {
            console.error('Failed to delete page data:', error);
        }
    }
}
// API adapter example
export class ApiStorageAdapter {
    constructor(apiUrl, headers) {
        this.apiUrl = apiUrl;
        this.headers = headers;
    }
    async save(pageId, data) {
        await fetch(`${this.apiUrl}/pages/${pageId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...this.headers,
            },
            body: JSON.stringify(data),
        });
    }
    async load(pageId) {
        const response = await fetch(`${this.apiUrl}/pages/${pageId}`, {
            headers: this.headers,
        });
        if (!response.ok)
            return null;
        return response.json();
    }
    async delete(pageId) {
        await fetch(`${this.apiUrl}/pages/${pageId}`, {
            method: 'DELETE',
            headers: this.headers,
        });
    }
}
