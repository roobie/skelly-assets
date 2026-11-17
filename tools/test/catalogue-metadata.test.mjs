import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';

const root = resolve(import.meta.dirname, '../..');
// Construction-led corrections, not a requirement to list every component material.
const materials = {
  jerry_can: ['metal'], // Explicit pressed-steel can, despite its polymer-named paint.
  fastener_pack: ['paper', 'metal'], // Paperboard packaging and screws.
  trauma_kit_pouch: ['fabric'], // Plastic pull tabs are minor fittings.
  beach_volleyball: ['plastic'], // Explicit vinyl shell.
  jet_injector: ['ceramic'], // Ceramic shell; small alloy nozzle.
  sealed_radiation_badge: ['metal'], // The depicted object is a foil pouch.
  riding_crop: ['leather', 'plastic'], // Leather and a fibreglass shaft, not rubber.
  ammo_pouch: ['leather'],
  leather_chest_pouch: ['leather'],
  hardened_elbow_guards: ['metal', 'leather'],
  spider_shell_forge: ['stone'], // Cement; spider shell is not bone, horn or antler.
};
const titles = { plastic_fuel_can: 'Plastic fuel can', cigarette: 'Cigarette pack' };
const ids = [...Object.keys(materials), ...Object.keys(titles), 'smouldering_ember_carrier', 'forged_shears'];

test('construction-led catalogue metadata survives index and exporting-recipe defaults', () => {
  const recipes = readdirSync(resolve(root, 'models/recipes'))
    .filter((name) => name.endsWith('.jsonnet'))
    .sort();
  const expression = `
    local selected(rows) = [
      {id: r.id, title: r.title, taxonomy: r.taxonomy}
      for r in rows if std.member(${JSON.stringify(ids)}, r.id)
    ];
    {
      index: selected(import 'models/index.libsonnet'),
      exports: std.flattenArrays([
        ${recipes.map((name) => `selected(import 'models/recipes/${name}')`).join(',\n')}
      ]),
    }
  `;
  const stages = JSON.parse(evaluateJsonnet(expression, resolve(root, 'tools')));
  for (const [stage, rows] of Object.entries(stages)) {
    for (const id of ids) {
      const matches = rows.filter((row) => row.id === id);
      assert.equal(matches.length, 1, `${stage}: exactly one ${id}`);
      const row = matches[0];
      if (materials[id]) assert.deepEqual(row.taxonomy.tags.material, materials[id], `${stage}: ${id} material`);
      if (titles[id]) assert.equal(row.title, titles[id], `${stage}: ${id} title`);
      if (id === 'smouldering_ember_carrier') {
        assert.ok(!row.taxonomy.tags.state?.includes('opened'), `${stage}: lid-on carrier is not opened`);
      }
      if (id === 'forged_shears') {
        assert.ok(
          !row.taxonomy.keywords?.includes('metalworking'),
          `${stage}: sheep shears are not metalworking tools`,
        );
      }
    }
  }
});
