// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { createRef, useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import {
  BuilderContext,
  type BuilderContextValue,
  type SelectionRef,
} from '../context/BuilderContext';
import type { Breakpoint, GridItem, Layout, ResolvedComponentRegistry } from '../types';
import { ItemDataProvider, useItemData, useResolveItemData } from './useItemData';
import { useSelectedItem, useSelection } from './useSelection';

const item = (id: string, extra: Partial<GridItem> = {}): GridItem => ({
  id,
  kind: 'card',
  label: id,
  x: 0,
  y: 0,
  w: 2,
  h: 2,
  ...extra,
});

const layout: Layout = {
  breakpoints: ['desktop', 'mobile'],
  breakpointWidths: {},
  breakpointPreviewWidths: {},
  sections: [
    {
      id: 's',
      columns: 12,
      rows: 4,
      items: [
        item('a', { data: { title: 'A', size: 1 }, ref: { type: 'post', id: '1' } }),
        item('b', { kind: 'unregistered' }),
      ],
    },
  ],
};

const components: ResolvedComponentRegistry = {
  card: { component: () => null, defaults: { w: 2, h: 2 } },
};

type Init = {
  selection?: SelectionRef | null;
  selected?: SelectionRef[];
  activeBreakpoint?: Breakpoint;
};

function wrapperFor(init: Init, resolve?: (item: GridItem) => unknown) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const [selection, setSelection] = useState<SelectionRef | null>(init.selection ?? null);
    const [selectedItems, setSelectedItems] = useState<SelectionRef[]>(init.selected ?? []);
    const value = {
      layout,
      components,
      activeBreakpoint: init.activeBreakpoint ?? 'desktop',
      selection,
      setSelection,
      selectedItems,
      setSelectedItems,
      minSizesRef: createRef(),
    } as unknown as BuilderContextValue;
    const tree = <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
    return resolve ? <ItemDataProvider resolveItemData={resolve}>{tree}</ItemDataProvider> : tree;
  };
}

const ref = (itemId: string): SelectionRef => ({ sectionId: 's', itemId });

describe('useSelection', () => {
  it('exposes the primary selection and clears it', () => {
    const { result } = renderHook(() => useSelection(), {
      wrapper: wrapperFor({ selection: ref('a'), selected: [ref('a')] }),
    });
    expect(result.current.selection).toEqual(ref('a'));
    act(() => result.current.clearSelection());
    expect(result.current.selection).toBeNull();
  });

  it('isSelected only matches the primary block', () => {
    const { result } = renderHook(() => useSelection(), {
      wrapper: wrapperFor({ selection: ref('b'), selected: [ref('a'), ref('b')] }),
    });
    expect(result.current.isSelected('s', 'b')).toBe(true);
    expect(result.current.isSelected('s', 'a')).toBe(false);
    expect(result.current.isSelected('other', 'b')).toBe(false);
  });

  it('isSelected is false without a selection', () => {
    const { result } = renderHook(() => useSelection(), { wrapper: wrapperFor({}) });
    expect(result.current.isSelected('s', 'a')).toBe(false);
  });

  it('isInSelection matches every selected block', () => {
    const { result } = renderHook(() => useSelection(), {
      wrapper: wrapperFor({ selection: ref('b'), selected: [ref('a'), ref('b')] }),
    });
    expect(result.current.isInSelection('s', 'a')).toBe(true);
    expect(result.current.isInSelection('s', 'b')).toBe(true);
    expect(result.current.isInSelection('s', 'c')).toBe(false);
    expect(result.current.isInSelection('t', 'a')).toBe(false);
  });

  it('toggleSelected adds a block and removes it again', () => {
    const { result } = renderHook(() => useSelection(), {
      wrapper: wrapperFor({ selection: ref('a'), selected: [ref('a')] }),
    });
    act(() => result.current.toggleSelected(ref('b')));
    expect(result.current.selectedItems).toEqual([ref('a'), ref('b')]);
    act(() => result.current.toggleSelected(ref('a')));
    expect(result.current.selectedItems).toEqual([ref('b')]);
  });

  it('setSelectedItems replaces the whole selection', () => {
    const { result } = renderHook(() => useSelection(), { wrapper: wrapperFor({}) });
    act(() => result.current.setSelectedItems([ref('a'), ref('b')]));
    expect(result.current.selectedItems).toEqual([ref('a'), ref('b')]);
    act(() => result.current.setSelection(ref('a')));
    expect(result.current.selection).toEqual(ref('a'));
  });
});

describe('useSelectedItem', () => {
  it('is null without a selection', () => {
    const { result } = renderHook(() => useSelectedItem(), { wrapper: wrapperFor({}) });
    expect(result.current).toBeNull();
  });

  it('is null when the section is gone', () => {
    const { result } = renderHook(() => useSelectedItem(), {
      wrapper: wrapperFor({ selection: { sectionId: 'gone', itemId: 'a' } }),
    });
    expect(result.current).toBeNull();
  });

  it('is null when the item is gone', () => {
    const { result } = renderHook(() => useSelectedItem(), {
      wrapper: wrapperFor({ selection: ref('gone') }),
    });
    expect(result.current).toBeNull();
  });

  it('returns section, item, data and descriptor of the selection', () => {
    const { result } = renderHook(() => useSelectedItem(), {
      wrapper: wrapperFor({ selection: ref('a') }),
    });
    expect(result.current?.section.id).toBe('s');
    expect(result.current?.item.id).toBe('a');
    expect(result.current?.resolvedData).toEqual({ title: 'A', size: 1 });
    expect(result.current?.descriptor).toBe(components.card);
    expect(result.current?.activeBreakpoint).toBe('desktop');
  });

  it('has no descriptor for an unregistered kind', () => {
    const { result } = renderHook(() => useSelectedItem(), {
      wrapper: wrapperFor({ selection: ref('b') }),
    });
    expect(result.current?.descriptor).toBeUndefined();
    expect(result.current?.resolvedData).toBeUndefined();
  });

  it('merges entity data from the ItemDataProvider under the layout data', () => {
    const { result } = renderHook(() => useSelectedItem(), {
      wrapper: wrapperFor({ selection: ref('a') }, (it) => ({ title: 'Entity', body: it.id })),
    });
    expect(result.current?.resolvedData).toEqual({ title: 'A', size: 1, body: 'a' });
  });
});

describe('useItemData', () => {
  const a = item('a');

  it('is undefined without a provider', () => {
    const { result } = renderHook(() => useItemData(a));
    expect(result.current).toBeUndefined();
  });

  it('returns what the provider resolves for the item', () => {
    const { result } = renderHook(() => useItemData(a), {
      wrapper: ({ children }) => (
        <ItemDataProvider resolveItemData={(it) => ({ for: it.id })}>{children}</ItemDataProvider>
      ),
    });
    expect(result.current).toEqual({ for: 'a' });
  });

  it('useResolveItemData is null without a provider and the resolver within one', () => {
    const none = renderHook(() => useResolveItemData());
    expect(none.result.current).toBeNull();
    const resolve = () => 1;
    const some = renderHook(() => useResolveItemData(), {
      wrapper: ({ children }) => (
        <ItemDataProvider resolveItemData={resolve}>{children}</ItemDataProvider>
      ),
    });
    expect(some.result.current).toBe(resolve);
  });
});
