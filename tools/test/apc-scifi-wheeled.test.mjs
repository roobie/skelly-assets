import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { meeting } from './pieces.mjs';

const root = resolve(import.meta.dirname, '../..');
// Every site of the carrier with its part's pieces drawn where the site puts them, mirrored on the far side.
const data = JSON.parse(evaluateJsonnet(`
  local k = import 'models/vehicles/kit.libsonnet';
  local own = import 'models/vehicles/apc_scifi_wheeled.libsonnet';
  local placements = import 'models/vehicles/apc_scifi_wheeled.placements.libsonnet';
  local rows = own + (import 'models/vehicles/wheel-kit.libsonnet').rows + (import 'models/vehicles/shared.libsonnet')
    + (import 'models/vehicles/apc.libsonnet');
  // Some kits list a shared row more than once, so each part takes its first row.
  local byId = { [id]: [r for r in rows if r.id == id][0] for id in std.set([s.part for s in placements.sites]) };
  local pieces(site) = [k.moved(if std.objectHas(site, 'mirror') then k.far(p) else p, site.at)
    for p in std.parseJson(byId[site.part].parts[0].params.pieces)];
  {
    spec: import 'models/vehicles/apc_scifi_wheeled.spec.libsonnet',
    own: [r.id for r in own],
    sites: [s + { pieces: pieces(s) } for s in placements.sites],
  }`, root));
const { spec, own, sites } = data;
const site = Object.fromEntries(sites.map((s) => [s.id, s]));
const drawn = (...ids) => ids.flatMap((id) => site[id].pieces);
const sides = ['near', 'far'];
// Pieces raised by dy, each kind along the axis its shape stores y on.
const lift = (pieces, dy) => pieces.map((p) => {
  if (p.kind === 'box') return { ...p, min: [p.min[0], p.min[1] + dy, p.min[2]], max: [p.max[0], p.max[1] + dy, p.max[2]] };
  if (p.kind === 'prism' && p.axis === 'y') return { ...p, start: p.start + dy, end: p.end + dy };
  if (p.kind === 'prism') return { ...p, profile: p.profile.map(([u, v]) => (p.axis === 'z' ? [u, v + dy] : [u + dy, v])) };
  return { ...p, origin: [p.origin[0], p.origin[1] + dy, p.origin[2]] };
});
// The body every wheel turns inside: the hull, both flanks and both panniers.
const body = drawn('hull', 'flank_near', 'flank_far', 'pannier_near', 'pannier_far');
const running = sites.filter((s) => /_wheel_(near|far)$|_wheel_(brake_disc|caliper)_/.test(s.id));
// Wheels are large, so they are sampled coarsely: a meeting at this step means the arch's air is gone.
const AIR = 0.02;

test('every site id is unique and the carrier defines only parts of its own name', () => {
  assert.equal(new Set(sites.map((s) => s.id)).size, sites.length);
  assert.ok(own.every((id) => id.startsWith('apc_scifi_wheeled_')));
});

test('every wheel and brake turns clear of the hull, flanks and panniers', () => {
  assert.ok(running.length > 0, 'vacuous: no wheel sites');
  for (const s of running) assert.ok(!meeting(s.pieces, body, AIR).touches, `${s.id} meets the body`);
});

test('a wheel raised by its arch air rubs the arch, so the clearance check can fail', () => {
  const wheel = site.front_wheel_near;
  assert.ok(meeting(lift(wheel.pieces, spec.archGap + AIR), body, AIR).touches);
});

test('each axle stub reaches its brake disc hat and clears the caliper', () => {
  for (const axle of ['front', 'rear']) {
    for (const side of sides) {
      const stubs = site[`${axle}_axle`].pieces.filter((p) => p.id.startsWith('stub'));
      const hat = site[`${axle}_wheel_brake_disc_${side}`].pieces.filter((p) => p.id.startsWith('hat'));
      const caliper = drawn(`${axle}_wheel_caliper_${side}`);
      assert.ok(meeting(stubs, hat, 0.005).touches, `${axle} ${side} stub misses its hat`);
      assert.ok(!meeting(stubs, caliper, 0.005).touches, `${axle} ${side} stub meets its caliper`);
    }
  }
});

test('every fitting rests on the part that carries it', () => {
  const carried = [
    ['hood', 'hull'], ['visor', 'hood'], ['weapon_station', 'hull'], ['cannon', 'weapon_station'], ['ramp', 'hull'],
  ];
  for (const side of sides) {
    carried.push([`pannier_${side}`, `flank_${side}`], [`launcher_${side}`, 'weapon_station'], [`hatch_${side}`, 'hull'], [`headlamp_${side}`, 'hull'], [`tail_lamp_${side}`, 'hull']);
  }
  // A gap finer than half the voxel grain closes in the build, so the check samples no finer.
  for (const [fitting, carrier] of carried) assert.ok(meeting(drawn(fitting), drawn(carrier), spec.grain / 2).touches, `${fitting} floats off ${carrier}`);
});

test('the cannon runs clear of the hood, visor, roof rails and launchers', () => {
  const roof = drawn('hood', 'visor', 'roof_rail_near', 'roof_rail_far', 'launcher_near', 'launcher_far');
  assert.ok(!meeting(drawn('cannon'), roof, 0.01).touches);
});

test('each roof rail stands on its posts alone, its bar clear of the hull', () => {
  const hull = drawn('hull');
  for (const side of sides) {
    const rail = drawn(`roof_rail_${side}`);
    const bar = rail.filter((p) => p.id.startsWith('bar'));
    const posts = rail.filter((p) => p.id.startsWith('post'));
    assert.ok(!meeting(bar, hull, 0.01).touches, `${side} bar meets the hull`);
    for (const post of posts) {
      assert.ok(meeting([post], hull, 0.005).touches, `${side} ${post.id} floats off the hull`);
      assert.ok(meeting([post], bar, 0.005).touches, `${side} ${post.id} misses the bar`);
    }
  }
});

test('a rail bar dropped to the roof meets the hull, so the rail clearance check can fail', () => {
  const bar = drawn('roof_rail_near').filter((p) => p.id.startsWith('bar'));
  assert.ok(meeting(lift(bar, -spec.rails.height), drawn('hull'), 0.01).touches);
});
