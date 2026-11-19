import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { loadCatalogue } from '../packages/thing-authoring-tool/src/catalogue.ts';
import { exportItem } from '../packages/thing-authoring-tool/src/exports.ts';
import {
  bounds,
  close,
  contains,
  coplanarOverlap,
  glbBounds,
  intersectionArea,
  placed,
} from './architecture-helpers.mjs';

const {
  spec: s,
  timber,
  rows,
  dungeon,
  wallwalk,
  settings,
  recipe,
} = JSON.parse(
  evaluateJsonnet(`{
  spec: import 'models/architecture/stone.spec.libsonnet',
  timber: import 'models/architecture/timber.spec.libsonnet',
  rows: import 'models/catalogue/sets/medieval-stone.libsonnet',
  dungeon: import 'models/architecture/stone-dungeon.example.jsonnet',
  wallwalk: import 'models/architecture/stone-wallwalk.example.jsonnet',
  settings: import 'models/item-settings.libsonnet',
  recipe: import 'models/recipes/skelly.structures.jsonnet',
}`),
);
const byId = new Map(rows.map((row) => [row.id, row]));
const idOf = (name) => `medieval_stone_${name}`;
const pieces = (name) => JSON.parse(byId.get(idOf(name)).parts[0].params.pieces);
const solidAt = (name, point) => pieces(name).some((p) => contains(p, point));
const exports = new Map();
const exported = (name) => {
  if (!exports.has(name)) {
    const id = idOf(name);
    const item = loadCatalogue({ ...settings, items: [byId.get(id)] }).items[0];
    exports.set(name, exportItem(item, settings, { id, file: `assets/models/${id}.glb` }, { voxelGrain: s.grain }));
  }
  return exports.get(name);
};

test('the twelve stone modules have unique titles and production structures selections', () => {
  assert.equal(rows.length, 12);
  assert.equal(byId.size, rows.length);
  assert.equal(new Set(rows.map(({ title }) => title)).size, rows.length);
  loadCatalogue({ ...settings, items: rows });
  for (const row of rows) {
    const selected = recipe.filter(({ id }) => id === row.id);
    assert.equal(selected.length, 1, row.id);
    assert.equal(selected[0].source, row.id);
    assert.equal(selected[0].taxonomy.category, 'structures');
    assert.ok(selected[0].taxonomy.tags.setting.includes('medieval'));
    assert.ok(selected[0].taxonomy.tags.material.includes('stone'));
  }
});

test('stone shares timber grid datums but uses thicker piers and shorter infill', () => {
  assert.equal(s.bay, timber.bay);
  assert.equal(s.storey, timber.storey);
  assert.equal(s.floor, timber.floor);
  const half = (s.bay - s.wall) / 2;
  for (const name of ['wall', 'slit_window', 'arch_doorway']) {
    const [min, max] = bounds(pieces(name));
    for (const [actual, expected] of [
      [min, [-half, 0, -s.wall / 2]],
      [max, [half, s.storey, s.wall / 2]],
    ])
      actual.forEach((v, axis) => close(v, expected[axis], `${name} datum axis ${axis}`));
    close(max[0], s.bay / 2 - s.wall / 2, `${name} meets shared pier`);
  }
  assert.deepEqual(bounds(pieces('pier')), [
    [-0.2, 0, -0.2],
    [0.2, 3, 0.2],
  ]);
  assert.deepEqual(bounds(pieces('floor')), [
    [-1, -0.2, -1],
    [1, 0, 1],
  ]);
  assert.ok(s.wall > timber.timber, 'do not interchange posts without changing infill');
});

test('doorway is truly semicircular, open through the wall, with no threshold', () => {
  for (const z of [-0.18, 0, 0.18]) {
    for (const x of [-0.54, 0, 0.54])
      for (const y of [0.02, 0.8, s.door.spring]) assert.ok(!solidAt('arch_doorway', [x, y, z]));
    for (const angle of [0.2, 0.6, Math.PI / 2, 2.6, 2.9]) {
      const r = s.door.radius - 0.08;
      assert.ok(!solidAt('arch_doorway', [r * Math.cos(angle), s.door.spring + r * Math.sin(angle), z]));
    }
  }
  assert.ok(solidAt('arch_doorway', [0.7, 1, 0]), 'jamb');
  assert.ok(solidAt('arch_doorway', [0, 2.3, 0]), 'keystone');
  assert.ok(solidAt('arch_doorway', [0, 2.8, 0]), 'wall above arch');
});

test('doorway facing stones do not overlap coplanar spandrels at the faceted arch outline', () => {
  const faces = pieces('arch_doorway').filter(({ slot }) => slot !== 'mortar');
  for (let i = 0; i < faces.length; i++)
    for (let j = i + 1; j < faces.length; j++) {
      const area = intersectionArea(faces[i].profile, faces[j].profile);
      assert.ok(area < 1e-8, `${faces[i].id} overlaps ${faces[j].id}: ${area} m²`);
    }
});

