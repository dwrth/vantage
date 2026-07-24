import { useMemo, type ReactNode } from 'react';
import { VantageThemeContext } from './VantageThemeContext';
import { mergeVantageTokens, type VantageTokens } from './tokens';

export type VantageThemeProviderProps = {
  tokens?: VantageTokens;
  children: ReactNode;
};

/**
 * Host override path for Vantage CSS tokens. Context-only — surfaces apply
 * vars on their own `.vantage-root` elements.
 */
export function VantageThemeProvider({ tokens, children }: VantageThemeProviderProps) {
  const merged = useMemo(() => mergeVantageTokens(tokens), [tokens]);
  return <VantageThemeContext.Provider value={merged}>{children}</VantageThemeContext.Provider>;
}
