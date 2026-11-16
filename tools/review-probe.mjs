// Ranks the catalogue rows a reviewer has not looked at by what the review probes find in them, so a review starts
// with the rows most likely to need a fix. The shape probes read each row's built model (shapeProbe.mjs) and the run
// probes its pieces (runProbe.mjs); why this is a queue and not a check is in ../docs/decisions/0018-review-probes.md.
// Usage: node tools/review-probe.mjs --reviewed <verdicts.jsonl> --out <dir> [--renames <renames.json>] [--built built]
//   [--workers n] [id ...]
// The verdicts file holds one JSON object per line, and any line with an `id` marks that row reviewed. A row renamed
// since its review is found through the built manifest's renames and the `--renames` list of { id, newId }. With ids,
// only those rows are probed, reviewed or not. Writes <out>/queue.json: the rows with findings, most likely first.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { compileJsonnetFile } from './jsonnet/index.mjs';
import { MANIFEST } from './manifest.mjs';
import { INDEX } from './row-index.mjs';
import { stairRuns, thinRuns } from './runProbe.mjs';
import { SMOOTH_GRAIN } from './shapeProbe.mjs';
import { workerPool } from './workerPool.mjs';

const repo = resolve(import.meta.dirname, '..');
const CATALOGUE = join(repo, 'models/catalogue/sets', INDEX);

// The run findings of one catalogue row's compound pieces. A row drawn smooth has no lattice to break a thin wire, so
// only its staircases are looked for, at the finest grain any row is drawn at.
export function rowRunFindings(row) {
  const pieces = row.parts.filter(({ family }) => family === 'compound').flatMap(({ params }) => JSON.parse(params.pieces));
  return [
    ...stairRuns(pieces, row.voxelGrain ?? SMOOTH_GRAIN).map((run) => ({ probe: 'stair', ...run })),
    ...(row.voxelGrain === undefined ? [] : thinRuns(pieces, row.voxelGrain).map((run) => ({ probe: 'thin', ...run }))),
  ];
}

// How sure a finding is that something is wrong, from 0 to 1: a shape finding by the share of cells it covers, and a
// run, which is a way of drawing that always breaks up, as sure as can be.
const weight = ({ cells, of }) => (of === undefined ? 1 : cells / of);

// The rows with findings, most likely to need a fix first: by how many different probes find something, then by the
// surest finding.
export function rankedQueue(found) {
  const ranked = Object.entries(found)
    .filter(([, findings]) => findings.length > 0)
    .map(([id, findings]) => ({
      id,
      probes: [...new Set(findings.map(({ probe }) => probe))].sort(),
      sure: Math.max(...findings.map(weight)),
      findings,
    }));
  return ranked.sort((a, b) => b.probes.length - a.probes.length || b.sure - a.sure || a.id.localeCompare(b.id));
}

// The row ids a verdicts file marks reviewed, under their current ids: a review of a row since renamed counts for it.
export function reviewedIds(text, renames) {
  const ids = text.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line).id).filter(Boolean);
  return new Set(ids.map((id) => renames[id] ?? id));
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      reviewed: { type: 'string' },
      renames: { type: 'string' },
      out: { type: 'string' },
      built: { type: 'string', default: join(repo, 'built') },
      workers: { type: 'string' },
    },
  });
  if (!values.reviewed || !values.out) throw new Error('usage: review-probe.mjs --reviewed <verdicts.jsonl> --out <dir> [id ...]');
  const built = resolve(values.built);
  const manifest = JSON.parse(readFileSync(join(built, MANIFEST), 'utf8'));
  const listed = values.renames ? JSON.parse(readFileSync(values.renames, 'utf8')) : [];
  const renames = { ...manifest.renames, ...Object.fromEntries(listed.map(({ id, newId }) => [id, newId])) };
  const reviewed = reviewedIds(readFileSync(values.reviewed, 'utf8'), renames);
  const rows = Object.values(JSON.parse(compileJsonnetFile(CATALOGUE))).flat()
    .filter(({ id }) => (positionals.length > 0 ? positionals.includes(id) : !reviewed.has(id)));
  const models = new Map(manifest.models.map(({ id, pack, path }) => [id, join(built, pack, path)]));

  const pool = workerPool(new URL('./shapeProbe.mjs', import.meta.url), 'modelFindings', ...(values.workers ? [Number(values.workers)] : []));
  const found = {};
  try {
    await Promise.all(rows.map(async (row) => {
      const shapes = models.has(row.id) ? await pool.run(models.get(row.id)) : [];
      found[row.id] = [...shapes, ...rowRunFindings(row)];
    }));
  } finally {
    await pool.close();
  }

  const queue = rankedQueue(found);
  mkdirSync(values.out, { recursive: true });
  writeFileSync(join(values.out, 'queue.json'), `${JSON.stringify({ probed: rows.length, queue }, null, 2)}\n`);
  const missing = rows.filter(({ id }) => !models.has(id)).length;
  console.log(`probed ${rows.length} rows (${missing} without a built model); ${queue.length} have findings`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
