import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { meeting, shapes } from './pieces.mjs';

const repo = resolve(import.meta.dirname, '../..');

// Each wheel fitted both ways at one near-side spot, with the rows each way fits. Pieces are compared in the vehicle
// frame, each part moved to where its site puts it, so a mismatch is one fitting drawing something the other does not.
const fittings = JSON.parse(evaluateJsonnet(`
  local kit = import 'models/vehicles/kit.libsonnet';
  local site = import 'models/vehicles/site.libsonnet';
  local wheel = import 'models/vehicles/wheel-kit.libsonnet';
  local byId = { [row.id]: row for row in wheel.rows };
  local at = [1, 0.35, 0.8];
  local drawn(placed) =
    local body = byId[placed.part].parts[0];
    local offset = [placed.at[i] - at[i] for i in [0, 1, 2]];
    { site: placed.id, mass: body.massKg, pieces: [kit.moved(p, offset) for p in std.parseJson(body.params.pieces)], finish: body.finish };
  local near(name, detail) = [drawn(p) for p in wheel.pair(site.kit, 'wheel', name, at, detail) if !std.objectHas(p, 'mirror')];
  {
    [name]: { fused: near(name, 'fused'), assembly: near(name, 'assembly') }
    for name in std.objectFields(import 'models/vehicles/wheels.libsonnet')
  }`, repo));

const wheels = Object.entries(fittings);
const bySite = (drawn) => Object.fromEntries(drawn.map((d) => [d.site.replace(/_near$/, ''), d]));
const total = (drawn) => drawn.reduce((sum, d) => sum + d.mass, 0);

test('a wheel weighs and looks the same fused as assembled', () => {
  assert.ok(wheels.length > 0);
  for (const [name, { fused, assembly }] of wheels) {
    assert.ok(Math.abs(total(fused) - total(assembly)) < 1e-9, `${name}: fused ${total(fused)} kg, assembly ${total(assembly)} kg`);
    assert.deepEqual(shapes(fused), shapes(assembly), name);
  }
});

test('the brake keeps its own sites, apart from the turning wheel, either way the wheel is fitted', () => {
  for (const [name, { fused, assembly }] of wheels) {
    for (const drawn of [fused, assembly]) {
      const sites = bySite(drawn);
      assert.ok(sites.wheel_brake_disc && sites.wheel_caliper, `${name}: ${Object.keys(sites)}`);
    }
  }
});

// Each part of an assembled corner and the part it rests on: the tyre on the rim, the disc's hat against the rim's face
// and the caliper over the disc's ring.
const RESTS_ON = { wheel_tyre: 'wheel', wheel_brake_disc: 'wheel', wheel_caliper: 'wheel_brake_disc' };
const STEP = 0.004;

test('every part of an assembled wheel rests on another and cuts into none', () => {
  for (const [name, { assembly }] of wheels) {
    const sites = bySite(assembly);
    for (const [part, base] of Object.entries(RESTS_ON)) {
      assert.ok(meeting(sites[part].pieces, sites[base].pieces, STEP).touches, `${name}: ${part} floats clear of ${base}`);
    }
    for (const [i, a] of assembly.entries()) {
      for (const b of assembly.slice(i + 1)) {
        assert.ok(!meeting(a.pieces, b.pieces, STEP).overlaps, `${name}: ${a.site} cuts into ${b.site}`);
      }
    }
  }
});
