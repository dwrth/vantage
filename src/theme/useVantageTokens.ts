import { useContext } from 'react';
import { VantageThemeContext } from './VantageThemeContext';
import { mergeVantageTokens, type VantageTokens } from './tokens';

/**
 * Merged token map (defaults + optional provider overrides).
 * Safe outside a provider — returns library defaults.
 */
export function useVantageTokens(): VantageTokens {
  const ctx = useContext(VantageThemeContext);
  return ctx ?? mergeVantageTokens();
}
