import type { CSSProperties } from 'react';
import { CELL_MAX_PX, ROW_MAX_PX } from '../lib/grid';

/** Opaque CSS custom-property map. Keys include the leading `--`. */
export type VantageTokens = Record<string, string>;

export const DEFAULT_VANTAGE_TOKENS: VantageTokens = {
  '--vantage-cell-max-px': `${CELL_MAX_PX}px`,
  '--vantage-row-max-px': `${ROW_MAX_PX}px`,
  '--vantage-color': '#1f2430',
  '--vantage-font-family': "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  '--vantage-line-height': '1.5',
  '--vantage-font-weight': '400',
};

/** Merge host overrides over library defaults. Host keys win. */
export function mergeVantageTokens(overrides?: VantageTokens): VantageTokens {
  if (!overrides) return { ...DEFAULT_VANTAGE_TOKENS };
  return { ...DEFAULT_VANTAGE_TOKENS, ...overrides };
}

/** Convert a token map into a React inline style object (CSS variables). */
export function tokensToStyle(tokens: VantageTokens): CSSProperties {
  return tokens as CSSProperties;
}

/**
 * Parse a CSS length token to a number of CSS pixels.
 * Accepts bare numbers and values with a `px` suffix. Returns `fallback` otherwise.
 */
export function parsePxToken(value: string | undefined, fallback: number): number {
  if (value == null || value === '') return fallback;
  const trimmed = value.trim();
  const match = /^(-?\d*\.?\d+)(?:px)?$/i.exec(trimmed);
  if (!match) return fallback;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : fallback;
}
