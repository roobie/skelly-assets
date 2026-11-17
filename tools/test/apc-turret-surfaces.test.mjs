import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { applyPoint, scale } from '../packages/construct/src/foundation/math.ts';
import { buildItem, loadCatalogue } from '../packages/thing-authoring-tool/src/catalogue.ts';
import { exportItem } from '../packages/thing-authoring-tool/src/exports.ts';
import { compound } from '../packages/thing-authoring-tool/src/families/compound.ts';
import { solid } from '../pieceSolid.mjs';
import { coplanarArea, trianglesOf } from './surface-helpers.mjs';

const {
  spec: s,
  fittingClass,
  grain,
  rows,
  settings,
  otherTurrets,
} = JSON.parse(
  evaluateJsonnet(`{
  spec: (import 'models/vehicles/turrets.libsonnet').apc_turret,
  fittingClass: (import 'models/vehicles/turret-classes.libsonnet')[self.spec.class],
  grain: (import 'models/vehicles/kit.libsonnet').grain,
  rows: import 'models/vehicles/apc.libsonnet',
  settings: import 'models/item-settings.libsonnet',
  otherTurrets: local kit = import 'models/vehicles/turret-kit.libsonnet';
    { [name]: kit.turretRows(name)[0] for name in kit.names if name != 'apc_turret' },
}`),
);
const core = rows.find((r) => r.id === 'apc_turret_core');
const fused = rows.find((r) => r.id === 'apc_turret');
const pieces = (r) => JSON.parse(r.parts[0].params.pieces);
const contains = (p, point) => solid(p).distance(point) <= 1e-9;
const corePieces = pieces(core);
const walls = corePieces.filter((p) => p.id.startsWith('face_'));
const roof = corePieces.filter((p) => p.id.startsWith('roof_'));
const roofLow = s.height - s.wall;
const apothem = (y) =>
  (s.shell.baseRadius + ((s.shell.roofRadius - s.shell.baseRadius) * y) / s.height) * Math.cos(Math.PI / s.shell.sides);
// The wall courses of one sloped face, bottom first.
const courses = (face) =>
  walls.filter((p) => p.id.match(/^(face_.+)_\d+$/)?.[1] === face).sort((a, b) => a.start - b.start);
const faces = [...new Set(walls.map((p) => p.id.replace(/_\d+$/, '')))];
const guns = s.fittings.filter((f) => ['heavyGun', 'coaxGun'].includes(f.key));
const hatches = s.fittings.filter((f) => f.key === 'hatch');
// The mask opening spans the bands the tallest receiver reaches, as the kit's gunBands picks them.
const bandHeight = s.height / s.bands;
const bore = guns[0].at[1];
const receiverHalf = Math.max(...guns.map((g) => fittingClass[g.key].receiver.height / 2));
const gunLow = Math.floor((bore - receiverHalf) / bandHeight) * bandHeight;

test('APC turret has continuous clipped armour faces rather than seven stacked rings', () => {
  assert.deepEqual(
    faces.sort(),
    [
      ...Array.from({ length: s.shell.sides - 1 }, (_, j) => `face_${j + 1}`),
      'face_front_far',
      'face_front_high',
      'face_front_low',
    ].sort(),
  );
  assert.ok(!corePieces.some((p) => p.id.startsWith('band_')));
  assert.ok(walls.every((p) => p.kind === 'prism' && p.clip.length >= 2));
  const side = courses('face_3');
  for (const y of [0.01, 0.06, 0.1, 0.19, 0.26, 0.33, 0.4]) {
    const outside = apothem(y);
    const inSide = (point) => side.some((p) => contains(p, point));
    assert.ok(inSide([0, y, outside - 0.0001]), `outer face at ${y}`);
    assert.ok(!inSide([0, y, outside + 0.0001]), `outside at ${y}`);
    assert.ok(inSide([0, y, outside - s.wall + 0.0001]), `inner face at ${y}`);
    assert.ok(!inSide([0, y, outside - s.wall - 0.0001]), `cavity at ${y}`);
  }
});

test('each sloped face is stacked in courses cut on the voxel lattice, so its collision boxes hug the slope', () => {
  for (const face of faces.filter((f) => courses(f).length > 0)) {
    const stack = courses(face);
    for (let i = 1; i < stack.length; i++) {
      const cut = stack[i].start;
      assert.equal(stack[i - 1].end, cut, `${face} courses meet`);
      assert.ok(Math.abs(cut / grain - Math.round(cut / grain)) < 1e-9, `${face} cut at ${cut} lies on the lattice`);
      assert.deepEqual(stack[i].clip, stack[0].clip, `${face} courses share one pair of sloping planes`);
    }
    for (const p of stack) assert.ok(p.end - p.start <= 3 * grain, `${p.id} is about two voxel layers tall`);
  }
  assert.equal(courses('face_3')[0].start, 0);
  assert.equal(courses('face_3').at(-1).end, s.height);
});