test('coplanar checks distinguish front/side overlaps from interior overlap and fitted contact', () => {
  const box = (min, max) => ({ kind: 'box', min, max });
  const a = box([0, 0, 0], [1, 1, 1]);
  assert.ok(coplanarOverlap(a, box([0.5, 0.5, 0], [1.5, 1.5, 1])));
  assert.ok(coplanarOverlap(a, box([0, 0.5, 0.5], [1, 1.5, 1.5])));
  assert.ok(!coplanarOverlap(a, box([0.2, 0.2, 0.2], [0.8, 0.8, 0.8])));
  assert.ok(!coplanarOverlap(a, box([1, 0, 0], [2, 1, 1])));
});

test('no module has overlapping coplanar stone/mortar skins, including opening returns and caps', () => {
  for (const row of rows) {
    const ps = JSON.parse(row.parts[0].params.pieces);
    for (let i = 0; i < ps.length; i++)
      for (let j = i + 1; j < ps.length; j++)
        if (ps[i].slot !== ps[j].slot) assert.ok(!coplanarOverlap(ps[i], ps[j]), `${row.id}: ${ps[i].id}, ${ps[j].id}`);
  }
});

test('the slit is unglazed and unobstructed through the full wall depth', () => {
  for (const x of [-0.1, 0, 0.1])
    for (const y of [0.96, 1.5, 2.04]) for (const z of [-0.18, 0, 0.18]) assert.ok(!solidAt('slit_window', [x, y, z]));
  for (const p of [
    [0.2, 1.5, 0],
    [0, 0.8, 0],
    [0, 2.2, 0],
  ])
    assert.ok(solidAt('slit_window', p));
});

test('all dungeon infill ends meet one shared pier, and repeated vaults abut without axial overlap', () => {
  const sites = dungeon.sites;
  const piers = sites.filter(({ model }) => model === idOf('pier'));
  assert.equal(new Set(piers.map(({ at }) => at.join(','))).size, piers.length);
  for (const site of sites.filter(({ model }) => /_(wall|slit_window|arch_doorway)$/.test(model)))
    for (const end of [-1, 1]) {
      const point = placed(site, [(end * (s.bay - s.wall)) / 2, s.storey / 2, 0]);
      assert.equal(
        piers.filter((pier) => point.every((v, axis) => axis === 1 || Math.abs(v - pier.at[axis]) <= s.wall / 2 + 1e-9))
          .length,
        1,
        site.site,
      );
    }
  const vaults = sites.filter(({ model }) => model === idOf('vault_4m')).sort((a, b) => a.at[2] - b.at[2]);
  const [min, max] = bounds(pieces('vault_4m'));
  close(min[2], -s.bay / 2, 'vault repeat start');
  close(max[2], s.bay / 2, 'vault repeat end');
  for (let i = 1; i < vaults.length; i++) close(vaults[i - 1].at[2] + max[2], vaults[i].at[2] + min[2], 'vault seam');
  const front = sites.find(({ site }) => site === 'front-arch');
  const rear = sites.find(({ site }) => site === 'rear-end-panel');
  close(front.at[2] + bounds(pieces('arch_4m'))[0][2], 3, 'front arch abuts vault');
  close(rear.at[2] + bounds(pieces('vault_end_4m'))[1][2], -3, 'end panel abuts vault');
  assert.equal(sites.filter(({ model }) => model === idOf('floor')).length, 6);
});

test('arch and vault leave the passage clear and sit on the inside half of the supporting walls', () => {
  for (const name of ['arch_4m', 'vault_4m']) {
    for (const angle of [0.1, 0.4, 1, Math.PI / 2, 2.2, 3]) {
      const r = s.vault.radius - 0.08;
      assert.ok(!solidAt(name, [r * Math.cos(angle), r * Math.sin(angle), 0]));
      const middle = s.vault.radius + s.vault.ring / 2;
      assert.ok(solidAt(name, [middle * Math.cos(angle), middle * Math.sin(angle), 0]), 'continuous ring core');
    }
    const [min, max] = bounds(pieces(name));
    close(min[0], -2, 'left spring edge');
    close(max[0], 2, 'right spring edge');
    close(min[1], 0, 'spring datum');
  }
  close(s.vault.radius, 2 - s.wall / 2, 'interior wall/vault clearance');
  const end = bounds(pieces('vault_end_4m'));
  close(end[0][0], -2, 'end panel left edge');
  close(end[1][1], 2, 'end panel crown');
});

