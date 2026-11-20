// Prints how near each worn piece's `covers` comes to failing the enclosure check the showcase build runs
// (tools/dollRig.mjs, coverGaps, coverMargins), worst first, as a Markdown table, so a body or shell change that would
// open a declaration is seen coming rather than met as a failed build.
// Usage: node tools/cover-margins.mjs [--built built] [item ...]. Items default to every item whose worn pieces
// declare covers; the built tree needs its manifest.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { coverMargins, dollRig } from './dollRig.mjs';
import {
  coveringItems,
  dollDressings,
  dollGarments,
  modelMeshes,
  readDoll,
  readDressing,
  wornSites,
} from './dress.mjs';
import { MANIFEST } from './manifest.mjs';

const repo = resolve(import.meta.dirname, '..');
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { built: { type: 'string', default: join(repo, 'built') } },
});
const built = resolve(values.built);
const manifest = JSON.parse(readFileSync(join(built, MANIFEST), 'utf8'));
const models = manifest.models.filter(({ path }) => path.endsWith('.glb'));
const byId = new Map(models.map((model) => [model.id, model]));
const meshesOf = (id, keep) => modelMeshes(readFileSync(join(built, byId.get(id).pack, byId.get(id).path)), keep);
const unplaced = () => {
  throw new Error('a covering item is dressed by its worn pieces, never placed whole');
};

// Worst first: the lesser of the margins across and along the bone, then the other.
const order = (a, b) =>
  Math.min(a.margin, a.end) - Math.min(b.margin, b.end) || Math.max(a.margin, a.end) - Math.max(b.margin, b.end);
// The worse side of each declaration, since a consumer hides it on both.
const worst = new Map();
for (const dressing of dollDressings(readDressing(repo))) {
  const doll = readDoll(built, manifest, dressing);
  const rig = dollRig(doll, dressing);
  for (const id of dollGarments(dressing, positionals.length > 0 ? positionals : coveringItems(models))) {
    for (const row of coverMargins(
      rig,
      wornSites({ id }, { dressing, doll, models, boxOf: unplaced, anchorsOf: unplaced }),
      meshesOf,
    )) {
      const key = `${dressing.id} ${row.piece} ${row.name}`;
      if (!worst.has(key) || order(row, worst.get(key)) < 0) worst.set(key, { doll: dressing.id, ...row });
    }
  }
}
const mm = (metres) => (Number.isFinite(metres) ? (metres * 1000).toFixed(1) : String(metres));
const point = (at) => (at ? at.map((x) => x.toFixed(3)).join(', ') : '');
console.log(
  '| doll | piece | covers | margin (mm) | at (m) | end (mm) | end at (m) | beneath | open | samples | side |',
);
console.log('|---|---|---|--:|---|--:|---|--:|--:|--:|---|');
for (const { doll, piece, name, margin, at, end, endAt, beneath, open, samples, side } of [...worst.values()].sort(
  order,
)) {
  console.log(
    `| ${doll} | ${piece} | ${name} | ${mm(margin)} | ${point(at)} | ${mm(end)} | ${point(endAt)} | ${beneath} | ${open} | ${samples} | ${side} |`,
  );
}
