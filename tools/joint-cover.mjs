// Reports what every fitted garment bares at the knee, the elbow and the neck as the UAL doll walks, jogs and sprints,
// as a camera straight above sees it (tools/jointCover.mjs). It is a report and no gate: it ranks the garments by the
// skin that shows from above so a reviewer knows which to look at.
// Usage: node tools/joint-cover.mjs [--built built] [--out look/joint-cover] [--wear id,id] [--step 2]
// Writes <out>/report.json, each garment's worst key per gait and joint, and <out>/report.md, the same as a table;
// prints the garments that fill half a pixel or more at the closest zoom. `--step` probes every nth key of a clip.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fittedGarments } from './dress.mjs';
import { GAITS, ZOOMS } from './jointCover.mjs';
import { workerPool } from './workerPool.mjs';

const repo = resolve(import.meta.dirname, '..');
const { values } = parseArgs({
  options: {
    built: { type: 'string', default: join(repo, 'built') },
    out: { type: 'string', default: join(repo, 'look/joint-cover') },
    wear: { type: 'string', default: '' },
    step: { type: 'string', default: '2' },
  },
});
const built = resolve(values.built);
const out = resolve(values.out);
const step = Number(values.step);
if (!Number.isInteger(step) || step < 1) throw new Error(`joint-cover: --step ${values.step} is no count of keys`);

const manifest = JSON.parse(readFileSync(join(built, 'manifest.json'), 'utf8'));
const garments = fittedGarments(manifest.models).sort();
const asked = values.wear.split(',').filter(Boolean);
for (const id of asked)
  if (!garments.includes(id)) throw new Error(`joint-cover: ${id} is no fitted garment of the built tree`);
const chosen = garments.filter((id) => asked.length === 0 || asked.includes(id));

const pool = workerPool(
  new URL('./jointCover.mjs', import.meta.url).href,
  'garmentRow',
  Math.min(availableParallelism(), chosen.length),
);
let rows;
try {
  rows = await Promise.all(
    chosen.map(async (garment) => {
      const row = await pool.run({ built, garment, step });
      console.error(`probed ${garment}`);
      return row;
    }),
  );
} finally {
  await pool.close();
}

// What reads from above: skin that fills half a pixel at the closest zoom tints the pixel it falls in.
const CLOSEST = Math.max(...ZOOMS);
const READS = 0.5;
const worst = ({ gaits }) =>
  Math.max(...Object.values(gaits).flatMap((joints) => Object.values(joints).map(({ px }) => px[CLOSEST])));
const ranked = rows.toSorted((a, b) => worst(b) - worst(a) || a.garment.localeCompare(b.garment));

const joints = ['knee', 'elbow', 'neck'];
const cell = ({ seenCm2, px, key }) => (seenCm2 === 0 ? '·' : `${seenCm2} cm², ${px[CLOSEST]} px (key ${key})`);
const table = [
  `| garment | ${Object.keys(GAITS)
    .flatMap((gait) => joints.map((joint) => `${gait} ${joint}`))
    .join(' | ')} |`,
  `|---|${Object.keys(GAITS)
    .flatMap(() => joints.map(() => '---'))
    .join('|')}|`,
  ...ranked.map(
    (row) =>
      `| ${row.garment} | ${Object.keys(GAITS)
        .flatMap((gait) => joints.map((joint) => cell(row.gaits[gait][joint])))
        .join(' | ')} |`,
  ),
];
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'report.json'), `${JSON.stringify({ step, zooms: ZOOMS, garments: ranked }, null, 1)}\n`);
writeFileSync(
  join(out, 'report.md'),
  [
    '# Joint cover on the UAL doll',
    '',
    `Skin seen from straight above at each garment's worst key of each gait, of every ${step} keys one probed: its area`,
    `in the picture and the pixels it fills with the figure ${CLOSEST} px tall. A dot is none.`,
    '',
    ...table,
    '',
  ].join('\n'),
);
for (const row of ranked.filter((entry) => worst(entry) >= READS)) {
  const parts = Object.entries(row.gaits).flatMap(([gait, byJoint]) =>
    Object.entries(byJoint).flatMap(([joint, { px }]) =>
      px[CLOSEST] >= READS ? [`${gait} ${joint} ${px[CLOSEST]} px`] : [],
    ),
  );
  console.log(`${row.garment}: ${parts.join(', ')}`);
}
console.log(`${ranked.length} garments -> ${out}`);
