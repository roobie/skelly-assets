// Draws the doll, bare or dressed, in poses as tiles of four views, so a pose file, a fixture or a wearable's fit in a
// pose can be reviewed without opening the page. The drawing is the posing page's own (site/pose.mjs): this builds the
// showcase from the tree and drives the page in headless Chromium.
// Usage: node tools/pose-sheet.mjs [--built built] [--out look/poses] [--size 384] [--views review] [--probe]
//   [--wear id,id] [--screenshot] <pose> [<pose> ...]
// A pose is a fixture's name (models/poses) or the path of a pose file. `--wear` dresses the doll in those wearables,
// `--probe` runs the clearance probe and marks its findings, `--screenshot` also saves the page with its controls.
// Writes <out>/<pose>[-<wear joined by +>].png and, with --screenshot, <out>/ui-<pose>[-<wear>].png; prints one
// line per pose with the limits that held, the reach residuals and the clearance findings.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { buildSite, launchBrowser, openPage, serveSite } from './reviewSite.mjs';

const repo = resolve(import.meta.dirname, '..');
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    built: { type: 'string', default: join(repo, 'built') },
    out: { type: 'string', default: join(repo, 'look/poses') },
    size: { type: 'string', default: '384' },
    views: { type: 'string', default: 'review' },
    probe: { type: 'boolean', default: false },
    wear: { type: 'string', default: '' },
    screenshot: { type: 'boolean', default: false },
  },
});
if (positionals.length === 0) {
  console.error('pose-sheet: name a pose fixture or a pose file');
  process.exit(2);
}
const built = resolve(values.built);
const out = resolve(values.out);
const wear = values.wear.split(',').filter(Boolean);
const size = Number(values.size);
const UI_VIEWPORT = { width: 1400, height: 900 };

// A fixture by name, or a pose file read here so the page need not reach outside the site.
const poses = positionals.map((given) => (given.endsWith('.json')
  ? { name: basename(given, '.json'), pose: JSON.parse(readFileSync(resolve(given), 'utf8')) }
  : { name: given, pose: given }));
const fileName = (prefix, name) => `${prefix}${name}${wear.length > 0 ? `-${wear.join('+')}` : ''}.png`;
const writePng = (path, dataUrl) => writeFileSync(path, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));

const list = (angles) => angles.map((a) => a.toFixed(1)).join('/');
const countBy = (items, key) => Object.entries(Object.groupBy(items, (item) => item[key])).map(([id, some]) => `${id} ${some.length}`).join(', ');
const describe = ({ report, clearance }) => [
  report.clamped.length === 0 ? 'no limits held' : `held ${report.clamped.map(({ bone, asked, held }) => `${bone} ${list(asked)}->${list(held)}`).join(', ')}`,
  ...Object.entries(report.residuals).map(([id, left]) => `${id} reach residual ${(left * 1000).toFixed(3)} mm`),
  ...(clearance ? [`clearance ${clearance.pokes.length} pokes (${countBy(clearance.pokes, 'bone')}) ${clearance.flush.length} flush (${countBy(clearance.flush, 'bone')}) ${clearance.sinks.length} sinks (${countBy(clearance.sinks, 'piece')}) ${clearance.seams.length} seams`] : []),
].join('; ');

const site = join(out, 'site');
buildSite(built, site);
mkdirSync(out, { recursive: true });
const server = await serveSite(site, built);
const browser = await launchBrowser();
let failed = 0;
try {
  const { page } = await openPage(browser, server.origin, 'pose.html', 'posed');
  for (const { name, pose } of poses) {
    try {
      const { png, ...facts } = await page.evaluate((asked) => window.posed(asked), { wear, pose, size, views: values.views, probe: values.probe });
      writePng(join(out, fileName('', name)), png);
      console.log(`${name}: ${describe(facts)}`);
    } catch (error) {
      failed++;
      console.log(`FAILED ${name}: ${error.message.split('\n')[0]}`);
    }
  }
  if (values.screenshot) {
    for (const { name, pose } of poses) {
      const query = new URLSearchParams({ wear: wear.join(',') });
      if (typeof pose === 'string') query.set('pose', pose);
      try {
        const { page: ui } = await openPage(browser, server.origin, `pose.html?${query}`, 'showPose', { viewport: UI_VIEWPORT });
        await ui.evaluate((asked) => window.showPose(asked), pose);
        await ui.screenshot({ path: join(out, fileName('ui-', name)) });
        await ui.close();
      } catch (error) {
        failed++;
        console.log(`FAILED ui ${name}: ${error.message.split('\n')[0]}`);
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(failed === 0 ? `${poses.length} drawn -> ${out}` : `${failed} failed -> ${out}`);
if (failed > 0) process.exitCode = 1;
