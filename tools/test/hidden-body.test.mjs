import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { hideCovered } from '../../site/hiding.mjs';
import { coverGaps } from '../dollRig.mjs';

// A closed axis-aligned box of 12 triangles from `min` to `max`, in tenths of a metre, so the probe's sampling at its
// pitch stays quick.
const boxMesh = (min, max) => {
  const positions = [];
  for (const z of [min[2], max[2]]) for (const y of [min[1], max[1]]) for (const x of [min[0], max[0]]) positions.push(x / 10, y / 10, z / 10);
  const indices = [
    0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6,
    0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7,
    0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5,
  ];
  return { positions, indices };
};
const merged = (meshes) => meshes.reduce((a, b) => ({ positions: [...a.positions, ...b.positions], indices: [...a.indices, ...b.indices.map((i) => i + a.positions.length / 3)] }), { positions: [], indices: [] });

// A torso of two closed regions, as the export keeps them: the trunk below the armpit and the shoulders above it, and
// an arm beside it on its own bone.
const regions = { trunk: boxMesh([-0.2, 0, -0.1], [0.2, 0.4, 0.1]), shoulders: boxMesh([-0.25, 0.4, -0.1], [0.25, 0.6, 0.1]) };
const rig = { bones: [{ id: 'spine', head: [0, 0, 0], tail: [0, 0.06, 0], bind: { site: 0, part: 'torso', side: 'centre' } }, { id: 'arm', head: [0.03, 0.06, 0], tail: [0.03, 0, 0], bind: { site: 0, part: 'arm', side: 'right' } }] };
const meshes = {
  doll: [
    ...Object.entries(regions).map(([piece, mesh]) => ({ part: 'torso', piece, ...mesh })),
    { part: 'arm', ...boxMesh([0.26, 0, -0.04], [0.34, 0.6, 0.04]) },
  ],
  // A coat over the whole torso, a tank top over the trunk with its neckline above the armpit, one whose hem stops
  // short of the armpit, and a cape the arm wears beside the torso, as big as the coat.
  coat: [{ part: 'coat', ...boxMesh([-0.27, -0.02, -0.12], [0.27, 0.62, 0.12]) }],
  tank: [{ part: 'tank', ...boxMesh([-0.21, -0.02, -0.11], [0.21, 0.45, 0.11]) }],
  crop: [{ part: 'crop', ...boxMesh([-0.21, 0.1, -0.11], [0.21, 0.45, 0.11]) }],
  cape: [{ part: 'cape', ...boxMesh([-0.27, -0.02, -0.12], [0.27, 0.62, 0.12]) }],
};
// `meshesOf` as tools/dress.mjs, `modelMeshes`, gives it: the kept primitives merged per part.
const meshesOf = (id, keep = () => true) => {
  const byPart = Object.groupBy(meshes[id].filter(({ part, piece }) => keep(part, piece)), ({ part }) => part);
  return Object.entries(byPart).map(([part, list]) => ({ part, ...merged(list) }));
};
const doll = { model: 'doll', at: [0, 0, 0] };
const worn = (model, covers, part = 'torso', side = 'centre') => ({ model, part, side, at: [0, 0, 0], covers, bodySite: 0 });
const gaps = (...pieces) => coverGaps(rig, [doll, ...pieces], meshesOf).map(({ piece, name, open }) => [piece, name, typeof open]);

test('a piece that encloses the whole part may hide it, or each region of it', () => {
  assert.deepEqual(gaps(worn('coat', ['torso'])), []);
  assert.deepEqual(gaps(worn('coat', ['trunk', 'shoulders'])), []);
});

test('a partial garment may hide the region it encloses, and not the regions it leaves bare', () => {
  assert.deepEqual(gaps(worn('tank', ['trunk'])), []);
  assert.deepEqual(gaps(worn('tank', ['shoulders'])), [['tank', 'shoulders', 'number']]);
  assert.deepEqual(gaps(worn('tank', ['torso'])), [['tank', 'torso', 'number']]);
});

test('a hem that stops short of a hidden region\'s edge opens a gap', () => {
  assert.deepEqual(gaps(worn('crop', ['trunk'])), [['crop', 'trunk', 'number']]);
});

test('only the pieces riding the hidden part copy cover it, since only they move with it', () => {
  const onArm = { model: 'cape', part: 'arm', side: 'right', at: [0, 0, 0] };
  assert.deepEqual(gaps(worn('crop', ['trunk']), onArm), [['crop', 'trunk', 'number']]);
});

test('a name that hides nothing of the part copy is refused', () => {
  assert.deepEqual(gaps(worn('coat', ['hood'])), [['coat', 'hood', 'string']]);
});

test('a drawer hides the covered regions of the part copy a piece is drawn on, and nothing else', () => {
  const mesh = (piece) => Object.assign(new THREE.Mesh(new THREE.BufferGeometry()), piece ? { name: piece } : {});
  const part = (name, children) => Object.assign(new THREE.Group(), { userData: { part: name } }).add(...children);
  const bust = new THREE.Group().add(part('torso', ['trunk', 'shoulders'].map((piece) => {
    const m = mesh(piece);
    m.geometry.userData.piece = piece;
    return m;
  })), part('arm', [mesh()]));
  const shown = () => { const names = []; bust.traverse((o) => { if (o.isMesh && o.visible) names.push(o.name || o.parent.userData.part); }); return names.sort(); };
  hideCovered([bust, new THREE.Group()], [doll, worn('tank', ['trunk'])]);
  assert.deepEqual(shown(), ['arm', 'shoulders']);
  hideCovered([bust, new THREE.Group()], [doll, worn('coat', ['torso'])]);
  assert.deepEqual(shown(), ['arm']);
});
