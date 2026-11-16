import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Manual sweeps have no per-test timer; their complete export is intentionally exhaustive.
const sweepTimeout = process.env.TAT_SWEEPS === '1' ? { testTimeout: 0 } : {};

export default defineConfig({
  base: './',
  server: { fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] } },
  test: sweepTimeout,
});
