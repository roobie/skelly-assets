import { resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizePath, type Plugin, type WebSocketClient } from 'vite';
import { defineConfig } from 'vitest/config';
import { LIVE_ROW, LIVE_VIEW, parseView } from './src/live.ts';

// Manual sweeps have no per-test timer; their complete export is intentionally exhaustive.
const sweepTimeout = process.env.TAT_SWEEPS === '1' ? { testTimeout: 0 } : {};

const tools = fileURLToPath(new URL('../..', import.meta.url));
// By computed URLs, so the config's bundler leaves the server's tools to Node, which they read their files beside.
const serverModule = <Module>(name: string): Promise<Module> =>
  import(pathToFileURL(resolve(import.meta.dirname, 'server', name)).href);

// Every Jsonnet file a row can import: the models, TAT's and the other packages' own, and the shared library.
const sourceFolders = [resolve(tools, '..', 'models'), resolve(tools, 'packages'), resolve(tools, 'jsonnet')];
// What a refresh writes: the catalogue's rows and manifest, and the recipes' twins.
const generated = [
  resolve(import.meta.dirname, 'items/**'),
  resolve(import.meta.dirname, 'item-ids.json'),
  resolve(tools, '..', 'models', 'recipes', '*.json'),
].map(normalizePath);

// The page draws the row it views from that row's own evaluated Jsonnet, so a saved source costs one row's evaluation
// rather than the twins' whole compile; see server/liveRows.ts and src/main.ts. What a test run or a build rewrites is
// the list the page started from, so the server does not watch it: a file added or deleted there reloads the page
// through the glob over the rows, however a hot-update hook answers.
const liveRows = (): Plugin => ({
  name: 'thing-live-rows',
  apply: 'serve',
  async configureServer({ config, watcher, ws }) {
    const [{ evaluateHalf }, { liveRows: create }] = await Promise.all([
      serverModule<typeof import('./server/evaluateRow.ts')>('evaluateRow.ts'),
      serverModule<typeof import('./server/liveRows.ts')>('liveRows.ts'),
    ]);
    const rows = create<WebSocketClient>(
      async (half, id) => {
        const result = await evaluateHalf(half, id);
        if ('error' in result) config.logger.error(`Jsonnet did not evaluate ${half} ${id}:\n${result.error}`);
        return result;
      },
      (page, message) => page.send({ type: 'custom', event: LIVE_ROW, data: message }),
    );
    const known = new WeakSet<WebSocketClient>();
    ws.on(LIVE_VIEW, (data: unknown, page) => {
      try {
        const view = parseView(data);
        if (!known.has(page)) {
          known.add(page);
          page.socket.once('close', () => rows.forget(page));
        }
        rows.view(page, view);
      } catch (error) {
        config.logger.error(`Ignored a malformed ${LIVE_VIEW}: ${error instanceof Error ? error.message : error}`);
      }
    });
    watcher.add(sourceFolders);
    watcher.on('all', (_event, file) => {
      if (/\.(jsonnet|libsonnet)$/.test(file) && sourceFolders.some((folder) => file.startsWith(folder + sep)))
        rows.changed();
    });
  },
});

export default defineConfig(({ mode }) => ({
  base: './',
  // Tests run a vite server of their own, which must not watch the models.
  plugins: mode === 'test' ? [] : [liveRows()],
  server: { fs: { allow: [tools] }, watch: { ignored: generated } },
  test: sweepTimeout,
}));
