import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { meeting, solid } from './pieces.mjs';

const root = resolve(import.meta.dirname, '../..');
// Every site of the carrier with its part's pieces drawn where the site puts them, mirrored on the far side, and the
// player doll's measures.
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
    bust: import 'models/measures/bust.libsonnet',
    leg: import 'models/measures/leg.libsonnet',
  }`, root));
const { spec, own, sites, bust, leg } = data;
const site = Object.fromEntries(sites.map((s) => [s.id, s]));
const drawn = (...ids) => ids.flatMap((id) => site[id].pieces);
const sides = ['near', 'far'];
// Pieces moved by an [x, y, z] offset, each kind along the axes its shape stores, its cut planes with it.
const shifted = (pieces, by) => pieces.map((p) => {
  const clip = p.clip?.map(({ normal, offset }) => ({ normal, offset: offset + normal[0] * by[0] + normal[1] * by[1] + normal[2] * by[2] }));
  const moved = { ...p, ...(clip ? { clip } : {}) };
  if (p.kind === 'box') return { ...moved, min: p.min.map((v, i) => v + by[i]), max: p.max.map((v, i) => v + by[i]) };
  if (p.kind === 'turned') return { ...moved, origin: p.origin.map((v, i) => v + by[i]) };
  const [along, u, v] = { x: [0, 1, 2], y: [1, 2, 0], z: [2, 0, 1] }[p.axis];
  return { ...moved, profile: p.profile.map(([a, b]) => [a + by[u], b + by[v]]), start: p.start + by[along], end: p.end + by[along] };
});
const lift = (pieces, dy) => shifted(pieces, [0, dy, 0]);
// The body every wheel turns inside: the hull, its glacis and what is fitted on its outside near the wheels.
const body = drawn('hull', 'glacis', 'pannier_far', 'side_step', 'headlamp_near', 'headlamp_far', 'tail_lamp_near', 'tail_lamp_far');
const running = sites.filter((s) => /_wheel_(near|far)$|_wheel_(brake_disc|caliper)_/.test(s.id));
// Wheels are large, so they are sampled coarsely: a meeting at this step means the well's air is gone.
const AIR = 0.02;

test('every site id is unique and the carrier defines only parts of its own name', () => {
  assert.equal(new Set(sites.map((s) => s.id)).size, sites.length);
  assert.ok(own.every((id) => id.startsWith('apc_scifi_wheeled_')));
});

test('every wheel and brake turns clear of the hull and pannier', () => {
  assert.ok(running.length > 0, 'vacuous: no wheel sites');
  for (const s of running) assert.ok(!meeting(s.pieces, body, AIR).touches, `${s.id} meets the body`);
});

test('a wheel raised by its well air rubs the well, so the clearance check can fail', () => {
  const wheel = site.front_wheel_near;
  assert.ok(meeting(lift(wheel.pieces, spec.archGap + AIR), body, AIR).touches);
});

// Rays straight across the hull through the front wells, from the belly to the fender's top, and how many of them meet
// nothing, so a gap between the glacis and the fender that lets one see through the nose is caught. The wheels are
// left out, so a tyre behind a gap does not hide it.
const RAY_STEP = 0.05;
function sightlinesOverFrontWheels(pieces) {
  const lid = drawn('hull').filter((p) => p.id.startsWith('front_well_top')).map(solid);
  const [x0, x1] = [Math.min(...lid.map((p) => p.min[0])), Math.max(...lid.map((p) => p.max[0]))];
  const top = Math.max(...lid.map((p) => p.max[1]));
  const solids = pieces.map(solid);
  const half = spec.body.half;
  let rays = 0;
  let clear = 0;
  for (let x = x0 + RAY_STEP / 2; x < x1; x += RAY_STEP) {
    for (let y = spec.body.belly + RAY_STEP / 2; y < top; y += RAY_STEP) {
      const crossing = solids.filter((p) => p.min[0] <= x && x <= p.max[0] && p.min[1] <= y && y <= p.max[1]);
      let blocked = false;
      for (let z = -half; z <= half && !blocked; z += spec.grain / 2) blocked = crossing.some((p) => p.distance([x, y, z]) < 0);
      rays++;
      if (!blocked) clear++;
    }
  }
  return { rays, clear };
}

test('no sightline crosses the nose between the front wells', () => {
  const { rays, clear } = sightlinesOverFrontWheels(drawn('hull', 'glacis'));
  assert.ok(rays > 0, 'vacuous: no rays through the front wells');
  assert.equal(clear, 0, `${clear} of ${rays} rays see through the nose`);
});

test('without the wells\' wedges a sightline crosses the nose, so the see-through check can fail', () => {
  const open = drawn('hull', 'glacis').filter((p) => !p.id.startsWith('well_wedge'));
  assert.ok(sightlinesOverFrontWheels(open).clear > 0);
});

test('each axle stub reaches its brake disc hat and clears the caliper', () => {
  for (const axle of ['front', 'rear']) {
    for (const side of sides) {
      const stubs = site[`${axle}_axle`].pieces.filter((p) => p.id.startsWith(`stub_${side}`));
      const hat = site[`${axle}_wheel_brake_disc_${side}`].pieces.filter((p) => p.id.startsWith('hat'));
      const caliper = drawn(`${axle}_wheel_caliper_${side}`);
      assert.ok(meeting(stubs, hat, 0.005).touches, `${axle} ${side} stub misses its hat`);
      assert.ok(!meeting(stubs, caliper, 0.005).touches, `${axle} ${side} stub meets its caliper`);
    }
  }
});

test('every fitting rests on the part that carries it', () => {
  const carried = [
    ['roof', 'hull'], ['vision_block', 'glacis'], ['ramp', 'hull'], ['side_door', 'hull'],
    ['side_step', 'hull'], ['driver_seat', 'hull'], ['controls', 'hull'], ['locker', 'hull'], ['rack', 'hull'],
    ['bay_bench_far', 'hull'], ['pannier_far', 'hull'], ['weapon_station', 'roof'], ['cannon', 'weapon_station'],
  ];
  for (const side of sides) {
    carried.push([`rear_bench_${side}`, 'hull'], [`launcher_${side}`, 'weapon_station'], [`hatch_${side}`, 'roof'],
      [`roof_rail_${side}`, 'roof'], [`headlamp_${side}`, 'hull'], [`tail_lamp_${side}`, 'hull']);
  }
  // A gap finer than half the voxel grain closes in the build, so the check samples no finer.
  for (const [fitting, carrier] of carried) assert.ok(meeting(drawn(fitting), drawn(carrier), spec.grain / 2).touches, `${fitting} floats off ${carrier}`);
  // The glacis spans the whole nose, so it is sampled only against the side walls it rests on, to stay quick.
  const walls = drawn('hull').filter((p) => p.id.startsWith('side_wall_fore'));
  assert.ok(walls.length > 0 && meeting(drawn('glacis'), walls, spec.grain / 2).touches, 'glacis floats off the hull');
});

test('a vision block moved off the glacis floats, so the cut plates are sampled', () => {
  assert.ok(!meeting(shifted(drawn('vision_block'), [0, 2 * spec.grain + spec.body.wall, 0]), drawn('glacis'), spec.grain / 2).touches);
});

test('the cannon runs clear of the roof rails and launchers', () => {
  const roof = drawn('roof_rail_near', 'roof_rail_far', 'launcher_near', 'launcher_far');
  assert.ok(!meeting(drawn('cannon'), roof, 0.01).touches);
});

test('each roof rail stands on its posts alone, its bar clear of the roof', () => {
  const roof = drawn('roof');
  for (const side of sides) {
    const rail = drawn(`roof_rail_${side}`);
    const bar = rail.filter((p) => p.id.startsWith('bar'));
    const posts = rail.filter((p) => p.id.startsWith('post'));
    assert.ok(!meeting(bar, roof, 0.01).touches, `${side} bar meets the roof`);
    for (const post of posts) {
      assert.ok(meeting([post], roof, 0.005).touches, `${side} ${post.id} floats off the roof`);
      assert.ok(meeting([post], bar, 0.005).touches, `${side} ${post.id} misses the bar`);
    }
  }
});

test('a rail bar dropped to the roof meets it, so the rail clearance check can fail', () => {
  const bar = drawn('roof_rail_near').filter((p) => p.id.startsWith('bar'));
  assert.ok(meeting(lift(bar, -spec.rails.height), drawn('roof'), 0.01).touches);
});

// The player's doll crouching, from its own measures: the thighs level, so the hips sit at the shin and foot's height
// below the bust upright on them, and as wide as its shoulders. Its depth is a level thigh and the shin in front of it.
const crouch = {
  height: leg.length - leg.thighLength
    + bust.pelvisHeight + bust.waistHeight + bust.ribHeight + bust.chestHeight + bust.neckHeight + bust.headHeight + bust.hairThickness,
  width: bust.chestWidth + 2 * (bust.shoulderWidth - bust.deltoidInset),
  depth: leg.thighLength + leg.shinDepth,
};
// How far the hull, its fittings and its seats may reach into the crouching doll on its way in: a little clipping
// of a stooped head or a shoulder against a door frame passes, a blocked aisle does not.
const CROUCH_OVERLAP_ALLOWED = 0.1;
// The doors swing clear of their openings, so their leaves are no obstacle to a crew walking in.
const fixed = sites.filter((s) => !['ramp', 'side_door'].includes(s.id)).flatMap((s) => s.pieces).map(solid);
const floorTop = spec.body.belly + spec.body.wall;
const STRIDE = 0.1;
const GRAIN = 0.03;

// How deep any solid reaches into the crouching doll's box, stood on the floor at (x, z) and facing along the x or z
// axis.
function reachInto(pieces, x, z, along) {
  const [hx, hz] = along === 'x' ? [crouch.depth / 2, crouch.width / 2] : [crouch.width / 2, crouch.depth / 2];
  const min = [x - hx, floorTop, z - hz];
  const max = [x + hx, floorTop + crouch.height, z + hz];
  const near = pieces.filter((p) => [0, 1, 2].every((i) => p.min[i] < max[i] && p.max[i] > min[i]));
  let deepest = 0;
  for (let px = min[0]; px <= max[0]; px += GRAIN) {
    for (let py = min[1]; py <= max[1]; py += GRAIN) {
      for (let pz = min[2]; pz <= max[2]; pz += GRAIN) {
        const p = [px, py, pz];
        const depth = Math.min(...[0, 1, 2].map((i) => Math.min(p[i] - min[i], max[i] - p[i])));
        if (depth > deepest && near.some((s) => s.distance(p) < 0)) deepest = depth;
      }
    }
  }
  return deepest;
}

// The deepest reach into the doll walked along a route's waypoints, every stride.
function walk(route, pieces = fixed) {
  let deepest = 0;
  for (let i = 0; i + 1 < route.length; i++) {
    const [[x0, z0], [x1, z1]] = [route[i], route[i + 1]];
    const along = Math.abs(x1 - x0) > Math.abs(z1 - z0) ? 'x' : 'z';
    const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / STRIDE);
    for (let k = 0; k <= steps; k++) deepest = Math.max(deepest, reachInto(pieces, x0 + (x1 - x0) * k / steps, z0 + (z1 - z0) * k / steps, along));
  }
  return deepest;
}

test('a crouching player fits through every door and along every aisle to the seats', () => {
  const routes = Object.entries(spec.routes);
  assert.ok(routes.length > 0, 'vacuous: no routes');
  for (const [name, route] of routes) {
    const deepest = walk(route);
    assert.ok(deepest <= CROUCH_OVERLAP_ALLOWED, `${name}: the carrier reaches ${deepest.toFixed(2)} m into a crouching player`);
  }
});

test('a route moved off the side door into the wall is blocked, so the crouch check can fail', () => {
  const offDoor = spec.routes.sideToBayBench.map(([x, z]) => [x + 1, z]);
  assert.ok(walk(offDoor) > CROUCH_OVERLAP_ALLOWED);
});
