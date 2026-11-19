import { resolve, sep } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { CONTENT_EVENT, CONTENT_FILE } from './src/protocol.ts';

const repo = resolve(import.meta.dirname, '../../..');
// By a computed URL, so the config's bundler leaves the server's tools to Node, which they read their files beside.
const labModule = (): Promise<typeof import('./server/labServer.ts')> =>
  import(pathToFileURL(resolve(import.meta.dirname, 'server/labServer.ts')).href);
/** The tree the lab draws, as `serve.ts --built` names it; the repo's own build by default. */
const built = process.env.SHADER_LAB_BUILT ?? resolve(repo, 'built');

// site/render.mjs imports `./fabric.mjs`, which the showcase's build copies beside it from tools/; the lab draws
// through the source, so the import is pointed at that file.
const siteFabric = (): Plugin => ({
  name: 'site-fabric',
  enforce: 'pre',
  resolveId(source, importer) {
    if (source === './fabric.mjs' && importer?.split('?')[0] === resolve(repo, 'site/render.mjs'))
      return resolve(repo, 'tools/fabric.mjs');
    return undefined;
  },
});

// The built tree, its models.json and the content, served by the dev server only. Content edits compile in Node and
// reach the page as a custom event; see server/labServer.ts.
const labEndpoints = (): Plugin => ({
  name: 'shader-lab-endpoints',
  apply: 'serve',
  configureServer({ middlewares, watcher, ws }) {
    const lab = labModule().then(({ labServer }) => labServer({ built }));
    const models = resolve(repo, 'models') + sep;
    watcher.add(models);
    watcher.on('all', (_event, file) => {
      if (file.startsWith(models) && /\.(jsonnet|libsonnet)$/.test(file))
        void lab.then(({ push }) => push((data) => ws.send({ type: 'custom', event: CONTENT_EVENT, data })));
    });
    middlewares.use((request, response, next) => {
      const pathname = decodeURIComponent(new URL(request.url ?? '', 'http://lab').pathname);
      void lab.then(({ answer }) => answer(pathname, response)).then((answered) => answered || next());
    });
  },
});

// The static build, which the showcase serves as a viewer (site/tools.json), reads the site's own models.json and
// built tree, and the content this writes beside the page, compiled once: a content that does not compile fails the
// build. The page reads it by the URL the dev server answers.
const staticContent = (): Plugin => ({
  name: 'shader-lab-content',
  apply: 'build',
  async generateBundle() {
    const { labContent } = await labModule();
    this.emitFile({ type: 'asset', fileName: CONTENT_FILE, source: JSON.stringify(await labContent()) });
  },
});

export default defineConfig({
  plugins: [siteFabric(), labEndpoints(), staticContent()],
  // Relative, so the build holds in its folder of the site under a Pages project path.
  base: './',
  build: { chunkSizeWarningLimit: 1000 }, // three.js; fine for a debug viewer
  // site/render.mjs lies outside the tools' packages, so three resolves from here and the page has one copy of it.
  resolve: { dedupe: ['three'] },
  server: {
    host: '0.0.0.0',
    port: 5180,
    strictPort: true,
    fs: { allow: [repo] },
    // The Jsonnet twins are written by every content compile; the page reads them from the content endpoint, so vite
    // must never see them change.
    watch: { ignored: ['**/models/**/*.json'] },
  },
});
