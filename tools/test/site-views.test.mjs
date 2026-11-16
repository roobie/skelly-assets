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
const { explodable, hasSmooth, movers, registerModels, siteNode, smoothEntry, spread, swing, wornEntry } = await import(
  '../../site/render.mjs'
);

const door = [{ kind: 'hinge', axis: { from: [1, 0, 0], to: [1, 1, 0] }, angle: 90, share: 1 }];
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
