// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BuilderContext, useBuilderContext, type BuilderContextValue } from './BuilderContext';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useBuilderContext', () => {
  it('throws a helpful error outside the builder', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useBuilderContext())).toThrow(
      'useBuilderContext must be used within VantageBuilder',
    );
  });

  it('returns the provided value', () => {
    const value = { activeBreakpoint: 'mobile' } as BuilderContextValue;
    const { result } = renderHook(() => useBuilderContext(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>
      ),
    });
    expect(result.current).toBe(value);
  });
});
