import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { meeting, shapes } from './pieces.mjs';

const repo = resolve(import.meta.dirname, '../..');

// Each wheel fitted at one near-side spot with each kind of brake its class offers, each part moved to where its site
// puts it; the wheel's tyre and rim rows in the wheel's frame at that spot; and a drum brake's backing plate, shoes and
// wheel cylinder rows where its shoe assembly sits.
const fittings = JSON.parse(evaluateJsonnet(`
  local kit = import 'models/vehicles/kit.libsonnet';
  local site = import 'models/vehicles/site.libsonnet';
  local wheel = import 'models/vehicles/wheel-kit.libsonnet';
  local wheels = import 'models/vehicles/wheels.libsonnet';
  local classes = import 'models/vehicles/wheel-classes.libsonnet';
  local byId = { [row.id]: row for row in wheel.rows };
  local at = [1, 0.35, 0.8];
  local drawn(part, placedAt=at) =
    local body = byId[part].parts[0];
    local offset = [placedAt[i] - at[i] for i in [0, 1, 2]];
    { part: part, mass: body.massKg, pieces: [kit.moved(p, offset) for p in std.parseJson(body.params.pieces)], finish: body.finish };
  local fitted(name, brake) = { [std.strReplace(p.id, '_near', '')]: p for p in wheel.pair(site.kit, 'wheel', name, at, brake) if !std.objectHas(p, 'mirror') };
  {
    [name]: {
      tyre: drawn(wheels[name].tyre.id),
      rim: drawn(wheels[name].rim.id),
      unbraked: std.objectFields(fitted(name, null)),
      brakes: {
        [brake]: local sites = fitted(name, brake); {
          sites: { [id]: drawn(sites[id].part, sites[id].at) for id in std.objectFields(sites) },
        } + (if brake == 'drum' then {
          local b = classes[wheels[name].class].drum,
          local shoes = sites.wheel_brake_shoes.at,
          salvage: { plate: drawn(b.backingPlate.id, shoes), shoes: drawn(b.shoes.id, shoes), cylinder: drawn(b.wheelCylinder.id, shoes) },
        } else {})
        for brake in wheel.brakes(name)
      },
    }
    for name in std.objectFields(wheels)
  }`, repo));

const wheels = Object.entries(fittings);
// Each kind of brake's parts at their sites, and the parts a game yields from them.
const kinds = {
  disc: { sites: ['wheel_brake_disc', 'wheel_caliper'] },
  drum: { sites: ['wheel_brake_drum', 'wheel_brake_shoes'], salvage: { wheel_brake_shoes: ['plate', 'shoes', 'cylinder'] } },
};

// A game turns the wheel's site, so the tyre must be drawn by the model at that site and the brake by models elsewhere.
test("a wheel's site carries the whole wheel and its brake sits at sites of its own", () => {
  for (const kind of Object.keys(kinds)) assert.ok(wheels.some(([, { brakes }]) => kind in brakes), kind);
  for (const [name, { unbraked, brakes }] of wheels) {
    assert.ok(Object.keys(brakes).length > 0, `${name} offers no brake`);
    assert.deepEqual(unbraked, ['wheel'], name);
    for (const [kind, { sites }] of Object.entries(brakes)) {
      assert.deepEqual(Object.keys(sites).sort(), ['wheel', ...kinds[kind].sites].sort(), `${name} ${kind}`);
      assert.equal(sites.wheel.part, name);
    }
  }
});

test('a fused part weighs and looks the same as the rows a game yields from it', () => {
  for (const [name, { tyre, rim, brakes }] of wheels) {
    const yields = [[brakes[Object.keys(brakes)[0]].sites.wheel, [tyre, rim]]];
    for (const [kind, { sites, salvage }] of Object.entries(brakes)) {
      for (const [site, parts] of Object.entries(kinds[kind].salvage ?? {})) yields.push([sites[site], parts.map((p) => salvage[p])]);
    }
    for (const [whole, parts] of yields) {
      const mass = parts.reduce((sum, p) => sum + p.mass, 0);
      assert.ok(Math.abs(whole.mass - mass) < 1e-9, `${name}: ${whole.part} ${whole.mass} kg, parts ${mass} kg`);
      assert.deepEqual(shapes([whole]), shapes(parts), `${name}: ${whole.part}`);
    }
  }
});

// Each part of a corner and the part it rests on: the tyre on the rim; a disc's hat against the rim's face and its
// caliper over the ring; a drum's face against the rim's, its backing plate across the drum's open end and the shoes and
// wheel cylinder on the plate inside it.
const STEP = 0.004;
const rests = {
  disc: (s) => [[s.wheel_brake_disc, 'rim'], [s.wheel_caliper, s.wheel_brake_disc]],
  drum: (s, salvage) => [[s.wheel_brake_drum, 'rim'], [salvage.plate, s.wheel_brake_drum], [salvage.shoes, salvage.plate], [salvage.cylinder, salvage.plate]],
};

test('every part of a wheel and its brake rests on another and cuts into none', () => {
  for (const [name, { tyre, rim, brakes }] of wheels) {
    for (const [kind, { sites, salvage }] of Object.entries(brakes)) {
      const named = (p) => (p === 'rim' ? rim : p);
      const pairs = [[tyre, rim], ...rests[kind](sites, salvage).map(([a, b]) => [a, named(b)])];
      for (const [part, base] of pairs) {
        assert.ok(meeting(part.pieces, base.pieces, STEP).touches, `${name} ${kind}: ${part.part} floats clear of ${base.part}`);
      }
      const all = [tyre, rim, ...new Set(pairs.flat())].filter((p, i, list) => list.indexOf(p) === i);
      for (const [i, a] of all.entries()) {
        for (const b of all.slice(i + 1)) {
          assert.ok(!meeting(a.pieces, b.pieces, STEP).overlaps, `${name} ${kind}: ${a.part} cuts into ${b.part}`);
        }
      }
    }
  }
});
