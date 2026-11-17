import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readAssemblies } from '../assemblies.mjs';
import { glbJson } from '../glb.mjs';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { loadCatalogue } from '../packages/thing-authoring-tool/src/catalogue.ts';
import { exportItem } from '../packages/thing-authoring-tool/src/exports.ts';
import { recipeAsset, recipeVoxel } from '../packages/thing-export/src/recipe.ts';

const data = JSON.parse(
  evaluateJsonnet(`
local kit = import 'models/vehicles/turret-kit.libsonnet';
local packs = import 'models/vehicles/packs.libsonnet';
local wanted = ['apc_turret_core', 'kpvt_heavy_machine_gun',
  'cv9040_turret_core', 'bofors_40mm_l70_autocannon', 'mbt_turret_core', 'smoothbore_120mm_tank_gun'];
local rows = [r for r in kit.rows if std.member(wanted, r.id)];
{
  settings: import 'models/item-settings.libsonnet',
  rows: (import 'models/vehicles/frame.libsonnet').rows(rows),
  recipes: { [r.id]: packs.partRecipe(r) for r in rows },
}`),
);
const assemblies = readAssemblies();

for (const [id, gun, grain] of [
  ['apc_turret', 'kpvt_heavy_machine_gun', 0.004],
  ['cv9040_turret', 'bofors_40mm_l70_autocannon', 0.004],
  ['mbt_turret', 'smoothbore_120mm_tank_gun', 0.006],
]) {
  test(`${id} assembly places a fine-grain gun separately from the coarse core`, () => {
    const assembly = assemblies.find((a) => a.id === `${id}_assembly`);
    assert.ok(assembly);
    assert.ok(assembly.sites.some((s) => s.part === `${id}_core`));
    assert.ok(assembly.sites.some((s) => s.part === gun));
    const coreGrain = recipeVoxel(data.recipes[`${id}_core`]).voxelGrain;
    const gunGrain = recipeVoxel(data.recipes[gun]).voxelGrain;
    assert.equal(coreGrain, 0.03125);
    assert.equal(gunGrain, grain);
    assert.ok(gunGrain < coreGrain);
  });
}

test('APC gun exported with its production recipe contains fine voxels, not vehicle-sized voxels', () => {
  const row = data.rows.find((r) => r.id === 'kpvt_heavy_machine_gun');
  const item = loadCatalogue({ ...data.settings, items: [row] }).items[0];
  const recipe = data.recipes[item.id];
  const exported = exportItem(item, data.settings, recipeAsset(recipe), recipeVoxel(recipe));
  const primitives = glbJson(Buffer.from(exported.glb)).meshes.flatMap((mesh) => mesh.primitives);
  assert.ok(primitives.length > 0);
  const grains = primitives.map((p) => p.extras.voxelGrain);
  assert.ok(grains.includes(0.004));
  assert.ok(
    grains.every((g) => g > 0 && g <= 0.004),
    JSON.stringify(grains),
  );
});