test('roof fills the walls’ inner planes and retains the hatch opening', () => {
  const hatch = hatches[0];
  assert.ok(roof.length > 1);
  assert.ok(roof.every((p) => p.start === roofLow && p.end === s.height));
  const side = courses('face_3');
  for (const y of [roofLow + 0.001, s.height - 0.001]) {
    const inner = apothem(y) - s.wall;
    assert.ok(
      roof.some((p) => contains(p, [0, y, inner - 0.0001])),
      `roof reaches the inner face at ${y}`,
    );
    assert.ok(!roof.some((p) => contains(p, [0, y, inner + 0.0001])), `roof stays within the walls at ${y}`);
    assert.ok(
      side.some((p) => contains(p, [0, y, inner + 0.0001])),
      `wall runs up beside the roof at ${y}`,
    );
    assert.ok(!corePieces.some((p) => contains(p, [hatch.at[0], y, hatch.at[2]])), 'hatch remains open');
  }
});

test('front cheek closes beside the mask while both gun ports remain open', () => {
  // The cheek is the front face's sliver between the mask's far edge and the face's corner. Mid-wall, it narrows
  // upward from the mask opening's bottom until the corner meets the mask's edge; the probe stands halfway up it.
  const half = Math.tan(Math.PI / s.shell.sides);
  const midWall = (y) => apothem(y) - s.wall / 2;
  const slope = apothem(1) - apothem(0);
  const closes = (-s.mask.across[0] / half + s.wall / 2 - apothem(0)) / slope;
  assert.ok(closes > gunLow, 'the front face is wider than the mask at the opening, so a cheek is needed');
  const y = (gunLow + closes) / 2;
  const x = midWall(y);
  assert.ok(
    corePieces.some((p) => contains(p, [x, y, (s.mask.across[0] - x * half) / 2])),
    'far mask corner is backed by armour',
  );
  for (const gun of guns) {
    for (const x of [gun.at[0] + 0.001, s.mask.front - 0.001]) {
      assert.ok(!corePieces.some((p) => contains(p, [x, gun.at[1], gun.at[2]])), `${gun.site} bore at ${x}`);
    }
  }
});

test('opaque turret core has no duplicated same-facing planar surfaces', () => {
  const surfaces = corePieces.map((piece) => ({
    id: piece.id,
    triangles: trianglesOf(compound({ pieces: JSON.stringify([piece]) })[0]),
  }));
  const conflicts = [];
  for (let i = 0; i < surfaces.length; i++) {
    for (const b of surfaces.slice(i + 1)) {
      const a = surfaces[i];
      let area = 0;
      for (const t of a.triangles) {
        const aligned = b.triangles.filter(
          (u) => t.normal.reduce((sum, v, axis) => sum + v * u.normal[axis], 0) > 0.999999,
        );
        area += coplanarArea([t], aligned);
      }
      if (area > 1e-8) conflicts.push(`${a.id} vs ${b.id}: ${area}`);
    }
  }
  assert.deepEqual(conflicts, []);
});

test('other turret designs retain their legacy shell until explicitly migrated', () => {
  assert.deepEqual(Object.keys(otherTurrets), ['cv9040_turret', 'mbt_turret']);
  for (const row of Object.values(otherTurrets)) {
    assert.ok(
      pieces(row).some((p) => p.id.startsWith('band_')),
      row.id,
    );
    assert.ok(!pieces(row).some((p) => p.id.startsWith('face_')), row.id);
  }
});

const selected = loadCatalogue({ ...settings, items: [core, fused] }).items;
const voxel = { voxelGrain: grain };
const exported = (item) =>
  exportItem(item, settings, { id: item.id, file: `assets/models/${item.id}.glb` }, voxel, { collision: true });

test('core and fused turret export on production grain with their original IDs and mass', () => {
  assert.equal(fused.id, 'apc_turret');
  for (const item of selected) {
    const out = exported(item);
    assert.ok(out.glb.length > 0);
    assert.ok(out.smoothGlb.length > 0);
  }
  assert.equal(fused.parts[0].massKg, s.massKg);
  assert.equal(core.parts[0].massKg, 363.5);
  const fittingPieces = pieces(fused).filter((p) => !corePieces.some((c) => c.id === p.id));
  assert.ok(fittingPieces.length > 0, 'fused copy retains its fittings');
});

const coreItem = selected.find((item) => item.id === core.id);
const built = buildItem(coreItem, settings, voxel);
const fill = built.drawn.voxels('body');
const cellCentre = (cell) => cell.map((i, axis) => fill.origin[axis] + (i + 0.5) * fill.grain);

