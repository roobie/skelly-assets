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
const body = drawn('hull', 'glacis', 'pannier_far', 'side_step', 'grab_rail_near', 'grab_rail_far', 'headlamp_near', 'headlamp_far',
  'tail_lamp_near', 'tail_lamp_far');
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
    ['sights', 'weapon_station'], ['periscopes', 'roof'],
  ];
  for (const side of sides) {
    carried.push([`rear_bench_${side}`, 'hull'], [`launcher_${side}`, 'weapon_station'], [`hatch_${side}`, 'roof'],
      [`grab_rail_${side}`, 'hull'], [`headlamp_${side}`, 'hull'], [`tail_lamp_${side}`, 'hull']);
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

// The weapon station turns all round on its ring with its cannon at any elevation down to the deck's depression, so
// everything it carries sweeps a solid of revolution about the ring's axis. It is sampled as the (radius, height) cells
// its pieces fill, the cannon level and dipped about its trunnion, so every heading is checked at once.
const turret = spec.turret;
const SWEEP_STEP = 0.02;
const turning = ['weapon_station', 'cannon', 'sights', 'launcher_near', 'launcher_far'];
const dipped = (point, degrees) => {
  const a = degrees * Math.PI / 180;
  const [dx, dy] = [point[0] - turret.trunnion, point[1] - turret.gunY];
  return [turret.trunnion + dx * Math.cos(a) + dy * Math.sin(a), turret.gunY - dx * Math.sin(a) + dy * Math.cos(a), point[2]];
};
// The points of each piece's solid, or within half a step of it so a thin plate is not missed, inside `[lo, hi]`.
function* filling(pieces, lo = [-Infinity, -Infinity, -Infinity], hi = [Infinity, Infinity, Infinity]) {
  for (const p of pieces.map(solid)) {
    const from = [0, 1, 2].map((i) => Math.max(p.min[i], lo[i]));
    const to = [0, 1, 2].map((i) => Math.min(p.max[i], hi[i]));
    for (let x = from[0]; x <= to[0]; x += SWEEP_STEP) {
      for (let y = from[1]; y <= to[1]; y += SWEEP_STEP) {
        for (let z = from[2]; z <= to[2]; z += SWEEP_STEP) if (p.distance([x, y, z]) <= SWEEP_STEP / 2) yield [x, y, z];
      }
    }
  }
}
const cell = ([x, y, z]) => [Math.round(Math.hypot(x - turret.x, z) / SWEEP_STEP), Math.round(y / SWEEP_STEP)];
// The sites whose pieces come within a cell of the turret's sweep.
function sweptInto(fixedSites) {
  // The ring is the bearing the station turns on, so it is part of the deck it sits in.
  const turnsWith = turning.flatMap((id) => site[id].pieces.filter((p) => !(id === 'weapon_station' && p.id === 'ring'))
    .map((piece) => ({ piece, dips: id === 'cannon' })));
  const swept = new Set();
  let [reach, low, high] = [0, Infinity, -Infinity];
  for (const degrees of [0, turret.deckDepression]) {
    for (const { piece, dips } of turnsWith) {
      for (const point of filling([piece])) {
        const [r, y] = cell(dips ? dipped(point, degrees) : point);
        swept.add(`${r},${y}`);
        [reach, low, high] = [Math.max(reach, r), Math.min(low, y), Math.max(high, y)];
      }
    }
  }
  const radius = (reach + 1) * SWEEP_STEP;
  const lo = [turret.x - radius, (low - 1) * SWEEP_STEP, -radius];
  const hi = [turret.x + radius, (high + 1) * SWEEP_STEP, radius];
  return fixedSites.filter((s) => {
    for (const point of filling(s.pieces, lo, hi)) {
      const [r, y] = cell(point);
      for (let dr = -1; dr <= 1; dr++) for (let dy = -1; dy <= 1; dy++) if (swept.has(`${r + dr},${y + dy}`)) return true;
    }
    return false;
  }).map((s) => s.id);
}
const deck = sites.filter((s) => !turning.includes(s.id));

test('the weapon station traverses all round with its cannon dipped over the deck, clear of every fitting', () => {
  assert.ok(site.periscopes.pieces.length > 0 && site.sights.pieces.length > 0, 'vacuous: no optics');
  assert.deepEqual(sweptInto(deck), []);
});

test('periscopes raised to the gun\'s height are swept, so the traverse check can fail', () => {
  const raised = { ...site.periscopes, pieces: lift(site.periscopes.pieces, turret.gunY - spec.body.top) };
  assert.deepEqual(sweptInto([raised]), ['periscopes']);
});

test('no roof fitting stands on a hatch lid', () => {
  const hatches = drawn('hatch_near', 'hatch_far');
  const roofFittings = drawn('periscopes', 'weapon_station');
  assert.ok(hatches.length > 0 && roofFittings.length > 0, 'vacuous: no hatches or roof fittings');
  assert.ok(!meeting(roofFittings, hatches, spec.grain / 2).touches);
});

test('a hatch slid a periscope\'s depth toward its fore periscope meets it, so the hatch check can fail', () => {
  const by = spec.optics.periscope.depth;
  assert.ok(meeting(drawn('periscopes'), shifted(drawn('hatch_near'), [by, 0, by]), spec.grain / 2).touches);
});

test('each grab rail stands off the hull on its posts alone, its bar clear of the side', () => {
  const hull = drawn('hull');
  for (const side of sides) {
    const rail = drawn(`grab_rail_${side}`);
    const bar = rail.filter((p) => p.id.startsWith('bar'));
    const posts = rail.filter((p) => p.id.startsWith('post'));
    assert.ok(bar.length > 0 && posts.length > 0, `vacuous: no ${side} rail`);
    assert.ok(!meeting(bar, hull, 0.01).touches, `${side} bar meets the hull`);
    for (const post of posts) {
      assert.ok(meeting([post], hull, 0.005).touches, `${side} ${post.id} floats off the hull`);
      assert.ok(meeting([post], bar, 0.005).touches, `${side} ${post.id} misses the bar`);
    }
  }
});

test('a rail bar pushed against the side meets it, so the rail clearance check can fail', () => {
  const bar = drawn('grab_rail_near').filter((p) => p.id.startsWith('bar'));
  assert.ok(meeting(shifted(bar, [0, 0, -spec.rails.standoff]), drawn('hull'), 0.01).touches);
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

const routes = Object.entries(spec.routes);

// Each door's opening as the plan span it lets through, the axis across it and the side of the hull it is on.
const openings = {
  side: { across: 0, span: spec.doors.side.x, along: 1, outside: (v) => v > spec.body.half },
  rear: { across: 1, span: [-spec.doors.rear.half, spec.doors.rear.half], along: 0, outside: (v) => v < spec.body.rear },
};
const seats = sites.filter((s) => ['apc_scifi_wheeled_bench', 'apc_scifi_wheeled_driver_seat'].includes(s.part));
// How a route fails to lead from outside, straight through its door's opening, to beside its own seat: the seat it
// names must be the nearest to the doll at its end, facing along its last leg, and within one crouched depth in plan.
function routeFaults({ door, seat, path }) {
  const faults = [];
  const { across, span, along, outside } = openings[door];
  const [start, next] = path;
  if (!outside(start[along])) faults.push('starts inside the hull');
  if (!(span[0] < start[across] && start[across] < span[1])) faults.push('starts beside its door');
  if (next[across] !== start[across]) faults.push('turns before it is through its door');
  const end = path.at(-1);
  const facingX = Math.abs(end[0] - path.at(-2)[0]) > Math.abs(end[1] - path.at(-2)[1]);
  const half = facingX ? [crouch.depth / 2, crouch.width / 2] : [crouch.width / 2, crouch.depth / 2];
  const apart = (lo, hi, at, reach) => Math.max(0, lo - (at + reach), at - reach - hi);
  const gap = (s) => Math.min(...s.pieces.map(solid)
    .map((p) => Math.hypot(apart(p.min[0], p.max[0], end[0], half[0]), apart(p.min[2], p.max[2], end[1], half[1]))));
  const nearest = seats.reduce((a, b) => (gap(b) < gap(a) ? b : a));
  if (nearest.id !== seat) faults.push(`ends nearer ${nearest.id} than ${seat}`);
  if (gap(site[seat]) > crouch.depth) faults.push(`ends ${gap(site[seat]).toFixed(2)} m from ${seat}`);
  return faults;
}

test('every route starts outside straight through its door\'s opening and ends beside its own seat', () => {
  assert.ok(routes.length > 0 && seats.length > 1, 'vacuous: no routes or no seats to choose between');
  for (const [name, route] of routes) assert.deepEqual(routeFaults(route), [], name);
});

test('a route that names another seat than the one it ends beside is caught, so the seat check can fail', () => {
  assert.ok(routeFaults({ ...spec.routes.sideToBayBench, seat: 'driver_seat' }).length > 0);
});

test('a crouching player fits through every door and along every aisle to the seats', () => {
  assert.ok(routes.length > 0, 'vacuous: no routes');
  for (const [name, { path }] of routes) {
    const deepest = walk(path);
    assert.ok(deepest <= CROUCH_OVERLAP_ALLOWED, `${name}: the carrier reaches ${deepest.toFixed(2)} m into a crouching player`);
  }
});

test('a route moved its door\'s width off the side door into the wall is blocked, so the crouch check can fail', () => {
  const side = spec.doors.side;
  const offDoor = spec.routes.sideToBayBench.path.map(([x, z]) => [x + side.x[1] - side.x[0], z]);
  assert.ok(walk(offDoor) > CROUCH_OVERLAP_ALLOWED);
});
