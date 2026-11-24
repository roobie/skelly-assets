import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { exportDollRigs } from '../dollRig.mjs';
import { dollDressing } from '../dress.mjs';
import { thingEntryFile } from '../layout.mjs';
import { partGlb } from './boxes.mjs';

// Two toy dolls of a torso on a one-bone rig, in different packs, one with an arm hung from each side of its bust, to
// show what the code does for a doll that is not the player: it writes each doll's rig, keyed by its own models.
const TORSO = [
  [-0.1, 0, -0.1],
  [0.1, 0.5, 0.1],
];
const ARM = [
  [-0.05, -0.4, -0.05],
  [0.05, 0, 0.05],
];
const rig = {
  id: 'toy',
  revision: 1,
  root: 'spine',
  reference: 'right',
  bones: {
    spine: {
      nodeRotation: [0, 0, 0, 1],
      part: 'torso',
      parent: null,
      pivot: 'origin',
      along: [0, 1, 0],
      limits: { flex: [0, 0], twist: [0, 0], abduct: [0, 0] },
    },
  },
};
const toy = (extra) => ({
  sides: ['right', 'left'],
  mirrored: 'left',
  boneSuffix: { right: '.R', left: '.L' },
  slots: {},
  rig,
  ...extra,
});
const dressing = {
  piece: 'body',
  dolls: {
    player: toy({ pack: 'a.body', rigPath: 'a.rig.json', bust: 'a_bust', limbs: [] }),
    puppet: toy({
      pack: 'b.body',
      rigPath: 'motions/b.rig.json',
      bust: 'b_bust',
      limbs: [{ name: 'arm', model: 'b_arm', anchor: 'shoulder' }],
    }),
  },
};

const root = mkdtempSync(join(tmpdir(), 'toy-dolls-'));
after(() => rmSync(root, { recursive: true, force: true }));
mkdirSync(join(root, 'models'), { recursive: true });
writeFileSync(join(root, 'models/dressing.libsonnet'), JSON.stringify(dressing));

const built = join(root, 'built');
const models = [
  { id: 'a_bust', pack: 'a.body', glb: partGlb('torso', TORSO), anchors: {} },
  {
    id: 'b_bust',
    pack: 'b.body',
    glb: partGlb('torso', TORSO),
    anchors: { shoulder_right: [0.1, 0.4, 0], shoulder_left: [-0.1, 0.4, 0] },
  },
  { id: 'b_arm', pack: 'b.body', glb: partGlb('upper', ARM), anchors: { shoulder: [0, 0, 0] } },
];
for (const { id, pack, glb, anchors } of models) {
  for (const [file, content] of [
    [join(pack, `${id}.glb`), glb],
    [thingEntryFile(pack, id), JSON.stringify({ anchors })],
  ]) {
    mkdirSync(dirname(join(built, file)), { recursive: true });
    writeFileSync(join(built, file), content);
  }
}
const manifest = { models: models.map(({ id, pack }) => ({ id, pack, path: `${id}.glb` })) };

test("each doll's rig is written at its own path, with the models of its own parts", () => {
  const { files, dolls } = exportDollRigs(built, manifest, root);
  assert.deepEqual(files, ['a.body/a.rig.json', 'b.body/motions/b.rig.json']);
  assert.deepEqual(dolls, [
    { id: 'player', pack: 'a.body', rig: 'a.rig.json', models: { bust: 'a_bust' } },
    { id: 'puppet', pack: 'b.body', rig: 'motions/b.rig.json', models: { bust: 'b_bust', arm: 'b_arm' } },
  ]);
  const sites = (file) => JSON.parse(readFileSync(join(built, file), 'utf8')).doll.map(({ model }) => model);
  assert.deepEqual(sites(files[0]), ['a_bust']);
  assert.deepEqual(sites(files[1]), ['b_bust', 'b_arm', 'b_arm']);
  const spine = JSON.parse(readFileSync(join(built, files[1]), 'utf8')).bones.find(({ id }) => id === 'spine');
  assert.equal(spine.bind.model, 'b_bust');
});

test('a doll record may not restate a field the dressing shares', () => {
  const clashing = { piece: 'body', dolls: { player: { piece: 'chest' } } };
  assert.throws(() => dollDressing(clashing, 'player'), /doll player: piece is also a shared field/);
});
