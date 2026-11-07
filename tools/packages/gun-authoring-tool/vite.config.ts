import process from 'node:process';
import { defineConfig } from 'vitest/config';
import { TEST_POOL } from '../../testPool.ts';

// The manual sweep run has no per-test timer: its work is bounded, so only the workflow's job timeout caps a hang.
// biome-ignore lint/style/noProcessEnv: the sweep gate is env-driven; see test/sweeps.ts.
const sweepTimeout = process.env.GUNGEN_SWEEPS === '1' ? { testTimeout: 0 } : {};

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1000 }, // three.js; fine for a debug viewer
  test: {
    ...TEST_POOL,
    include: ['test/**/*.test.ts'],
    ...sweepTimeout,
  },
});
