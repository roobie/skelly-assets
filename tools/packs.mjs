// @ts-check
// models/packs.json: what each pack declares about itself, beside the files and models it builds. The why of
// dependsOn is in docs/decisions/0001-vehicle-placements.md.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { smoothedPack } from './layout.mjs';

const repo = resolve(import.meta.dirname, '..');
export const PACKS = 'models/packs.json';
const PACK_KEYS = new Set(['dependsOn']);

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

// Why a pack's dependencies cannot be honoured, as messages. dependsOn: pack -> the packs it depends on; declared: every
// pack id the sources declare. A dependency on an undeclared pack, on itself or around a cycle could never be loaded.
/**
 * @param {Readonly<Record<string, readonly string[]>>} dependsOn
 * @param {ReadonlySet<string>} declared
 */
export function dependencyProblems(dependsOn, declared) {
  /** @type {string[]} */
  const problems = [];
  for (const [pack, targets] of Object.entries(dependsOn)) {
    if (!declared.has(pack)) problems.push(`${pack}: not a declared pack`);
    if (new Set(targets).size !== targets.length) problems.push(`${pack}: depends on a pack twice`);
    for (const target of targets)
      if (!declared.has(target)) problems.push(`${pack}: depends on ${target}, which is not a declared pack`);
  }
  const done = new Set();
  /**
   * @param {string} pack
   * @param {readonly string[]} path
   */
  const visit = (pack, path) => {
    if (done.has(pack)) return;
    const at = path.indexOf(pack);
    if (at >= 0) {
      problems.push(`dependency cycle: ${[...path.slice(at), pack].join(' -> ')}`);
      return;
    }
    for (const target of (Object.hasOwn(dependsOn, pack) ? dependsOn[pack] : undefined) ?? [])
      visit(target, [...path, pack]);
    done.add(pack);
  };
  for (const pack of Object.keys(dependsOn).sort()) visit(pack, []);
  return problems.sort();
}

// pack -> the packs it depends on, sorted, read strictly and held to the declared packs. A smooth pack's one dependency
// is the pack it is the copy of, whose sidecars its models are weighed and fitted by, so models/packs.json never names it.
/**
 * @param {ReadonlySet<string>} declared
 * @param {string} [root]
 */
export function readDependencies(declared, root = repo) {
  /** @type {unknown} */
  const value = JSON.parse(readFileSync(join(root, PACKS), 'utf8'));
  if (!isObject(value)) throw new Error(`${PACKS}: expected an object`);
  for (const key of Object.keys(value))
    if (key !== '_doc' && key !== 'packs') throw new Error(`${PACKS}: unknown key ${key}`);
  if (!isObject(value.packs)) throw new Error(`${PACKS}: packs must map each pack id to its metadata`);
  /** @type {Record<string, string[]>} */
  const dependsOn = {};
  for (const [pack, entry] of Object.entries(value.packs)) {
    const unknown = isObject(entry) ? Object.keys(entry).filter((key) => !PACK_KEYS.has(key)) : [];
    if (!isObject(entry) || unknown.length > 0)
      throw new Error(`${PACKS}: ${pack} holds only ${[...PACK_KEYS].join(' ')}`);
    if (smoothedPack(pack) !== undefined)
      throw new Error(`${PACKS}: ${pack} is a smooth pack, which depends only on ${smoothedPack(pack)}`);
    const targets = entry.dependsOn ?? [];
    if (!Array.isArray(targets) || targets.some((target) => typeof target !== 'string'))
      throw new Error(`${PACKS}: ${pack} dependsOn must list pack ids`);
    dependsOn[pack] = [...targets].sort();
  }
  for (const pack of declared) {
    const smoothed = smoothedPack(pack);
    if (smoothed !== undefined) dependsOn[pack] = [smoothed];
  }
  const problems = dependencyProblems(dependsOn, declared);
  if (problems.length > 0) throw new Error(`${PACKS}:\n  ${problems.join('\n  ')}`);
  return dependsOn;
}
