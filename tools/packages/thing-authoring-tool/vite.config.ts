import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Manual sweeps have no per-test timer; their complete export is intentionally exhaustive.
// biome-ignore lint/style/noProcessEnv: the sweep gate is env-driven; see test/sweeps.ts.
const sweepTimeout = process.env.TAT_SWEEPS === '1' ? { testTimeout: 0 } : {};

export default defineConfig({
  base: './',
  server: { fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] } },
  test: sweepTimeout,
});
