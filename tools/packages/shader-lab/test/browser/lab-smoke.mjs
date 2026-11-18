// The lab draws both kinds as the game patches them: a bark prop and the leaf quad compile in every pass they patch,
// retune in place and survive a walk into the leaves, with no shader error on the page. It needs a whole built tree,
// the lab's default or the one SHADER_LAB_BUILT names.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { launchBrowser } from '../../../../reviewSite.mjs';

const root = new URL('../..', import.meta.url).pathname;
// The prop the lab opens on wears the bark finish; the leaf quad is one of its test pieces.
const BARK_PROP = 'log';
const LEAF_QUAD = 'leaf-quad';

const server = await createServer({
  root,
  logLevel: 'warn',
  server: { host: '127.0.0.1', port: 0, strictPort: false },
});
await server.listen();
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?model=${BARK_PROP}`);
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
