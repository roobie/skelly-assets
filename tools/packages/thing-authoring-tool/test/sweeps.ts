// biome-ignore-all lint/style/noProcessEnv: the sweep gate is env-driven (TAT_SWEEPS)
import process from 'node:process';
import { describe } from 'vitest';

// Complete recipe exports run only under TAT_SWEEPS in the manual slow-test workflow.
export const runSweeps = process.env.TAT_SWEEPS === '1';
export const sweepGroup = describe.runIf(runSweeps);
