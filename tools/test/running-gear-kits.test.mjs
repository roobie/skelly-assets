import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { meeting, shapes } from './pieces.mjs';

const repo = resolve(import.meta.dirname, '../..');

// Each exhaust, fuel tank and radiator fitted both ways at one spot through the placements' vehicle kit, with the rows
// each way fits. Pieces are compared in the vehicle frame, each part's moved to where its site puts it, so a mismatch
// is one fitting drawing something the other does not.
const kits = JSON.parse(evaluateJsonnet(`
  local kit = import 'models/vehicles/kit.libsonnet';
  local site = import 'models/vehicles/site.libsonnet';
  local at = [1, 0.5, 0.25];
  local fitted(fitting, names) =
    local byId = { [row.id]: row for row in fitting.rows };
    local drawn(placed) =
      local body = byId[placed.part].parts[0];
      { site: placed.id, mass: body.massKg, pieces: [kit.moved(p, placed.at) for p in std.parseJson(body.params.pieces)], finish: body.finish };
    {
      [name]: {
        fused: [drawn(p) for p in fitting.sites(site.kit, name, at, 'fused')],
        assembly: [drawn(p) for p in fitting.sites(site.kit, name, at, 'assembly')],
      }
      for name in std.objectFields(names)
    };
  {
    exhaust: fitted(import 'models/vehicles/exhaust-kit.libsonnet', import 'models/vehicles/exhausts.libsonnet'),
    tank: fitted(import 'models/vehicles/fuel-tank-kit.libsonnet', import 'models/vehicles/fuel-tanks.libsonnet'),
    radiator: fitted(import 'models/vehicles/cooling-kit.libsonnet', import 'models/vehicles/radiators.libsonnet'),
  }`, repo));

const every = Object.entries(kits).flatMap(([kit, fittings]) => Object.entries(fittings).map(([name, fitting]) => [kit, name, fitting]));
const near = (a, b) => Math.abs(a - b) < 1e-9;
// A truck's tank and radiator are big, so the sampling is coarser than a small part's, still finer than the grain.
const STEP = 0.004;

test('every exhaust, fuel tank and radiator is fitted either fused or as an assembly', () => {
  for (const kit of Object.keys(kits)) assert.ok(Object.keys(kits[kit]).length > 0, kit);
  for (const [kit, name, { fused, assembly }] of every) {
    assert.equal(fused.length, 1, `${kit} ${name}`);
    assert.ok(assembly.length > 1, `${kit} ${name}'s assembly has parts`);
    assert.equal(new Set(assembly.map((d) => d.site)).size, assembly.length, `${name}'s assembly sites are distinct`);
  }
});

test('each weighs the same fused as assembled', () => {
  for (const [, name, { fused, assembly }] of every) {
    const total = assembly.reduce((sum, d) => sum + d.mass, 0);
    assert.ok(near(fused[0].mass, total), `${name}: fused ${fused[0].mass} kg, assembly ${total} kg`);
  }
});

test('each looks the same fused as assembled', () => {
  for (const [, name, { fused, assembly }] of every) assert.deepEqual(shapes(fused), shapes(assembly), name);
});

test("an assembled exhaust's parts meet end to end along its run and cut into nothing", () => {
  for (const [name, { assembly }] of Object.entries(kits.exhaust)) {
    // The sites list the pipes and then the class's parts; along the run each pipe is followed by the next part.
    const pipes = assembly.filter((d) => d.site.startsWith('exhaust_'));
    const parts = assembly.filter((d) => !d.site.startsWith('exhaust_'));
    const run = pipes.flatMap((pipe, i) => (i < parts.length ? [pipe, parts[i]] : [pipe]));
    assert.equal(run.length, assembly.length, name);
    for (let i = 1; i < run.length; i++) {
      assert.ok(meeting(run[i - 1].pieces, run[i].pieces, STEP).touches, `${name}: ${run[i].site} floats clear of ${run[i - 1].site}`);
    }
    for (const [i, part] of run.entries()) {
      for (const other of run.slice(i + 1)) assert.ok(!meeting(part.pieces, other.pieces, STEP).overlaps, `${name}: ${part.site} cuts into ${other.site}`);
    }
  }
});

test("every part of an assembled tank or radiator rests on its body and cuts into nothing", () => {
  for (const kit of ['tank', 'radiator']) {
    for (const [name, { assembly }] of Object.entries(kits[kit])) {
      const [body, ...parts] = assembly;
      for (const [i, part] of parts.entries()) {
        const onBody = meeting(part.pieces, body.pieces, STEP);
        assert.ok(onBody.touches, `${name}: ${part.site} floats clear of ${body.site}`);
        assert.ok(!onBody.overlaps, `${name}: ${part.site} cuts into ${body.site}`);
        for (const other of parts.slice(i + 1)) assert.ok(!meeting(part.pieces, other.pieces, STEP).overlaps, `${name}: ${part.site} cuts into ${other.site}`);
      }
    }
  }
});
