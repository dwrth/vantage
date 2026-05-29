import { useMemo } from 'react';
import { resolveRenderer } from '../lib/registry';
import type { GridItem, ResolvedComponentRegistry } from '../types';

export { resolveRenderer } from '../lib/registry';
export type { ItemRendererProps } from '../types';

export function useItemRenderer(components: ResolvedComponentRegistry, item: GridItem) {
  return useMemo(() => resolveRenderer(components, item), [components, item]);
}
