import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts so tests skip the library build plugins (dts).
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
