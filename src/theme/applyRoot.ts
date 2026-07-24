import type { CSSProperties } from 'react';
import { tokensToStyle, type VantageTokens } from './tokens';

export type VantageRootProps = {
  className: string;
  style: CSSProperties;
};

/** Shared `.vantage-root` className + inline CSS vars for Builder / Preview / Inspector. */
export function vantageRootProps(
  tokens: VantageTokens,
  className?: string,
  style?: CSSProperties,
): VantageRootProps {
  return {
    className: ['vantage-root', className].filter(Boolean).join(' '),
    style: { ...tokensToStyle(tokens), ...style },
  };
}
