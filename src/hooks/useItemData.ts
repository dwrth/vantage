import { createContext, createElement, useContext, type ReactNode } from 'react';
import type { GridItem, ResolveItemData } from '../types';

const ItemDataContext = createContext<ResolveItemData | null>(null);

export type ItemDataProviderProps = {
  resolveItemData: ResolveItemData;
  children: ReactNode;
};

export function ItemDataProvider({ resolveItemData, children }: ItemDataProviderProps) {
  return createElement(ItemDataContext.Provider, { value: resolveItemData }, children);
}

/** Entity payload from nearest `ItemDataProvider`, or `undefined` when none. */
export function useItemData(item: GridItem): unknown | undefined {
  const resolve = useContext(ItemDataContext);
  if (!resolve) return undefined;
  return resolve(item);
}

export function useResolveItemData(): ResolveItemData | null {
  return useContext(ItemDataContext);
}
