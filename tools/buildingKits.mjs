// @ts-check
// Kit documents are regenerated from Jsonnet independently of cached model exports. Validate the actual sidecars,
// not source rows or an incidental scratch manifest, so metadata cannot silently disappear at an export boundary.
/** @import { ManifestBuildingKit, ManifestModel } from './manifest.mjs' */
/** @import { Building } from './packages/thing-core/src/building.ts' */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'valibot';
import { compareCodeUnits } from './codeUnitOrder.mjs';
import { outputPath } from './layout.mjs';
import { BuildingKitSchema, BuildingSchema, validateBuildingKit } from './packages/thing-core/src/building.ts';

const repo = resolve(import.meta.dirname, '..');
/** @param {{ id: string; revision: number }} kit */
const keyOf = ({ id, revision }) => `${id}@${revision}`;

export function readBuildingKits(root = repo) {
  // Fixture roots and older source trees with no building kits need no registry.
  if (!existsSync(join(root, 'models/building-kits.jsonnet'))) return [];
  /** @type {{ pack: string; kit: unknown }[]} */
  const values = JSON.parse(readFileSync(join(root, 'models/building-kits.json'), 'utf8'));
  if (!Array.isArray(values)) throw new Error('models/building-kits.jsonnet: expected an array');
  const seen = new Set();
  return values.map(({ pack, kit: value }) => {
    const kit = parse(BuildingKitSchema, value);
    const path = `building-kits/${kit.id}.v${kit.revision}.json`;
    outputPath(pack, path);
    const key = keyOf(kit);
    if (seen.has(key)) throw new Error(`duplicate building kit ${key}`);
    seen.add(key);
    return { pack, path, kit };
  });
}

/**
 * Write only referenced kits, including for targeted builds; a smooth copy shares its base model's sidecar/kit.
 * @param {object} options
 * @param {readonly Pick<ManifestModel, 'id' | 'pack' | 'path' | 'building'>[]} options.models
 * @param {string} options.out
 * @param {string} [options.root]
 * @param {boolean} [options.complete]
 */
export function exportBuildingKits({ models, out, root = repo, complete = true }) {
  const definitions = new Map(readBuildingKits(root).map((entry) => [keyOf(entry.kit), entry]));
  /** @type {Map<string, ReturnType<typeof readBuildingKits>[number]>} */
  const used = new Map();
  /** @type {Map<string, Building>} */
  const modules = new Map();
  for (const model of models) {
    if (!model.building) continue;
    const key = keyOf(model.building.kit);
    const definition = definitions.get(key);
    if (!definition) throw new Error(`${model.id}: unknown building kit ${key}`);
    if (definition.pack !== model.pack) throw new Error(`${model.id}: building kit must belong to its base pack`);
    const sidecar = JSON.parse(readFileSync(join(out, outputPath(model.pack, model.building.path)), 'utf8'));
    if (sidecar.id !== model.id || sidecar.file !== model.path)
      throw new Error(`${model.id}: building sidecar names a different model or GLB`);
    const building = parse(BuildingSchema, sidecar.building);
    validateBuildingKit(building, definition.kit);
    if (keyOf(building.kit) !== key) throw new Error(`${model.id}: sidecar and manifest kit references differ`);
    used.set(key, definition);
    modules.set(`${model.pack}/${model.id}`, building);
  }
  for (const [model, building] of modules) {
    if (building.layout.kind !== 'static-insert') continue;
    const { opening } = building.layout;
    const pack = model.slice(0, model.indexOf('/'));
    const target = modules.get(`${pack}/${opening.model}`);
    if (!target) {
      if (complete) throw new Error(`${model}: missing insert target ${opening.model}`);
      continue;
    }
    if (keyOf(target.kit) !== keyOf(building.kit) || !target.apertures?.some(({ id }) => id === opening.aperture))
      throw new Error(`${model}: incompatible insert target aperture`);
  }
  /** @type {ManifestBuildingKit[]} */
  const buildingKits = [];
  /** @type {string[]} */
  const files = [];
  for (const { pack, path, kit } of [...used.values()].sort((a, b) => compareCodeUnits(keyOf(a.kit), keyOf(b.kit)))) {
    const file = outputPath(pack, path);
    mkdirSync(join(out, pack, 'building-kits'), { recursive: true });
    writeFileSync(join(out, file), `${JSON.stringify(kit, null, 2)}\n`);
    buildingKits.push({ id: kit.id, revision: kit.revision, pack, path });
    files.push(file);
  }
  return { buildingKits, files };
}
