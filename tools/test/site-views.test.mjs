import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

import { TOOLS_FILES } from '../../site/tools.mjs';

// site/ has no packages of its own, since the page takes three from its import map, so the test lends it the tools' copy.
// The modules the build ships from tools/ are found there too, as the served site has them beside its own.
const lent = (specifier) => specifier === 'three' || specifier.startsWith('three/');
const fromTools = (specifier) => specifier.startsWith('./') && TOOLS_FILES.includes(specifier.slice(2));
registerHooks({
  resolve: (specifier, context, next) => {
    if (fromTools(specifier)) return next(new URL(`../${specifier.slice(2)}`, import.meta.url).href, context);
    return next(specifier, lent(specifier) ? { ...context, parentURL: import.meta.url } : context);
  },
});
const THREE = await import('three');
const { atStop, explodable, hasSmooth, movers, registerModels, siteNode, smoothEntry, spread, swing, wornEntry } =
  await import('../../site/render.mjs');

const door = {
  stages: [{ kind: 'hinge', axis: { from: [1, 0, 0], to: [1, 1, 0] }, angle: 90, share: 1 }],
  stops: [
    { name: 'rest', clock: 0 },
    { name: 'open', clock: 1 },
  ],
};
const placed = (name, at) => {
  const part = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5));
  part.name = name;
  part.position.fromArray(at);
  return part;
};

test('a part that opens still comes apart in the exploded view, whatever its pose', () => {
  const scene = new THREE.Group();
  const shell = placed('shell', [0, 0, 0]);
  const panel = placed('door', [1.5, 0, 0]);
  scene.add(siteNode(shell, false), siteNode(panel, true));
  const moving = movers(scene, { moving: [{ index: 1, layers: [door] }] });
  for (const clock of [0, 1]) {
    swing(moving, clock);
    const parts = explodable(scene, { sites: [] });
    const where = (share) => {
      spread(parts, share);
      scene.updateMatrixWorld(true);
      return panel.getWorldPosition(new THREE.Vector3());
    };
    const moved = where(1).sub(where(0));
    assert.ok(moved.length() > 0.01, `the door stays put when exploded at clock ${clock}`);
    assert.ok(moved.distanceTo(parts[1].offset) < 1e-9);
  }
});

test('a model, a vehicle or a worn view is drawn smooth only when everything it shows has a smooth copy', () => {
  const copy = (id) => ({ file: `pack.smooth/${id}.glb`, bytes: 10 });
  const panel = { id: 'panel', file: 'pack/panel.glb', bytes: 30, smooth: copy('panel') };
  const doll = { id: 'doll', file: 'pack/doll.glb', bytes: 40, smooth: copy('doll') };
  const mob = { id: 'mob', file: 'mobs/mob.glb', bytes: 50 };
  registerModels([panel, doll, mob]);
  const smooth = smoothEntry(panel);
  assert.deepEqual([smooth.file, smooth.bytes], [panel.smooth.file, panel.smooth.bytes]);
  assert.notEqual(smooth.id, panel.id, 'the smooth copy would share the voxel file in the load cache');
  assert.ok(!hasSmooth(mob));
  const vehicle = {
    id: 'cart',
    sites: [
      { site: 'left', model: 'panel' },
      { site: 'right', model: 'panel' },
    ],
  };
  assert.ok(hasSmooth(vehicle));
  assert.ok(smoothEntry(vehicle).smoothSites);
  assert.deepEqual(smoothEntry(vehicle).sites, vehicle.sites);
  assert.ok(!hasSmooth({ id: 'mixed', sites: [...vehicle.sites, { site: 'rider', model: 'mob' }] }));
  const vest = {
    id: 'vest',
    worn: [
      { site: 'bust', model: 'doll' },
      { site: 'vest', model: 'panel' },
    ],
  };
  assert.ok(hasSmooth(wornEntry(vest)));
});

test("a gun's stop stands its action and the parts that move outside it there, each by its own motion", () => {
  const slide = (travel) => ({
    stages: [{ kind: 'slide', direction: [1, 0, 0], travel, share: 1 }],
    stops: [
      { name: 'rest', clock: 0 },
      { name: 'open', clock: 1 },
    ],
  });
  const scene = new THREE.Group();
  const part = (id, family) => {
    const node = placed(id, [0, 0, 0]);
    node.userData = { part: id, family };
    scene.add(node);
  };
  part('carrier', 'bolt-carrier');
  part('cover', 'port-cover');
  const entry = {
    id: 'gun',
    action: { parts: { carrier: { node: 'carrier:bolt-carrier', motion: slide(-1) } } },
    moving: [{ node: 'cover:port-cover', motion: slide(2) }],
  };
  const posed = atStop(scene, {}, entry, 'open');
  posed.updateMatrixWorld(true);
  const xOf = (id) => posed.getObjectByName(id).getWorldPosition(new THREE.Vector3()).x;
  assert.ok(Math.abs(xOf('carrier') + 1) < 1e-9, 'the carrier strokes');
  assert.ok(Math.abs(xOf('cover') - 2) < 1e-9, 'the cover opens');
});

test('a stop only the carrier names stands the carrier there and leaves the rider at rest', () => {
  const carrier = {
    stages: [{ kind: 'slide', direction: [1, 0, 0], travel: 2, share: 1 }],
    stops: [
      { name: 'rest', clock: 0 },
      { name: 'out', clock: 0.5 },
    ],
  };
  const scene = new THREE.Group();
  const panel = placed('door', [0, 0, 0]);
  scene.add(siteNode(panel, true));
  const loaded = { moving: [{ index: 0, layers: [carrier, door] }] };
  const posed = atStop(scene, loaded, {}, 'out');
  posed.updateMatrixWorld(true);
  assert.ok(Math.abs(panel.getWorldPosition(new THREE.Vector3()).x - 1) < 1e-9);
  assert.ok(Math.abs(panel.getWorldQuaternion(new THREE.Quaternion()).w - 1) < 1e-9, 'the rider stays shut');
});
