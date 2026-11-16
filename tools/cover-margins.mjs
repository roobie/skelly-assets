// Prints how near each worn piece's `covers` comes to failing the enclosure check the showcase build runs
// (tools/dollRig.mjs, coverGaps, coverMargins), worst first, as a Markdown table, so a body or shell change that would
// open a declaration is seen coming rather than met as a failed build.
// Usage: node tools/cover-margins.mjs [--built built] [item ...]. Items default to every item whose worn pieces
// declare covers; the built tree needs its manifest.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { coverMargins, dollRig, readRigContent } from './dollRig.mjs';
import { coveringItems, modelMeshes, readDoll, readDressing, wornSites } from './dress.mjs';
import { MANIFEST } from './manifest.mjs';

const repo = resolve(import.meta.dirname, '..');
const { values, positionals } = parseArgs({ allowPositionals: true, options: { built: { type: 'string', default: join(repo, 'built') } } });
const built = resolve(values.built);
const manifest = JSON.parse(readFileSync(join(built, MANIFEST), 'utf8'));
const models = manifest.models.filter(({ path }) => path.endsWith('.glb'));
const byId = new Map(models.map((model) => [model.id, model]));
const dressing = readDressing(repo);
const doll = readDoll(built, manifest, dressing);
const rig = dollRig(readRigContent(repo), doll, dressing);
const meshesOf = (id, keep) => modelMeshes(readFileSync(join(built, byId.get(id).pack, byId.get(id).path)), keep);
const unplaced = () => { throw new Error('a covering item is dressed by its worn pieces, never placed whole'); };

// The worse side of each declaration, since a consumer hides it on both.
const worst = new Map();
for (const id of positionals.length > 0 ? positionals : coveringItems(models)) {
  for (const row of coverMargins(rig, wornSites({ id }, { dressing, doll, models, boxOf: unplaced, anchorsOf: unplaced }), meshesOf)) {
    const key = `${row.piece} ${row.name}`;
    if (!worst.has(key) || row.margin < worst.get(key).margin) worst.set(key, row);
  }
}
const mm = (metres) => (Number.isFinite(metres) ? (metres * 1000).toFixed(1) : String(metres));
console.log('| piece | covers | margin (mm) | beneath | open | samples | side | at (m) |');
console.log('|---|---|--:|--:|--:|--:|---|---|');
for (const { piece, name, margin, beneath, open, samples, side, at } of [...worst.values()].sort((a, b) => a.margin - b.margin)) {
  console.log(`| ${piece} | ${name} | ${mm(margin)} | ${beneath} | ${open} | ${samples} | ${side} | ${at ? at.map((x) => x.toFixed(3)).join(', ') : ''} |`);
}
