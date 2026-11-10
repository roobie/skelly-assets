import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { meeting, shapes } from './pieces.mjs';

const repo = resolve(import.meta.dirname, '../..');

// Each wheel fitted at one near-side spot, each part moved to where its site puts it, and the wheel's tyre and rim rows
// in the wheel's frame at that spot.
const fittings = JSON.parse(evaluateJsonnet(`
  local kit = import 'models/vehicles/kit.libsonnet';
  local site = import 'models/vehicles/site.libsonnet';
  local wheel = import 'models/vehicles/wheel-kit.libsonnet';
  local wheels = import 'models/vehicles/wheels.libsonnet';
  local byId = { [row.id]: row for row in wheel.rows };
  local at = [1, 0.35, 0.8];
  local drawn(part, placedAt=at) =
    local body = byId[part].parts[0];
    local offset = [placedAt[i] - at[i] for i in [0, 1, 2]];
    { part: part, mass: body.massKg, pieces: [kit.moved(p, offset) for p in std.parseJson(body.params.pieces)], finish: body.finish };
  {
    [name]: {
      sites: { [std.strReplace(p.id, '_near', '')]: drawn(p.part, p.at) for p in wheel.pair(site.kit, 'wheel', name, at) if !std.objectHas(p, 'mirror') },
      tyre: drawn(wheels[name].tyre.id),
      rim: drawn(wheels[name].rim.id),
    }
    for name in std.objectFields(wheels)
  }`, repo));

const wheels = Object.entries(fittings);

// A game turns the wheel's site, so the tyre must be drawn by the model at that site and the brake by models elsewhere.
test("a wheel's site carries the whole wheel and its brake sits at sites of its own", () => {
  assert.ok(wheels.length > 0);
  for (const [name, { sites }] of wheels) {
    assert.deepEqual(Object.keys(sites).sort(), ['wheel', 'wheel_brake_disc', 'wheel_caliper'], name);
    assert.equal(sites.wheel.part, name);
  }
});

test('a wheel weighs and looks the same as its tyre and rim rows', () => {
  for (const [name, { sites, tyre, rim }] of wheels) {
    assert.ok(Math.abs(sites.wheel.mass - tyre.mass - rim.mass) < 1e-9, `${name}: ${sites.wheel.mass} kg, parts ${tyre.mass + rim.mass} kg`);
    assert.deepEqual(shapes([sites.wheel]), shapes([tyre, rim]), name);
  }
});

// Each part of a corner and the part it rests on: the tyre on the rim, the disc's hat against the rim's face and the
// caliper over the disc's ring.
const STEP = 0.004;

test('every part of a wheel and its brake rests on another and cuts into none', () => {
  for (const [name, { sites, tyre, rim }] of wheels) {
    const parts = { tyre, rim, disc: sites.wheel_brake_disc, caliper: sites.wheel_caliper };
    for (const [part, base] of [['tyre', 'rim'], ['disc', 'rim'], ['caliper', 'disc']]) {
      assert.ok(meeting(parts[part].pieces, parts[base].pieces, STEP).touches, `${name}: ${part} floats clear of ${base}`);
    }
    const all = Object.entries(parts);
    for (const [i, [a, drawnA]] of all.entries()) {
      for (const [b, drawnB] of all.slice(i + 1)) {
        assert.ok(!meeting(drawnA.pieces, drawnB.pieces, STEP).overlaps, `${name}: ${a} cuts into ${b}`);
      }
    }
  }
});
