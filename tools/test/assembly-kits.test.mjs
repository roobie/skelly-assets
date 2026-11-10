import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { meeting, shapes } from './pieces.mjs';

const repo = resolve(import.meta.dirname, '../..');

// Each assembly of every kit fitted both ways at one spot, with the rows each way fits: the fused part alone, or the
// core and each accessory at its own site. Pieces are compared in the vehicle frame, the accessories' moved to where
// their sites put them, so a mismatch is one fitting drawing something the other does not.
const fittings = JSON.parse(evaluateJsonnet(`
  local kit = import 'models/vehicles/kit.libsonnet';
  local kits = {
    engine: import 'models/vehicles/engine-kit.libsonnet',
    turret: import 'models/vehicles/turret-kit.libsonnet',
  };
  local at = [1, 0.5, 0.25];
  {
    [kind + ' ' + name]: (
      local byId = { [row.id]: row for row in kits[kind].rows };
      local drawn(placed) =
        local body = byId[placed.part].parts[0];
        local offset = [placed.at[i] - at[i] for i in [0, 1, 2]];
        { mass: body.massKg, pieces: [kit.moved(p, offset) for p in std.parseJson(body.params.pieces)], finish: body.finish, site: placed.id };
      {
        fused: [drawn(p) for p in kits[kind].sites(name, at, 'fused')],
        assembly: [drawn(p) for p in kits[kind].sites(name, at, 'assembly')],
      }
    )
    for kind in std.objectFields(kits)
    for name in kits[kind].names
  }`, repo));

const assemblies = Object.entries(fittings);
const near = (a, b) => Math.abs(a - b) < 1e-9;

test('every assembly is fitted either fused or as a core with its accessories', () => {
  assert.ok(assemblies.length > 0);
  for (const [name, { fused, assembly }] of assemblies) {
    assert.deepEqual(fused.map((d) => d.site), [assembly[0].site], `${name} fits its fused part at its core's site`);
    assert.ok(assembly.length > 1, `${name}'s assembly has accessories`);
    assert.equal(new Set(assembly.map((d) => d.site)).size, assembly.length, `${name}'s assembly sites are distinct`);
  }
});

test('an assembly weighs the same fused as assembled', () => {
  for (const [name, { fused, assembly }] of assemblies) {
    const total = assembly.reduce((sum, d) => sum + d.mass, 0);
    assert.ok(near(fused[0].mass, total), `${name}: fused ${fused[0].mass} kg, assembly ${total} kg`);
  }
});

test('an assembly looks the same fused as assembled', () => {
  for (const [name, { fused, assembly }] of assemblies) assert.deepEqual(shapes(fused), shapes(assembly), name);
});

test('every accessory of an assembly rests on its core and cuts into nothing', () => {
  for (const [name, { assembly }] of assemblies) {
    const [core, ...accessories] = assembly;
    for (const [i, accessory] of accessories.entries()) {
      const onCore = meeting(accessory.pieces, core.pieces);
      assert.ok(onCore.touches, `${name}: ${accessory.site} floats clear of the core`);
      assert.ok(!onCore.overlaps, `${name}: ${accessory.site} cuts into the core`);
      for (const other of accessories.slice(i + 1)) {
        assert.ok(!meeting(accessory.pieces, other.pieces).overlaps, `${name}: ${accessory.site} cuts into ${other.site}`);
      }
    }
  }
});
