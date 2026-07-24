import type { FC } from 'react';
import type {
  ComponentRegistry,
  EditRendererProps,
  GridItem,
  KindDescriptor,
  PreviewRendererProps,
  ResolvedComponentRegistry,
  ResolvedKindDescriptor,
} from '../types';
import { UnknownKind } from '../components/UnknownKind';

const warnedKinds = new Set<string>();

export type RenderSurface = 'edit' | 'preview';

export function defineKind<TData>(descriptor: KindDescriptor<TData>): KindDescriptor<TData> {
  return descriptor;
}

export function resolveRegistry(registry: ComponentRegistry): ResolvedComponentRegistry {
  return { ...registry };
}

function lookupDescriptor(
  registry: ResolvedComponentRegistry,
  kind: string,
): ResolvedKindDescriptor | undefined {
  const descriptor = registry[kind];
  if (!descriptor && !warnedKinds.has(kind)) {
    warnedKinds.add(kind);
    console.warn(`[vantage] No component registered for kind "${kind}".`);
  }
  return descriptor;
}

export function resolveRenderer(
  registry: ResolvedComponentRegistry,
  item: GridItem,
  surface: 'preview',
): FC<PreviewRendererProps>;
export function resolveRenderer(
  registry: ResolvedComponentRegistry,
  item: GridItem,
  surface: 'edit',
): FC<EditRendererProps>;
export function resolveRenderer(
  registry: ResolvedComponentRegistry,
  item: GridItem,
  surface: RenderSurface,
): FC<PreviewRendererProps> | FC<EditRendererProps> {
  const descriptor = lookupDescriptor(registry, item.kind);
  if (!descriptor) {
    return UnknownKind;
  }
  if (surface === 'preview') {
    return descriptor.component;
  }
  return (descriptor.editComponent ?? descriptor.component) as FC<EditRendererProps>;
}

export function resolveDescriptorForKind(
  registry: ResolvedComponentRegistry,
  kind: string,
): ResolvedKindDescriptor | undefined {
  return registry[kind];
}
