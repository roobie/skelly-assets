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
import { compareCodeUnits } from './codeUnitOrder.mjs';
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
const joints = ['knee', 'elbow', 'neck'];
// The joints a garment answers for: the neck only under a garment with a piece beside it.
const answers = ({ collared }, joint) => joint !== 'neck' || collared;
const worst = (row) =>
  Math.max(
    0,
    ...Object.values(row.gaits).flatMap((byJoint) =>
      joints.filter((joint) => answers(row, joint)).map((joint) => byJoint[joint].px[CLOSEST]),
    ),
  );
const ranked = rows.toSorted((a, b) => worst(b) - worst(a) || compareCodeUnits(a.garment, b.garment));

const seen = ({ seenCm2, px, key }) => (seenCm2 === 0 ? '·' : `${seenCm2} cm², ${px[CLOSEST]} px (key ${key})`);
const cell = (row, gait, joint) => (answers(row, joint) ? seen(row.gaits[gait][joint]) : '—');
const columns = Object.keys(GAITS).flatMap((gait) => joints.map((joint) => ({ gait, joint })));
const table = [
  `| garment | ${columns.map(({ gait, joint }) => `${gait} ${joint}`).join(' | ')} |`,
  `|---|${columns.map(() => '---').join('|')}|`,
  ...ranked.map(
    (row) => `| ${row.garment} | ${columns.map(({ gait, joint }) => cell(row, gait, joint)).join(' | ')} |`,
  ),
];
// The doll's own neck, as any garment that reaches nowhere near it leaves it.
const bare = rows.find(({ collared }) => !collared);
const bareNeck = bare
  ? [
      `The bare doll's neck: ${Object.keys(GAITS)
        .map((gait) => `${gait} ${seen(bare.gaits[gait].neck)}`)
        .join('; ')}.`,
      '',
    ]
  : [];
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'report.json'), `${JSON.stringify({ step, zooms: ZOOMS, garments: ranked }, null, 1)}\n`);
writeFileSync(
  join(out, 'report.md'),
  [
    '# Joint cover on the UAL doll',
    '',
    `Skin seen from straight above at each garment's worst key of each gait, one key in ${step} probed: its area in`,
    `the picture and the pixels it fills with the figure ${CLOSEST} px tall. A dot is none, and a dash a neck the garment`,
    'has no piece beside.',
    '',
    ...bareNeck,
    ...table,
    '',
  ].join('\n'),
);
for (const row of ranked.filter((entry) => worst(entry) >= READS)) {
  const parts = columns.flatMap(({ gait, joint }) => {
    const { px } = row.gaits[gait][joint];
    return answers(row, joint) && px[CLOSEST] >= READS ? [`${gait} ${joint} ${px[CLOSEST]} px`] : [];
  });
  console.log(`${row.garment}: ${parts.join(', ')}`);
}
console.log(`${ranked.length} garments -> ${out}`);