test('core voxels keep a closed shell of about the legacy volume', () => {
  // Main's banded shell drew 4605 voxels; the continuous one drops the bands' overhangs and stays within a few percent.
  assert.ok(fill.cells.size > 4400 && fill.cells.size < 4700, `${fill.cells.size} voxels`);
  const filled = new Set(fill.cells.keys().map((key) => fill.cells.voxelOf(key).join(',')));
  const all = [...filled].map((key) => key.split(',').map(Number));
  const lo = [0, 1, 2].map((a) => Math.min(...all.map((c) => c[a])) - 1);
  const hi = [0, 1, 2].map((a) => Math.max(...all.map((c) => c[a])) + 1);
  // The intended openings, widened by a voxel so the lattice cannot slip a cell round their edges: the open bottom on
  // the turret ring, each roof hatch and each gun port through the mask.
  const opening = (cell) => {
    const [x, y, z] = cellCentre(cell);
    if (y < 0) return true;
    const lid = (h) => fittingClass[h.key].radius + grain;
    if (hatches.some((h) => y > roofLow - grain && Math.hypot(x - h.at[0], z - h.at[2]) < lid(h))) return true;
    return guns.some((g) => {
      const half = fittingClass[g.key].barrel.radius + grain;
      return x > g.at[0] - grain && Math.abs(y - g.at[1]) < half && Math.abs(z - g.at[2]) < half;
    });
  };
  const seed = [0, s.height / 2, 0].map((m, axis) => Math.floor((m - fill.origin[axis]) / fill.grain));
  const seen = new Set([seed.join(',')]);
  const queue = [seed];
  for (const cell of queue) {
    assert.ok(
      cell.every((c, a) => c > lo[a] && c < hi[a]),
      `the cavity leaks out at ${cellCentre(cell)}`,
    );
    for (const axis of [0, 1, 2]) {
      for (const step of [-1, 1]) {
        const next = cell.map((c, a) => (a === axis ? c + step : c));
        const key = next.join(',');
        if (!(seen.has(key) || filled.has(key) || opening(next))) {
          seen.add(key);
          queue.push(next);
        }
      }
    }
  }
});

test('the sloped walls and roof draw their voxels in terraces two layers tall', () => {
  const terraced = corePieces.filter((p) => p.terrace !== undefined);
  assert.deepEqual(
    [...walls, ...roof].filter((p) => p.terrace !== 2).map((p) => p.id),
    [],
    'every wall and roof piece terraces by two layers',
  );
  // Only the terraced pieces, so the mask boxes and the jacket, which draw as authored, do not mask a broken step.
  const [part] = core.parts;
  const row = { ...core, parts: [{ ...part, params: { ...part.params, pieces: JSON.stringify(terraced) } }] };
  const [item] = loadCatalogue({ ...settings, items: [row] }).items;
  const cells = buildItem(item, settings, voxel).drawn.voxels('body').cells;
  const layers = new Map();
  for (const key of cells.keys()) {
    const [x, y, z] = cells.voxelOf(key);
    layers.set(y, [...(layers.get(y) ?? []), `${x},${z}`]);
  }
  // Every step below the roof: the roof plate's own thickness does not span whole steps.
  for (let y = 0; (y + 2) * grain <= roofLow; y += 2) {
    assert.deepEqual(layers.get(y + 1)?.sort(), layers.get(y)?.sort(), `layers ${y} and ${y + 1} hold the same cells`);
  }
});

test('core collision boxes leave the turret interior about as open as the banded shell did', () => {
  const boxes = exported(coreItem).modelEntry.parts.body.collision;
  const placed = built.report.resolved.placed.get('body');
  const toModel = (point) => scale(applyPoint(placed, point), settings.units.metresPerUnit);
  const inBox = (p) => boxes.some((b) => [0, 1, 2].every((a) => p[a] >= b.min[a] && p[a] <= b.max[a]));
  const back = guns[0].at[0];
  const step = 0.01;
  let samples = 0;
  let covered = 0;
  // A 1 cm sample of the cavity inside the inner wall, under the roof and behind the mask.
  for (let x = -s.shell.baseRadius; x < back; x += step) {
    for (let z = -s.shell.baseRadius; z <= s.shell.baseRadius; z += step) {
      for (let y = step / 2; y < roofLow; y += step) {
        const inner = apothem(y) - s.wall;
        const inside = Array.from({ length: s.shell.sides }, (_, j) => (j * 2 * Math.PI) / s.shell.sides).every(
          (a) => x * Math.cos(a) + z * Math.sin(a) < inner,
        );
        if (!inside) continue;
        samples++;
        if (inBox(toModel([x, y, z]))) covered++;
      }
    }
  }
  // On this sample the banded shell covered 17.1% of the cavity, full-height sloped plates 43.9%, the terraced
  // courses 16.6%.
  assert.ok(covered / samples < 0.19, `${((100 * covered) / samples).toFixed(1)}% of the cavity is inside a box`);
});
