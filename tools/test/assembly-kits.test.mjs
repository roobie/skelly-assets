import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';

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
// A piece's shape and material, ignoring the id and slot names, which the fused row prefixes with the accessory's site.
const shape = (piece, finish) => {
  const { id, slot, ...geometry } = piece;
  return JSON.stringify({ geometry, material: finish[slot] }, (key, value) => (typeof value === 'number' ? Math.round(value * 1e9) / 1e9 : value));
};
const shapes = (drawn) => drawn.flatMap((d) => d.pieces.map((p) => shape(p, d.finish))).sort();

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

// The solid a piece draws, as a signed distance (negative inside) and its bounding box, so pieces of different kinds
// can be tested against each other by sampling the space their boxes share.
const ALONG = { x: [0, 1, 2], y: [1, 2, 0], z: [2, 0, 1] };
function outline(polygon, [u, v]) {
  let inside = false;
  let nearest = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i];
    const [bx, by] = polygon[(i + 1) % polygon.length];
    if ((ay > v) !== (by > v) && u < ax + ((v - ay) / (by - ay)) * (bx - ax)) inside = !inside;
    const dx = bx - ax;
    const dy = by - ay;
    const t = dx || dy ? Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy))) : 0;
    nearest = Math.min(nearest, Math.hypot(u - ax - t * dx, v - ay - t * dy));
  }
  return inside ? -nearest : nearest;
}
function solid(piece) {
  if (piece.kind === 'box') {
    return {
      min: piece.min,
      max: piece.max,
      distance: (p) => Math.max(...[0, 1, 2].map((i) => Math.max(piece.min[i] - p[i], p[i] - piece.max[i]))),
    };
  }
  const [axis, u, v] = ALONG[piece.axis];
  const min = [];
  const max = [];
  if (piece.kind === 'prism') {
    [min[axis], max[axis]] = [piece.start, piece.end];
    for (const [i, c] of [[u, 0], [v, 1]]) [min[i], max[i]] = [Math.min(...piece.profile.map((p) => p[c])), Math.max(...piece.profile.map((p) => p[c]))];
    return { min, max, distance: (p) => Math.max(outline(piece.profile, [p[u], p[v]]), piece.start - p[axis], p[axis] - piece.end) };
  }
  const o = piece.origin;
  const radius = Math.max(...piece.profile.map((p) => p[1]));
  [min[axis], max[axis]] = [o[axis] + Math.min(...piece.profile.map((p) => p[0])), o[axis] + Math.max(...piece.profile.map((p) => p[0]))];
  for (const i of [u, v]) [min[i], max[i]] = [o[i] - radius, o[i] + radius];
  return { min, max, distance: (p) => outline(piece.profile, [p[axis] - o[axis], Math.hypot(p[u] - o[u], p[v] - o[v])]) };
}

// How two drawn parts meet, sampled every `STEP` m: whether they come within a step of each other, and whether they
// share any space deeper than `DEPTH` m, which faces that only abut never do.
const STEP = 0.002;
const DEPTH = 0.0005;
function meeting(a, b) {
  let touches = false;
  let overlaps = false;
  for (const p of a.map(solid)) {
    for (const q of b.map(solid)) {
      const lo = [0, 1, 2].map((i) => Math.max(p.min[i], q.min[i]) - STEP);
      const hi = [0, 1, 2].map((i) => Math.min(p.max[i], q.max[i]) + STEP);
      if (lo.some((l, i) => l > hi[i])) continue;
      for (let x = lo[0]; x <= hi[0]; x += STEP) {
        for (let y = lo[1]; y <= hi[1]; y += STEP) {
          for (let z = lo[2]; z <= hi[2]; z += STEP) {
            const dp = p.distance([x, y, z]);
            const dq = q.distance([x, y, z]);
            if (dp <= STEP && dq <= STEP) touches = true;
            if (dp < -DEPTH && dq < -DEPTH) overlaps = true;
          }
        }
      }
    }
  }
  return { touches, overlaps };
}

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
