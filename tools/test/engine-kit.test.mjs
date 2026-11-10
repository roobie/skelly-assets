import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { meeting, shapes } from './pieces.mjs';

const repo = resolve(import.meta.dirname, '../..');

// Each engine fitted both ways at one spot, with the rows each way fits: the fused engine alone, or the core and each
// accessory at its own site. Pieces are compared in the vehicle frame, the accessories' moved to where their sites put
// them, so a mismatch is one fitting drawing something the other does not.
const fittings = JSON.parse(evaluateJsonnet(`
  local kit = import 'models/vehicles/kit.libsonnet';
  local engine = import 'models/vehicles/engine-kit.libsonnet';
  local byId = { [row.id]: row for row in engine.rows };
  local at = [1, 0.5, 0.25];
  local drawn(placed) =
    local body = byId[placed.part].parts[0];
    local offset = [placed.at[i] - at[i] for i in [0, 1, 2]];
    { mass: body.massKg, pieces: [kit.moved(p, offset) for p in std.parseJson(body.params.pieces)], finish: body.finish };
  {
    [name]: {
      fused: [drawn(p) + { site: p.id } for p in engine.sites(name, at, 'fused')],
      assembly: [drawn(p) + { site: p.id } for p in engine.sites(name, at, 'assembly')],
    }
    for name in std.objectFields(import 'models/vehicles/engines.libsonnet')
  }`, repo));

const engines = Object.entries(fittings);
const near = (a, b) => Math.abs(a - b) < 1e-9;

test('every engine is fitted either fused or as an assembly', () => {
  assert.ok(engines.length > 0);
  for (const [name, { fused, assembly }] of engines) {
    assert.deepEqual(fused.map((d) => d.site), ['engine'], name);
    assert.ok(assembly.length > 1, `${name}'s assembly has accessories`);
    assert.equal(new Set(assembly.map((d) => d.site)).size, assembly.length, `${name}'s assembly sites are distinct`);
  }
});

test('an engine weighs the same fused as assembled', () => {
  for (const [name, { fused, assembly }] of engines) {
    const total = assembly.reduce((sum, d) => sum + d.mass, 0);
    assert.ok(near(fused[0].mass, total), `${name}: fused ${fused[0].mass} kg, assembly ${total} kg`);
  }
});

test('an engine looks the same fused as assembled', () => {
  for (const [name, { fused, assembly }] of engines) assert.deepEqual(shapes(fused), shapes(assembly), name);
});

test('every accessory of an assembled engine rests on its core and cuts into nothing', () => {
  for (const [name, { assembly }] of engines) {
    const [core, ...accessories] = assembly;
    assert.equal(core.site, 'engine', name);
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
