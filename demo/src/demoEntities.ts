import type { ImageData } from './blocks/image';

/** Demo CMS/entity store keyed by `GridItem.ref`. */
export const DEMO_ENTITIES: Record<string, unknown> = {
  'entity-hero-visual': {
    content: 'https://picsum.photos/seed/vantage-hero-panel/900/1200',
    label: 'Product surface',
    objectFit: 'cover',
    objectPositionX: 50,
    objectPositionY: 50,
    cropScale: 1,
  } satisfies ImageData,
};

export const ENTITIES_STORAGE_KEY = 'vantage.entities.demo.v1';

export function loadStoredEntities(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(ENTITIES_STORAGE_KEY);
    if (!raw) return { ...DEMO_ENTITIES };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...DEMO_ENTITIES };
    }
    return { ...DEMO_ENTITIES, ...(parsed as Record<string, unknown>) };
  } catch {
    return { ...DEMO_ENTITIES };
  }
}
