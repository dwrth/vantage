import { DEFAULT_VANTAGE_TOKENS, type VantageTokens } from 'vantage';

export const DEMO_TOKEN_DEFAULTS: VantageTokens = {
  '--vantage-color': 'var(--color-base-content)',
  '--vantage-kind-accent': 'var(--color-primary)',
  '--vantage-kind-accent-fg': 'var(--color-primary-content)',
  '--vantage-cell-max-px': DEFAULT_VANTAGE_TOKENS['--vantage-cell-max-px'],
  '--vantage-row-max-px': DEFAULT_VANTAGE_TOKENS['--vantage-row-max-px'],
};
