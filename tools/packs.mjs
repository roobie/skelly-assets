// models/packs.json: what each pack declares about itself, beside the files and models it builds. The why of
// dependsOn is in docs/decisions/0001-vehicle-placements.md.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
export const PACKS = 'models/packs.json';
const PACK_KEYS = new Set(['dependsOn']);

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

// Why a pack's dependencies cannot be honoured, as messages. dependsOn: pack -> the packs it depends on; declared: every
// pack id the sources declare. A dependency on an undeclared pack, on itself or around a cycle could never be loaded.
export function dependencyProblems(dependsOn, declared) {
  const problems = [];
  for (const [pack, targets] of Object.entries(dependsOn)) {
    if (!declared.has(pack)) problems.push(`${pack}: not a declared pack`);
    if (new Set(targets).size !== targets.length) problems.push(`${pack}: depends on a pack twice`);
    for (const target of targets) if (!declared.has(target)) problems.push(`${pack}: depends on ${target}, which is not a declared pack`);
  }
  const done = new Set();
  const visit = (pack, path) => {
    if (done.has(pack)) return;
    const at = path.indexOf(pack);
    if (at >= 0) {
      problems.push(`dependency cycle: ${[...path.slice(at), pack].join(' -> ')}`);
      return;
    }
    for (const target of (Object.hasOwn(dependsOn, pack) ? dependsOn[pack] : [])) visit(target, [...path, pack]);
    done.add(pack);
  };
  for (const pack of Object.keys(dependsOn).sort()) visit(pack, []);
  return problems.sort();
}

// pack -> the packs it depends on, sorted, read strictly and held to the declared packs.
export function readDependencies(declared, root = repo) {
  const value = JSON.parse(readFileSync(join(root, PACKS), 'utf8'));
  for (const key of Object.keys(value)) if (key !== '_doc' && key !== 'packs') throw new Error(`${PACKS}: unknown key ${key}`);
  if (!isObject(value.packs)) throw new Error(`${PACKS}: packs must map each pack id to its metadata`);
  const dependsOn = {};
  for (const [pack, entry] of Object.entries(value.packs)) {
    const unknown = isObject(entry) ? Object.keys(entry).filter((key) => !PACK_KEYS.has(key)) : [];
    if (!isObject(entry) || unknown.length > 0) throw new Error(`${PACKS}: ${pack} holds only ${[...PACK_KEYS].join(' ')}`);
    const targets = entry.dependsOn ?? [];
    if (!Array.isArray(targets) || targets.some((target) => typeof target !== 'string')) throw new Error(`${PACKS}: ${pack} dependsOn must list pack ids`);
    dependsOn[pack] = [...targets].sort();
  }
  const problems = dependencyProblems(dependsOn, declared);
  if (problems.length > 0) throw new Error(`${PACKS}:\n  ${problems.join('\n  ')}`);
  return dependsOn;
}
