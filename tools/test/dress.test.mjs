import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { dollOf, isWearable, modelBox, modelParts, readDressing, wornPieces, wornSites } from '../dress.mjs';

const repo = resolve(import.meta.dirname, '../..');
const box = (min, max) => ({ min, max });
const close = (actual, expected) => actual.forEach((x, i) => assert.ok(Math.abs(x - expected[i]) < 1e-9, `${actual} is not ${expected}`));

// A doll of a bust with one limb on each side, hung by its own anchor, which sits off the limb's origin.
const dressing = {
  doll: { bust: 'bust', limbs: [{ model: 'limb', anchor: 'shoulder' }], sides: ['right', 'left'], mirrored: 'left' },
  piece: 'chest',
  lying: ['folded'],
  places: [
    { slot: 'torso', part: 'chest', against: [0, 0, 1], sink: 0.5 },
    { slot: 'arms', part: 'sleeve', both: true, against: [0, -1, 0], sink: 0 },
    { slot: 'hands', part: 'sleeve', against: [0, 0, 0], sink: 0 },
    { slot: 'head', anchor: 'brow' },
    { slot: 'face', anchor: 'nose' },
  ],
  slots: { body: { slot: 'torso', part: 'chest' }, cuff: { slot: 'arms', part: 'sleeve' } },
};
const figure = {
  bust: {
    parts: [{ part: 'chest', at: [0, 0, 0], box: box([-0.2, 0, -0.1], [0.2, 0.6, 0.1]) }],
    anchors: { shoulder_right: [-0.3, 0.5, 0], shoulder_left: [0.3, 0.5, 0], brow: [0, 0.8, 0.05] },
  },
  limb: {
    parts: [{ part: 'sleeve', at: [0, -0.2, 0], box: box([-0.05, -0.4, -0.05], [0.1, 0, 0.05]) }],
    anchors: { shoulder: [0, 0.1, 0] },
  },
};
const doll = dollOf(dressing, figure);
const model = (id, tags = {}) => ({ id, tags });

test('each limb hangs by its own anchor from the bust anchor of its side, the left one mirrored', () => {
  assert.deepEqual(doll.sites.map(({ model: id }) => id), ['bust', 'limb', 'limb']);
  close(doll.sites[1].at, [-0.3, 0.4, 0]);
  close(doll.sites[2].at, [0.3, 0.4, 0]);
  assert.equal(doll.sites[1].mirror, undefined);
  assert.equal(doll.sites[2].mirror, true);
  const [right, left] = doll.parts.get('sleeve');
  close(right.at, [-0.3, 0.2, 0]);
  close(left.at, [0.3, 0.2, 0]);
  close(right.box.min, [-0.35, 0, -0.05]);
  close(left.box.max, [0.35, 0.4, 0.05]);
});

test('a worn piece is drawn in every copy of its segment\'s part, the left one mirrored, and a body-frame piece in the piece part', () => {
  const models = [model('coat', { slot: ['torso'] }), model('coat_worn_cuff', { fit: ['worn'] }), model('coat_worn', { fit: ['worn'] })];
  const pieces = wornSites(models[0], { dressing, doll, models }).slice(doll.sites.length);
  assert.deepEqual(pieces.map(({ model: id, mirror }) => [id, Boolean(mirror)]), [['coat_worn_cuff', false], ['coat_worn_cuff', true], ['coat_worn', false]]);
  close(pieces[1].at, doll.parts.get('sleeve')[1].at);
  close(pieces[2].at, [0, 0, 0]);
});

test('a piece that covers some of its part names, in every copy, the doll site that draws that copy', () => {
  const models = [model('coat', { slot: ['torso'] }), { ...model('coat_worn_cuff', { fit: ['worn'] }), covers: ['sleeve'] }, model('coat_worn', { fit: ['worn'] })];
  const pieces = wornSites(models[0], { dressing, doll, models }).slice(doll.sites.length);
  assert.deepEqual(pieces.map(({ covers, bodySite }) => [covers, bodySite]), [
    [['sleeve'], doll.parts.get('sleeve')[0].site],
    [['sleeve'], doll.parts.get('sleeve')[1].site],
    [undefined, undefined],
  ]);
});

test('pieces fitted over other clothing and other items\' pieces are not worn with an item', () => {
  const models = [model('coat_worn_cuff', { fit: ['worn'] }), model('coat_worn_jacket', { fit: ['over-jacket'] }), model('coat_hood_worn_body', { fit: ['worn'] })];
  assert.deepEqual(wornPieces('coat', models, dressing), [{ model: 'coat_worn_cuff', part: 'sleeve' }]);
  assert.throws(() => wornPieces('coat', [model('coat_worn_tail', { fit: ['worn'] })], dressing), /tail/);
});

test('a wearable is a loose model that names a slot or has worn pieces, never a piece itself', () => {
  const models = [model('cap', { slot: ['head'] }), model('sling'), model('sling_worn', { fit: ['worn'] }), model('rock')];
  assert.deepEqual(models.filter((m) => isWearable(m, models)).map(({ id }) => id), ['cap', 'sling']);
});

