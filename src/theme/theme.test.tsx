// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { vantageRootProps } from './applyRoot';
import {
  DEFAULT_VANTAGE_TOKENS,
  mergeVantageTokens,
  parsePxToken,
  tokensToStyle,
  type VantageTokens,
} from './tokens';
import { useVantageTokens } from './useVantageTokens';
import { VantageThemeProvider } from './VantageThemeProvider';

describe('mergeVantageTokens', () => {
  it('returns a copy of the defaults without overrides', () => {
    const merged = mergeVantageTokens();
    expect(merged).toEqual(DEFAULT_VANTAGE_TOKENS);
    expect(merged).not.toBe(DEFAULT_VANTAGE_TOKENS);
    merged['--vantage-color'] = 'red';
    expect(DEFAULT_VANTAGE_TOKENS['--vantage-color']).toBe('#1f2430');
  });

  it('lets host keys win and adds new ones', () => {
    const merged = mergeVantageTokens({ '--vantage-color': '#000', '--host-gap': '4px' });
    expect(merged['--vantage-color']).toBe('#000');
    expect(merged['--host-gap']).toBe('4px');
    expect(merged['--vantage-line-height']).toBe(DEFAULT_VANTAGE_TOKENS['--vantage-line-height']);
  });
});

describe('parsePxToken', () => {
  it.each([
    ['12', 12],
    ['12px', 12],
    ['12PX', 12],
    ['  7.5px ', 7.5],
    ['.5', 0.5],
    ['-3px', -3],
  ])('parses %j as %d', (value, expected) => {
    expect(parsePxToken(value, 99)).toBe(expected);
  });

  it.each([undefined, '', 'auto', '1rem', '10 px', '1e3', 'px'])('falls back for %j', (value) => {
    expect(parsePxToken(value, 99)).toBe(99);
  });
});

describe('tokensToStyle', () => {
  it('passes the custom properties through as inline style', () => {
    const tokens: VantageTokens = { '--a': '1px' };
    expect(tokensToStyle(tokens)).toEqual({ '--a': '1px' });
  });
});

describe('vantageRootProps', () => {
  it('always carries the root class and the token variables', () => {
    const props = vantageRootProps({ '--a': '1px' });
    expect(props.className).toBe('vantage-root');
    expect(props.style).toEqual({ '--a': '1px' });
  });

  it('appends a host class and lets host style win over tokens', () => {
    const props = vantageRootProps({ '--a': '1px', color: 'red' }, 'mine', {
      color: 'blue',
      margin: 4,
    });
    expect(props.className).toBe('vantage-root mine');
    expect(props.style).toEqual({ '--a': '1px', color: 'blue', margin: 4 });
  });
});

describe('VantageThemeProvider and useVantageTokens', () => {
  it('returns the defaults outside a provider', () => {
    const { result } = renderHook(() => useVantageTokens());
    expect(result.current).toEqual(DEFAULT_VANTAGE_TOKENS);
  });

  it('provides defaults when no tokens are passed', () => {
    const { result } = renderHook(() => useVantageTokens(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <VantageThemeProvider>{children}</VantageThemeProvider>
      ),
    });
    expect(result.current).toEqual(DEFAULT_VANTAGE_TOKENS);
  });

  it('merges host tokens over the defaults for descendants', () => {
    const { result } = renderHook(() => useVantageTokens(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <VantageThemeProvider tokens={{ '--vantage-color': '#fff' }}>
          {children}
        </VantageThemeProvider>
      ),
    });
    expect(result.current['--vantage-color']).toBe('#fff');
    expect(result.current['--vantage-font-weight']).toBe('400');
  });

  it('keeps the merged map while the tokens prop is unchanged and updates on change', () => {
    const tokens = { '--vantage-color': '#111' };
    const { result, rerender } = renderHook(() => useVantageTokens(), {
      wrapper: function Wrapper({ children }: { children: ReactNode }) {
        return <VantageThemeProvider tokens={tokens}>{children}</VantageThemeProvider>;
      },
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);

    const next = renderHook(() => useVantageTokens(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <VantageThemeProvider tokens={{ '--vantage-color': '#222' }}>
          {children}
        </VantageThemeProvider>
      ),
    });
    expect(next.result.current['--vantage-color']).toBe('#222');
  });

  it('the nearest provider wins', () => {
    const { result } = renderHook(() => useVantageTokens(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <VantageThemeProvider tokens={{ '--vantage-color': 'outer' }}>
          <VantageThemeProvider tokens={{ '--vantage-color': 'inner' }}>
            {children}
          </VantageThemeProvider>
        </VantageThemeProvider>
      ),
    });
    expect(result.current['--vantage-color']).toBe('inner');
  });
});
