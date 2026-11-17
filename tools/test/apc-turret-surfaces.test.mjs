import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { loadCatalogue } from '../packages/thing-authoring-tool/src/catalogue.ts';
import { exportItem } from '../packages/thing-authoring-tool/src/exports.ts';
import { compound } from '../packages/thing-authoring-tool/src/families/compound.ts';
import { solid } from '../pieceSolid.mjs';
import { coplanarArea, trianglesOf } from './surface-helpers.mjs';

const {
  spec: s,
  rows,
  settings,
  otherTurrets,
} = JSON.parse(
  evaluateJsonnet(`{
  spec: (import 'models/vehicles/turrets.libsonnet').apc_turret,
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
const apothem = (y) =>
  (s.shell.baseRadius + ((s.shell.roofRadius - s.shell.baseRadius) * y) / s.height) * Math.cos(Math.PI / s.shell.sides);

test('APC turret has continuous clipped armour faces rather than seven stacked rings', () => {
  assert.equal(walls.length, 14);
  assert.ok(!corePieces.some((p) => p.id.startsWith('band_')));
  assert.ok(walls.every((p) => p.kind === 'prism' && p.clip.length >= 2));
  const side = walls.find((p) => p.id === 'face_3');
  for (const y of [0.01, 0.06, 0.1, 0.19, 0.26, 0.33, 0.4]) {
    const outside = apothem(y);
    assert.ok(contains(side, [0, y, outside - 0.0001]), `outer face at ${y}`);
    assert.ok(!contains(side, [0, y, outside + 0.0001]), `outside at ${y}`);
    assert.ok(contains(side, [0, y, outside - s.wall + 0.0001]), `inner face at ${y}`);
    assert.ok(!contains(side, [0, y, outside - s.wall - 0.0001]), `cavity at ${y}`);
  }
});

test('roof follows the same taper and retains the hatch opening without a top-face overlap', () => {
  const roofLow = s.height - s.wall;
  const hatch = s.fittings.find((f) => f.key === 'hatch');
  assert.ok(roof.length > 1);
  assert.ok(walls.every((p) => p.end <= roofLow));
  assert.ok(roof.every((p) => p.start === roofLow && p.end === s.height));
  for (const y of [roofLow + 0.001, s.height - 0.001]) {
    assert.ok(roof.some((p) => contains(p, [0, y, apothem(y) - 0.0001])));
    assert.ok(!roof.some((p) => contains(p, [0, y, apothem(y) + 0.0001])));
    assert.ok(!corePieces.some((p) => contains(p, [hatch.at[0], y, hatch.at[2]])), 'hatch remains open');
  }
});

test('front cheek closes beside the mask while both gun ports remain open', () => {
  const y = 0.07;
  assert.ok(
    corePieces.some((p) => contains(p, [apothem(y) - 0.001, y, -0.158])),
    'far mask corner is backed by armour',
  );
  const guns = s.fittings.filter((f) => ['heavyGun', 'coaxGun'].includes(f.key));
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

test('core and fused turret export on production grain with their original IDs and mass', () => {
  assert.equal(fused.id, 'apc_turret');
  const selected = loadCatalogue({ ...settings, items: [core, fused] });
  const exports = selected.items.map((item) =>
    exportItem(item, settings, { id: item.id, file: `assets/models/${item.id}.glb` }, { voxelGrain: 0.03125 }),
  );
  for (const out of exports) {
    assert.ok(out.glb.length > 0);
    assert.ok(out.smoothGlb.length > 0);
  }
  assert.equal(fused.parts[0].massKg, s.massKg);
  assert.equal(core.parts[0].massKg, 363.5);
  const fittingPieces = pieces(fused).filter((p) => !corePieces.some((c) => c.id === p.id));
  assert.ok(fittingPieces.length > 0, 'fused copy retains its fittings');
});
