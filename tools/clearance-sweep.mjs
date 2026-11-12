// Sweeps every wearable whose pieces ride the doll's bones through every pose fixture, running the clearance probe
// (site/clearance.mjs) and the camera skin check (site/skin.mjs) on each, so a fit is checked on the whole wardrobe at
// once and ranked by how much body shows. The drawing and the checks are the posing page's own (site/pose.mjs), driven
// in headless Chromium as tools/pose-sheet.mjs drives it. Why the checks classify rather than forgive is in
// docs/decisions/0011-clearance-classified.md.
// Usage: node tools/clearance-sweep.mjs [--built built] [--out look/sweep] [--size 384] [--views review]
//   [--wear id,id] [<pose> ...]
// Poses are fixture names (models/poses), all of them by default; `--wear` limits the sweep to those wearables.
// Writes <out>/report.json, the findings of every wearable in every pose ranked by the covered skin that shows, and for
// each wearable and pose with a finding <out>/<wear>-<pose>.png, the tile with the probe's marks, and
// <out>/<wear>-<pose>-skin.png, the skin check's masks; prints the ranking.
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { COINCIDENT, PITCH } from '../site/clearance.mjs';
import { buildSite, launchBrowser, openPage, serveSite } from './reviewSite.mjs';

const repo = resolve(import.meta.dirname, '..');
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    built: { type: 'string', default: join(repo, 'built') },
    out: { type: 'string', default: join(repo, 'look/sweep') },
    size: { type: 'string', default: '384' },
    views: { type: 'string', default: 'review' },
    wear: { type: 'string', default: '' },
  },
});
const built = resolve(values.built);
const out = resolve(values.out);
const size = Number(values.size);
const fixtures = readdirSync(join(repo, 'models/poses')).filter((name) => name.endsWith('.json')).map((name) => basename(name, '.json')).sort();
const poses = positionals.length > 0 ? positionals : fixtures;

// The site is built aside, so the output folder holds only the report and the pictures.
const site = mkdtempSync(join(tmpdir(), 'clearance-sweep-'));
process.on('exit', () => rmSync(site, { recursive: true, force: true }));
buildSite(built, site);
const readSite = (file) => JSON.parse(readFileSync(join(site, file), 'utf8'));

// A wearable whose worn sites, past the doll's own, include a piece bound to a doll part rides the doll's bones; one
// placed whole moves with nothing, so no pose changes its fit.
const rig = readSite('rig.json');
const wearables = readSite('models.json').models.filter((model) => model.worn);
const rides = ({ worn }) => worn.slice(rig.doll.length).some((site) => site.part);
const asked = values.wear.split(',').filter(Boolean);
for (const id of asked) if (!wearables.some((model) => model.id === id)) throw new Error(`clearance-sweep: ${id} is no wearable of the built tree`);
const chosen = wearables.filter((model) => asked.length === 0 || asked.includes(model.id));
const swept = chosen.filter(rides).map(({ id }) => id);
const placedWhole = chosen.filter((model) => !rides(model)).map(({ id }) => id);

const millimetres = (metres) => Math.round(metres * 1e4) / 10;
const at = (point) => point.map(millimetres);
// Findings of one kind grouped by what they share, each group with its count and its deepest point.
const grouped = (findings, keys) => Object.values(Object.groupBy(findings, (finding) => keys.map((key) => finding[key]).join('|')))
  .map((group) => {
    const worst = group.reduce((a, b) => ((b.depth ?? 0) > (a.depth ?? 0) ? b : a));
    return {
      ...Object.fromEntries(keys.map((key) => [key, worst[key]])),
      count: group.length,
      ...(worst.depth === undefined ? {} : { worstMm: millimetres(worst.depth) }),
      atMm: at(worst.point),
    };
  })
  .sort((a, b) => (b.worstMm ?? 0) - (a.worstMm ?? 0) || b.count - a.count);
const worstOf = (groups) => Math.max(0, ...groups.map(({ worstMm }) => worstMm));

const writePng = (path, dataUrl) => writeFileSync(path, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));

mkdirSync(out, { recursive: true });
const server = await serveSite(site, built);
const browser = await launchBrowser();
const results = [];
let failed = 0;
try {
  const { page } = await openPage(browser, server.origin, 'pose.html', 'posed');
  for (const wear of swept) {
    for (const pose of poses) {
      try {
        const { png, pieces, clearance, skin } = await page.evaluate((request) => window.posed(request), { wear: [wear], pose, size, views: values.views, probe: true, skin: true });
        const result = {
          wear,
          pose,
          pieces: [...new Set(pieces.map(({ piece }) => piece))],
          showingPx: skin.views.reduce((sum, { showing }) => sum + showing, 0),
          skinPx: Object.fromEntries(skin.views.map(({ name, showing }) => [name, showing])),
          pokes: grouped(clearance.pokes, ['bone', 'piece']),
          flush: grouped(clearance.flush, ['bone', 'piece']),
          sinks: grouped(clearance.sinks, ['piece', 'into']),
          seams: clearance.seams.length,
        };
        if (result.showingPx + clearance.pokes.length + clearance.flush.length + clearance.sinks.length > 0) {
          result.images = [`${wear}-${pose}.png`, `${wear}-${pose}-skin.png`];
          writePng(join(out, result.images[0]), png);
          writePng(join(out, result.images[1]), skin.png);
        }
        results.push(result);
        console.log(`${wear} ${pose}: ${result.showingPx} px showing, ${clearance.pokes.length} pokes (worst ${worstOf(result.pokes)} mm), ${clearance.flush.length} flush, ${clearance.sinks.length} sinks (worst ${worstOf(result.sinks)} mm), ${result.seams} seams`);
      } catch (error) {
        failed++;
        console.log(`FAILED ${wear} ${pose}: ${error.message.split('\n')[0]}`);
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}

const ranked = results.toSorted((a, b) => b.showingPx - a.showingPx || worstOf(b.pokes) - worstOf(a.pokes));
writeFileSync(join(out, 'report.json'), `${JSON.stringify({
  coincidentMetres: COINCIDENT,
  pitchMetres: PITCH,
  views: values.views,
  size,
  poses,
  ranked,
  placedWhole,
}, null, 1)}\n`);
console.log('\nranked by covered skin showing:');
for (const { wear, pose, showingPx, pokes, flush } of ranked) {
  const where = pokes.slice(0, 3).map(({ bone, piece, worstMm }) => `${bone} out of ${piece} ${worstMm} mm`).join(', ');
  console.log(`  ${showingPx} px  ${wear} ${pose}${where ? `: ${where}` : ''}${flush.length ? `; flush on ${flush.map(({ bone }) => bone).join(', ')}` : ''}`);
}
console.log(`${results.length} swept, ${placedWhole.length} placed whole and not probed${failed ? `, ${failed} failed` : ''} -> ${out}`);
if (failed > 0) process.exitCode = 1;
