// Storage adapter interface - allows plugging in different storage backends

import { PageData } from '../core/types';

export interface StorageAdapter {
  save(pageId: string, data: PageData): Promise<void> | void;
  load(pageId: string): Promise<PageData | null> | PageData | null;
  delete?(pageId: string): Promise<void> | void;
}

// Default localStorage adapter
export class LocalStorageAdapter implements StorageAdapter {
  constructor(private keyPrefix: string = 'page-builder-') {}

  save(pageId: string, data: PageData): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(
        `${this.keyPrefix}${pageId}`,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Failed to save page data:', error);
    }
  }

  load(pageId: string): PageData | null {
    try {
      if (typeof window === 'undefined') return null;
      const stored = localStorage.getItem(`${this.keyPrefix}${pageId}`);
      if (!stored) return null;
      return JSON.parse(stored) as PageData;
    } catch (error) {
      console.error('Failed to load page data:', error);
      return null;
    }
  }

  delete(pageId: string): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(`${this.keyPrefix}${pageId}`);
    } catch (error) {
      console.error('Failed to delete page data:', error);
    }
  }
}

// API adapter example
export class ApiStorageAdapter implements StorageAdapter {
  constructor(private apiUrl: string, private headers?: Record<string, string>) {}

  async save(pageId: string, data: PageData): Promise<void> {
    await fetch(`${this.apiUrl}/pages/${pageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(data),
    });
  }

  async load(pageId: string): Promise<PageData | null> {
    const response = await fetch(`${this.apiUrl}/pages/${pageId}`, {
      headers: this.headers,
    });
    if (!response.ok) return null;
    return response.json();
  }

  async delete(pageId: string): Promise<void> {
    await fetch(`${this.apiUrl}/pages/${pageId}`, {
      method: 'DELETE',
      headers: this.headers,
    });
  }
}
