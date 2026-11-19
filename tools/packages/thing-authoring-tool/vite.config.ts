import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Plugin, WebSocketClient } from 'vite';
import { defineConfig } from 'vitest/config';
import { LIVE_ROW, LIVE_VIEW, type RowMessage, type RowView } from './src/live.ts';

// Manual sweeps have no per-test timer; their complete export is intentionally exhaustive.
const sweepTimeout = process.env.TAT_SWEEPS === '1' ? { testTimeout: 0 } : {};

const tools = fileURLToPath(new URL('../..', import.meta.url));
// By computed URLs, so the config's bundler leaves the server's tools to Node, which they read their files beside.
const serverModule = <Module>(name: string): Promise<Module> =>
  import(pathToFileURL(resolve(import.meta.dirname, 'server', name)).href);

// Every Jsonnet file a row can import: the models, TAT's and the other packages' own, and the shared library.
const sourceFolders = [resolve(tools, '..', 'models'), resolve(tools, 'packages'), resolve(tools, 'jsonnet')];

// The page draws the row it views from that row's own evaluated Jsonnet, so a saved source costs one row's evaluation
// rather than the twins' whole compile; see server/liveRows.ts and src/main.ts.
const liveRows = (): Plugin => ({
  name: 'thing-live-rows',
  apply: 'serve',
  async configureServer({ config, watcher, ws }) {
    const [{ evaluateRow }, { liveRows: create }] = await Promise.all([
      serverModule<typeof import('./server/evaluateRow.ts')>('evaluateRow.ts'),
      serverModule<typeof import('./server/liveRows.ts')>('liveRows.ts'),
    ]);
    const rows = create<WebSocketClient>(evaluateRow, (page, view, result) => {
      if ('error' in result) config.logger.error(`Jsonnet did not evaluate ${view.item}:\n${result.error}`);
      page.send({ type: 'custom', event: LIVE_ROW, data: { view, result } satisfies RowMessage });
    });
    const known = new WeakSet<WebSocketClient>();
    ws.on(LIVE_VIEW, (view: RowView, page) => {
      if (!known.has(page)) {
        known.add(page);
        page.socket.once('close', () => rows.forget(page));
      }
      rows.view(page, view);
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
    const file = id.split('?')[0]!;
    if (!file.endsWith(`${sep}items.json`)) return null;
    const json = JSON.stringify(JSON.stringify(JSON.parse(readFileSync(file, 'utf8'))));
    return { code: `export default JSON.parse(${json});`, map: { mappings: '' }, moduleType: 'js' };
  },
});

export default defineConfig({
  base: './',
  plugins: [catalogueModule(), liveRows()],
  server: { fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] } },
  test: sweepTimeout,
});
