// The Jsonnet compile behind a running viewer, in Node. The twins it writes reach the page through vite's module graph,
// so only the verdict travels as data: a failed compile must not leave the page drawing a stale model unannounced.
import { refreshJsonnetSources } from '../../../sources.mjs';
import type { LiveStatus } from '../src/live.ts';

// One save can touch several files, and an editor may write twice, so a burst compiles once.
const QUIET_MS = 150;

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Compiles the twins after `request` goes quiet, one compile at a time; a request during a compile earns one more. */
export const liveSources = (settled: (status: LiveStatus) => void) => {
  let timer: NodeJS.Timeout | undefined;
  let running = false;
  let again = false;

  const run = async () => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      await refreshJsonnetSources();
      settled({});
    } catch (error) {
      settled({ error: message(error) });
    }
    running = false;
    if (again) {
      again = false;
      void run();
    }
  };

  const request = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void run(), QUIET_MS);
  };
  return { request };
};
