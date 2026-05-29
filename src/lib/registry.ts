import type { FC } from 'react';
import type {
  ComponentRegistry,
  GridItem,
  ItemRendererProps,
  KindDescriptor,
  KindEntry,
  ResolvedComponentRegistry,
  ResolvedKindDescriptor,
} from '../types';
import { UnknownKind } from '../components/UnknownKind';

const FALLBACK_DEFAULTS = { w: 3, h: 2 } as const;

const warnedKinds = new Set<string>();

export function defineKind<TData>(descriptor: KindDescriptor<TData>): KindDescriptor<TData> {
  return descriptor;
}

export function isKindDescriptor(entry: KindEntry): entry is KindDescriptor {
  return typeof entry === 'object' && entry !== null && 'component' in entry;
}

export function resolveDescriptor(entry: KindEntry): ResolvedKindDescriptor {
  if (isKindDescriptor(entry)) {
    return entry;
  }
  return {
    component: entry as FC<ItemRendererProps>,
    defaults: { ...FALLBACK_DEFAULTS },
  };
}

export function resolveRegistry(registry: ComponentRegistry): ResolvedComponentRegistry {
  const resolved: ResolvedComponentRegistry = {};
  for (const [kind, entry] of Object.entries(registry)) {
    resolved[kind] = resolveDescriptor(entry);
  }
  return resolved;
}

export function resolveRenderer(
  registry: ResolvedComponentRegistry,
  item: GridItem,
): FC<ItemRendererProps> {
  const descriptor = registry[item.kind];
  if (!descriptor) {
    if (!warnedKinds.has(item.kind)) {
      warnedKinds.add(item.kind);
      console.warn(`[vantage] No component registered for kind "${item.kind}".`);
    }
    return UnknownKind;
  }
  return descriptor.component as FC<ItemRendererProps>;
}

export function resolveDescriptorForKind(
  registry: ResolvedComponentRegistry,
  kind: string,
): ResolvedKindDescriptor | undefined {
  return registry[kind];
}