test('a wearable with no pieces rests against its place\'s part, sunk by its share of its own depth and centred across', () => {
  const vest = model('vest', { slot: ['hands', 'torso'] });
  const [site] = wornSites(vest, { dressing, doll, models: [vest], boxOf: () => box([-1, -1, -0.1], [1, 1, 0.1]) }).slice(doll.sites.length);
  // torso is listed before hands, so the chest takes it: its front face at the chest's, half of it sunk in.
  close(site.at, [0, 0.3, 0.1]);
  assert.equal(site.turn, undefined);
});

test('a wearable placed by an anchor stands with its origin at the bust anchor, whatever its box', () => {
  const hat = model('hat', { slot: ['head'] });
  const [site] = wornSites(hat, { dressing, doll, models: [hat], boxOf: () => box([-0.2, 0, -0.2], [0.2, 0.9, 0.2]) }).slice(doll.sites.length);
  close(site.at, [0, 0.8, 0.05]);
  const mask = model('mask', { slot: ['face'] });
  assert.throws(() => wornSites(mask, { dressing, doll, models: [mask], boxOf: () => box([0, 0, 0], [1, 1, 1]) }), /nose/);
});

test('a place on both sides spans both copies of its part', () => {
  const cuffs = model('cuffs', { slot: ['arms'] });
  const [site] = wornSites(cuffs, { dressing, doll, models: [cuffs], boxOf: () => box([-0.1, 0, -0.1], [0.1, 0.2, 0.1]) }).slice(doll.sites.length);
  close(site.at, [0, -0.2, 0]);
});

test('a wearable lying folded stands up, head end up and front forward, before it is placed', () => {
  const shirt = model('shirt', { slot: ['torso'], state: ['folded'] });
  // Lying on its back: thin along y, its head end at -z.
  const [site] = wornSites(shirt, { dressing, doll, models: [shirt], boxOf: () => box([-0.2, 0, -0.5], [0.2, 0.04, 0.1]) }).slice(doll.sites.length);
  close(site.turn, [Math.SQRT1_2, 0, 0, Math.SQRT1_2]);
  // Stood up it spans y -0.1..0.5 and z 0..0.04: centred on the chest's height and resting on its front, half sunk.
  close(site.at, [0, 0.1, 0.08]);
});

test('a wearable none of whose slots has a place is refused', () => {
  const ring = model('ring', { slot: ['finger'] });
  assert.throws(() => wornSites(ring, { dressing, doll, models: [ring], boxOf: () => box([0, 0, 0], [1, 1, 1]) }), /ring/);
});

// A GLB holding only its JSON chunk: the boxes come from the accessors' bounds, so no buffer is needed.
const glb = (gltf) => {
  const json = Buffer.from(JSON.stringify(gltf).padEnd(Math.ceil(JSON.stringify(gltf).length / 4) * 4, ' '));
  const header = Buffer.alloc(20);
  header.write('glTF', 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + json.length, 8);
  header.writeUInt32LE(json.length, 12);
  header.write('JSON', 16);
  return Buffer.concat([header, json]);
};
const unitMesh = { primitives: [{ attributes: { POSITION: 0 } }] };
const unitBounds = [{ min: [0, 0, 0], max: [1, 1, 1] }];

test('a model\'s parts and box are read in the model frame, through each node\'s transform', () => {
  const buffer = glb({
    scenes: [{ nodes: [0] }],
    nodes: [
      { children: [1], translation: [0, 1, 0] },
      { extras: { part: 'arm' }, translation: [2, 0, 0], mesh: 0, children: [2] },
      { rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2], mesh: 0 },
    ],
    meshes: [unitMesh],
    accessors: unitBounds,
  });
  const [arm] = modelParts(buffer);
  assert.equal(arm.part, 'arm');
  close(arm.at, [2, 1, 0]);
  // The child is turned a quarter about z, so its unit cube spans x -1..0 of the arm's frame.
  close(arm.box.min, [1, 1, 0]);
  close(arm.box.max, [3, 2, 1]);
  close(modelBox(buffer).max, [3, 2, 1]);
});

test('a doll part turned off its model\'s axes is refused, as a piece in its frame would be drawn askew', () => {
  const buffer = glb({
    scenes: [{ nodes: [0] }],
    nodes: [{ extras: { part: 'arm' }, rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2], mesh: 0 }],
    meshes: [unitMesh],
    accessors: unitBounds,
  });
  assert.throws(() => modelParts(buffer), /arm/);
});

test('every body slot the vocabulary names has a place on the doll, and every segment a part', () => {
  const { places, slots } = readDressing(repo);
  const terms = Object.keys(JSON.parse(readFileSync(resolve(repo, 'models/taxonomy.json'), 'utf8')).facets.slot.terms);
  assert.deepEqual(terms.filter((slot) => !places.some((place) => place.slot === slot)), []);
  assert.deepEqual(Object.entries(slots).filter(([, { part }]) => !part).map(([segment]) => segment), []);
});
