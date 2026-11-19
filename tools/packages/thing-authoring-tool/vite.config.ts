import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizePath, type Plugin, type WebSocketClient } from 'vite';
import { defineConfig } from 'vitest/config';
import { LIVE_ROW, LIVE_VIEW, parseView, type RowMessage } from './src/live.ts';

// Manual sweeps have no per-test timer; their complete export is intentionally exhaustive.
const sweepTimeout = process.env.TAT_SWEEPS === '1' ? { testTimeout: 0 } : {};

const tools = fileURLToPath(new URL('../..', import.meta.url));
// By computed URLs, so the config's bundler leaves the server's tools to Node, which they read their files beside.
const serverModule = <Module>(name: string): Promise<Module> =>
  import(pathToFileURL(resolve(import.meta.dirname, 'server', name)).href);

// Every Jsonnet file a row can import: the models, TAT's and the other packages' own, and the shared library.
const sourceFolders = [resolve(tools, '..', 'models'), resolve(tools, 'packages'), resolve(tools, 'jsonnet')];
const catalogueFile = normalizePath(resolve(import.meta.dirname, 'items.json'));
const recipeTwin = normalizePath(resolve(tools, '..', 'models', 'recipes')) + '/';

// The page draws the row it views from that row's own evaluated Jsonnet, so a saved source costs one row's evaluation
// rather than the twins' whole compile; see server/liveRows.ts and src/main.ts. The twins, which a test run or a build
// rewrites, are the list the page started from, so their changes must not reload it.
const liveRows = (): Plugin => ({
  name: 'thing-live-rows',
  apply: 'serve',
  handleHotUpdate: ({ file }) => (file === catalogueFile || file.startsWith(recipeTwin) ? [] : undefined),
  async configureServer({ config, watcher, ws }) {
    const [{ evaluateRow }, { liveRows: create }] = await Promise.all([
      serverModule<typeof import('./server/evaluateRow.ts')>('evaluateRow.ts'),
      serverModule<typeof import('./server/liveRows.ts')>('liveRows.ts'),
    ]);
    const rows = create<WebSocketClient>(
      async (view) => {
        const result = await evaluateRow(view);
        if ('error' in result) config.logger.error(`Jsonnet did not evaluate ${view.item}:\n${result.error}`);
        return result;
      },
      (page, view, result) =>
        page.send({ type: 'custom', event: LIVE_ROW, data: { view, result } satisfies RowMessage }),
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

// The catalogue is tens of megabytes. Vite's JSON transform serves it with a source map holding all of it again, which
// Firefox refuses to load; as one JSON.parse call it carries none.
const catalogueModule = (): Plugin => ({
  name: 'thing-catalogue-module',
  apply: 'serve',
  enforce: 'pre',
  load(id) {
    if (id !== catalogueFile) return null;
    const json = JSON.stringify(JSON.stringify(JSON.parse(readFileSync(catalogueFile, 'utf8'))));
    return { code: `export default JSON.parse(${json});`, map: { mappings: '' }, moduleType: 'js' };
  },
});

export default defineConfig(({ mode }) => ({
  base: './',
  // Tests run a vite server of their own, which must not watch the models or swap the catalogue's module.
  plugins: mode === 'test' ? [] : [catalogueModule(), liveRows()],
  server: { fs: { allow: [tools] } },
  test: sweepTimeout,
}));