test('stairs use lattice-aligned risers and land on the plinth and wall-walk without gaps', () => {
  const steps = pieces('stair');
  assert.equal(steps.length, s.stair.steps);
  let previous = 0;
  for (const step of steps) {
    const rise = step.max[1] - previous;
    assert.ok(rise >= 0.14 - 1e-9 && rise <= 0.16 + 1e-9, `riser ${rise}`);
    close(step.max[1] / s.grain, Math.round(step.max[1] / s.grain), 'riser lattice');
    previous = step.max[1];
  }
  close(previous, s.stair.rise, 'half storey');
  const sites = Object.fromEntries(wallwalk.sites.map((site) => [site.site, site]));
  const [stairMin, stairMax] = bounds(steps);
  const [plinthMin, plinthMax] = bounds(pieces('plinth'));
  close(
    placed(sites['lower-flight'], stairMax)[2],
    placed(sites['middle-landing'], plinthMin)[2],
    'first landing starts',
  );
  close(
    placed(sites['lower-flight'], stairMax)[1],
    placed(sites['middle-landing'], plinthMax)[1],
    'first landing height',
  );
  close(
    placed(sites['middle-landing'], plinthMax)[2],
    placed(sites['upper-flight'], stairMin)[2],
    'second flight starts',
  );
  close(placed(sites['middle-landing'], plinthMax)[1], sites['upper-flight'].at[1], 'second flight datum');
  close(placed(sites['upper-flight-support'], plinthMax)[1], sites['upper-flight'].at[1], 'solid upper-flight bearing');
  const floor = bounds(pieces('floor'));
  close(placed(sites['upper-flight'], stairMax)[2], placed(sites['walk-floor-4'], floor[0])[2], 'wall-walk starts');
  close(placed(sites['upper-flight'], stairMax)[1], placed(sites['walk-floor-4'], floor[1])[1], '3 m finished height');
  close(
    sites['wall-1-4'].at[1] + s.storey,
    sites['walk-floor-4'].at[1] - s.floor,
    'slab bearing without coplanar wall cap',
  );
});

test('parapet bays share half-merlons at repeated ends and preserve real crenels', () => {
  assert.deepEqual(bounds(pieces('battlement')), [
    [-1, 0, -0.2],
    [1, 1.2, 0.2],
  ]);
  for (const x of [-0.9, 0, 0.9]) assert.ok(solidAt('battlement', [x, 0.9, 0]));
  for (const x of [-0.5, 0.5]) assert.ok(!solidAt('battlement', [x, 0.9, 0]));
  assert.ok(solidAt('battlement', [-0.5, 0.2, 0]));
  const left = bounds(pieces('battlement').filter(({ id }) => id.startsWith('left-merlon')));
  const right = bounds(pieces('battlement').filter(({ id }) => id.startsWith('right-merlon')));
  close(left[0][0] + s.bay, right[1][0], 'repeated parapet seam');
  close(left[1][0] + s.bay - right[0][0], 0.4, 'shared merlon width');
  const end = wallwalk.sites.find(({ site }) => site === 'end-parapet');
  close(end.at[2] - s.wall / 2, 7, 'return abuts side bays instead of overlapping their skins');
});

test('source compositions use unique site ids, known modules and unit quaternions', () => {
  for (const example of [dungeon, wallwalk]) {
    assert.equal(new Set(example.sites.map(({ site }) => site)).size, example.sites.length);
    for (const site of example.sites) {
      assert.ok(byId.has(site.model), site.model);
      close(Math.hypot(...site.turn), 1, 'unit turn');
    }
  }
});

for (const row of rows) {
  const name = row.id.slice('medieval_stone_'.length);
  test(`${row.id} retains structural datums in voxel and smooth production exports`, () => {
    const output = exported(name);
    const expected = bounds(pieces(name));
    for (const [kind, bytes] of [
      ['voxel', output.glb],
      ['smooth', output.smoothGlb],
    ]) {
      const actual = glbBounds(bytes);
      for (const side of [0, 1])
        for (const axis of [0, 1, 2]) {
          // A sampled curved crown may expand by one voxel; placement planes must remain exact.
          const curvedCrown = side === 1 && axis === 1 && ['arch_4m', 'vault_4m'].includes(name);
          if (curvedCrown && kind === 'voxel')
            assert.ok(Math.abs(actual[side][axis] - expected[side][axis]) <= s.grain);
          else close(actual[side][axis], expected[side][axis], `${name} ${kind} side ${side} axis ${axis}`);
        }
    }
  });
}

test('exported voxel and smooth doorway/window meshes retain their through-openings', async () => {
  for (const [name, empty, occupied] of [
    [
      'arch_doorway',
      [
        [0, 0.08],
        [0, 1.8],
        [0, 2.1],
        [-0.5, 1.5],
        [0.5, 1.5],
      ],
      [
        [0.7, 1],
        [0, 2.6],
      ],
    ],
    [
      'slit_window',
      [
        [-0.08, 1],
        [0, 1.5],
        [0.08, 2],
      ],
      [
        [0.3, 1.5],
        [0, 0.6],
      ],
    ],
  ]) {
    for (const bytes of [exported(name).glb, exported(name).smoothGlb]) {
      const scene = (await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '')).scene;
      scene.updateMatrixWorld(true);
      for (const [points, blocked] of [
        [empty, false],
        [occupied, true],
      ])
        for (const [x, y] of points) {
          const ray = new Raycaster(new Vector3(x, y, 1), new Vector3(0, 0, -1), 0, 2);
          assert.equal(ray.intersectObject(scene, true).length > 0, blocked, `${name} at ${x}, ${y}`);
        }
    }
  }
});
