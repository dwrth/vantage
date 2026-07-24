import { createContext } from 'react';
import type { VantageTokens } from './tokens';

/** null = no provider; consumers fall back to defaults. */
export const VantageThemeContext = createContext<VantageTokens | null>(null);
