import { resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { LIVE_EVENT, LIVE_READY, type LiveStatus } from './src/live.ts';

// Manual sweeps have no per-test timer; their complete export is intentionally exhaustive.
const sweepTimeout = process.env.TAT_SWEEPS === '1' ? { testTimeout: 0 } : {};

const tools = fileURLToPath(new URL('../..', import.meta.url));
// By a computed URL, so the config's bundler leaves sources.mjs to Node, which it reads its files beside.
const sourcesModule = (): Promise<typeof import('./server/liveSources.ts')> =>
  import(pathToFileURL(resolve(import.meta.dirname, 'server/liveSources.ts')).href);

// Every Jsonnet file a twin can import: the models, TAT's and the other packages' own, and the shared library.
const sourceFolders = [resolve(tools, '..', 'models'), resolve(tools, 'packages'), resolve(tools, 'jsonnet')];

// A saved Jsonnet source recompiles the twins, which vite then sees change and hot-updates; see src/main.ts.
const liveSources = (): Plugin => ({
  name: 'thing-live-sources',
  apply: 'serve',
  configureServer({ config, watcher, ws }) {
    let status: LiveStatus = {};
    const queue = sourcesModule().then(({ liveSources: create }) =>
      create((settled) => {
        status = settled;
        if (settled.error !== undefined) config.logger.error(`Jsonnet did not compile:\n${settled.error}`);
        ws.send({ type: 'custom', event: LIVE_EVENT, data: status });
      }),
    );
    watcher.add(sourceFolders);
    watcher.on('all', (_event, file) => {
      if (/\.(jsonnet|libsonnet)$/.test(file) && sourceFolders.some((folder) => file.startsWith(folder + sep)))
        void queue.then(({ request }) => request());
    });
    // A tab opened or reloaded during a failure has missed its event.
    ws.on(LIVE_READY, (_data, client) => client.send({ type: 'custom', event: LIVE_EVENT, data: status }));
  },
});

export default defineConfig({
  base: './',
  plugins: [liveSources()],
  server: { fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] } },
  test: sweepTimeout,
});
