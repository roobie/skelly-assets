// The lab draws both kinds as the game patches them: a bark prop and the leaf quad compile in every pass they patch,
// retune in place and survive a walk into the leaves, with no shader error on the page. It needs a whole built tree.
// Usage: node test/browser/lab-smoke.mjs [--site dir]: the dev server over the lab's default tree or the one
// SHADER_LAB_BUILT names, or the static build as a built site serves it (site/build.mjs, its viewers built).
import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createServer } from 'vite';
import { launchBrowser, serveSite } from '../../../../reviewSite.mjs';

const root = new URL('../..', import.meta.url).pathname;
// The prop the lab opens on wears the bark finish; the leaf quad is one of its test pieces.
const BARK_PROP = 'log';
const LEAF_QUAD = 'leaf-quad';

const { values } = parseArgs({ options: { site: { type: 'string' } } });

// The page's URL and how to stop serving it.
const devServer = async () => {
  const server = await createServer({
    root,
    logLevel: 'warn',
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  });
  await server.listen();
  return { page: `http://127.0.0.1:${server.httpServer.address().port}/`, close: () => server.close() };
};
const builtSite = async (site) => {
  const { origin, close } = await serveSite(site, join(site, 'built'));
  return { page: `${origin}/shader-lab/index.html`, close };
};

const server = values.site === undefined ? await devServer() : await builtSite(resolve(values.site));
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${server.page}?model=${BARK_PROP}`);
  await page.waitForFunction(() => window.shaderLab !== undefined);
  await page.evaluate(() => window.shaderLab.ready);
  // A few frames, so every program, the shadow passes' included, has compiled.
  const frames = () => page.evaluate(() => Array.from({ length: 3 }, () => window.shaderLab.draw()));
  await frames();
  assert.deepEqual(await page.evaluate(() => window.shaderLab.problems()), []);

  const worn = await page.evaluate(() => window.shaderLab.worn());
  const bark = worn.find(({ label, kind }) => label.startsWith('voxel:') && kind === 'bark');
  const leaf = worn.find(({ label, kind }) => label.startsWith(`${LEAF_QUAD}:`) && kind === 'leaf');
  assert(bark, `the ${BARK_PROP} wears bark: ${JSON.stringify(worn)}`);
  assert(leaf, `the ${LEAF_QUAD} wears leaves: ${JSON.stringify(worn)}`);
  // The chosen surface has its sliders and the snippet they write, which the static page keeps without live edit.
  const panel = await page.evaluate(() => ({
    sliders: document.querySelectorAll('#look input[type="range"]').length,
    snippet: document.getElementById('snippet').textContent,
  }));
  assert(panel.sliders > 0 && panel.snippet.includes('wear('), `the panel tunes a surface: ${JSON.stringify(panel)}`);

  // A retune of each kind, then the first-person camera inside the quad, then a stage with a torch's shadows.
  await page.evaluate(
    ([barkLabel, leafLabel]) => {
      window.shaderLab.tune(barkLabel, ['furrow', 'spacing'], 0.05);
      window.shaderLab.tune(leafLabel, ['coverage'], 0.6);
      window.shaderLab.camera('first', [0, 0, -2.9], 0, 0);
      window.shaderLab.stage('night');
    },
    [bark.label, leaf.label],
  );
  await frames();
  assert.deepEqual(await page.evaluate(() => window.shaderLab.problems()), []);
  assert.deepEqual(pageErrors, []);
  console.log(`lab smoke: ${bark.label} and ${leaf.label} drew in every pass with no shader error`);
} finally {
  await browser.close();
  await server.close();
}
