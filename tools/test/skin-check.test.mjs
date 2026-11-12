// The camera skin check (site/skin.mjs) drawn in headless Chromium, so it runs only on demand: ASSETS_SWEEPS=1, as the
// manual slow-tests workflow sets it. The page is the site's own modules served from source, with three.js from the
// CDN the site's import maps name.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { after, before, test } from 'node:test';
import { launchBrowser, serveSite } from '../reviewSite.mjs';

const skip = process.env.ASSETS_SWEEPS ? false : 'draws in a browser: set ASSETS_SWEEPS=1';
const site = resolve(import.meta.dirname, '../../site');
const importMap = readFileSync(join(site, 'pose.html'), 'utf8').match(/<script type="importmap">[\s\S]*?<\/script>/)[0];

let server;
let browser;
let page;
before(async () => {
  if (skip) return;
  server = await serveSite(site, site);
  browser = await launchBrowser();
  page = await browser.newPage();
  await page.route(`${server.origin}/skin-check.html`, (route) => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head>${importMap}</head><body></body></html>` }));
  await page.goto(`${server.origin}/skin-check.html`);
});
after(async () => {
  await browser?.close();
  server?.close();
});

// The covered skin showing in each review view of an arm in a sleeve `width` wide; the arm is 0.1 m thick, as in
// tools/test/clearance.test.mjs.
const showing = (width) => page.evaluate(async (sleeveWidth) => {
  const THREE = await import('three');
  const { coveredSurface } = await import('/clearance.mjs');
  const { addCoveredSkin, skinCheck } = await import('/skin.mjs');
  const boxMesh = ([w, h, d], centre) => {
    const positions = [];
    for (const z of [-d / 2, d / 2]) for (const y of [-h / 2, h / 2]) for (const x of [-w / 2, w / 2]) positions.push(x + centre[0], y + centre[1], z + centre[2]);
    const indices = [0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, 0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7, 0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5];
    return { positions, indices };
  };
  const rig = { bones: [{ id: 'arm', head: [0, 0, 0], tail: [0, -0.3, 0] }] };
  const rest = { body: [{ bone: 'arm', mesh: boxMesh([0.1, 0.3, 0.1], [0, -0.15, 0]) }], pieces: [{ piece: 'sleeve', bone: 'arm', mesh: boxMesh([sleeveWidth, 0.2, sleeveWidth], [0, -0.15, 0]) }] };
  const joint = new THREE.Group();
  for (const { mesh } of [...rest.body, ...rest.pieces]) {
    const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3)).setIndex(mesh.indices);
    joint.add(new THREE.Mesh(geometry));
  }
  addCoveredSkin({ bones: new Map([['arm', { joint }]]) }, coveredSurface(rig, rest, { whole: true }));
  return skinCheck(joint, 128, 'review').views.map(({ showing }) => showing);
}, width);

test('an arm a sleeve encloses shows no covered skin from any view', { skip }, async () => {
  assert.ok((await showing(0.12)).every((pixels) => pixels === 0));
});

test('an arm poking out of a sleeve too narrow for it shows covered skin', { skip }, async () => {
  assert.ok((await showing(0.099)).some((pixels) => pixels > 0));
});

test('an arm whose faces lie on its sleeve\'s shows covered skin, as the tie draws', { skip }, async () => {
  assert.ok((await showing(0.1)).some((pixels) => pixels > 0));
});
