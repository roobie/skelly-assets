// A game seats a worn piece, and hides what it covers, from the manifest's entry for the piece and the doll's rig file
// alone: the entry's `wornOn` names a part as the player knows it, and each rig bone's `bind.wears` says which of those
// names it answers to, where a piece drawn on it rests in its node, and what each name of the piece's `covers` hides of
// its part. Here that reading is held to what the doll itself draws (tools/dress.mjs, `wornSites`), on every doll.
import assert from 'node:assert/strict';
import test from 'node:test';
import { add, length, mulMV, quatToMat3, sub } from '../../site/kinematics.mjs';
import { dollDressing, dollDressings, PLAYER, readDressing, wornOnParts } from '../dress.mjs';
import { dollTree, repo, shellsOf } from './doll-tree.mjs';

// A garment over the trunk, the clavicles and the arms, one over the pelvis and the legs, boots with a shaft and a toe,
// gloves on every phalanx, and a top that hides the trunk alone.
const WEARS = ['leather_jacket', 'jeans', 'combat_boots', 'leather_gloves', 'tank_top'];
const POINTS = [
  [0, 0, 0],
  [0.1, 0, 0],
  [0, 0.2, 0],
  [0.03, -0.05, 0.3],
];
// The rig rounds a rest offset to a tenth of a millimetre and its turn as finely, a point a third of a metre out.
const TOLERANCE = 5e-4;

const dressings = readDressing(repo);
const player = dollDressing(dressings, PLAYER);

// ---- what a game does, with the manifest's entry and the rig file ----

/** The bones a piece rides: those that answer to its part's name, on its side if it names one. */
const bonesWearing = (rig, { wornOn }) =>
  rig.bones.filter(
    ({ bind }) => bind.wears.part === wornOn.part && (wornOn.side === undefined || bind.side === wornOn.side),
  );
/** Where a point of the piece's model stands at rest, riding `bone`'s node. */
const seated = (bone, point) => {
  const { rotation, translation, scale } = bone.bind.wears.rest;
  const inNode = add(
    mulMV(
      quatToMat3(rotation),
      point.map((c, i) => c * scale[i]),
    ),
    translation,
  );
  return add(bone.head, mulMV(quatToMat3(bone.node.rotation), inNode));
};
/** The names whose primitives of `bone`'s part the piece hides. */
const hidden = (bone, { covers = [] }) => [...new Set(covers.flatMap((name) => bone.bind.wears.hides[name] ?? []))];

// ---- what the doll draws ----

const drawn = ({ at, mirror, turn }, point) => {
  const flipped = mirror ? [-point[0], point[1], point[2]] : point;
  return add(at, turn ? mulMV(quatToMat3(turn), flipped) : flipped);
};

for (const { id } of dollDressings(dressings)) {
  const tree = dollTree({ doll: id, wears: WEARS });
  // The rig as its file holds it, and the entries as the manifest holds them: `wornOn` is the player's, whatever the doll.
  const rig = JSON.parse(JSON.stringify(tree.rig));
  const wornOn = wornOnParts(tree.models, player, { anchors: {}, sided: [] });
  const entries = WEARS.flatMap(shellsOf).map((piece) => {
    const { covers } = tree.models.find((model) => model.id === piece);
    return { id: piece, wornOn: wornOn.get(piece), covers };
  });
  const sites = WEARS.flatMap((wear) => tree.sitesIn(wear).slice(tree.doll.sites.length));

  test(`every worn piece is seated by its bones' bind.wears where the ${id} doll draws it`, () => {
    assert.ok(entries.length > 25, `only ${entries.length} pieces were built`);
    for (const entry of entries) {
      assert.ok(entry.wornOn, `${entry.id} names no part it is worn on`);
      const bones = bonesWearing(rig, entry);
      const own = sites.filter((site) => site.model === entry.id);
      assert.ok(own.length > 0, `${entry.id} is not drawn on the doll`);
      assert.equal(
        bones.length,
        own.length,
        `${entry.id} rides ${bones.length} bones and is drawn ${own.length} times`,
      );
      for (const bone of bones) {
        const site = own.find(({ part, side }) => part === bone.bind.part && side === bone.bind.side);
        assert.ok(site, `${entry.id} rides ${bone.id}, whose part ${bone.bind.part} it is not drawn on`);
        for (const point of POINTS) {
          const miss = length(sub(seated(bone, point), drawn(site, point)));
          assert.ok(miss < TOLERANCE, `${entry.id} on ${bone.id}: ${point} lands ${(miss * 1000).toFixed(2)} mm off`);
        }
      }
    }
  });

  test(`a worn piece hides by its bones' bind.wears what it hides on the ${id} doll`, () => {
    let covering = 0;
    for (const entry of entries) {
      for (const bone of bonesWearing(rig, entry)) {
        const site = sites.find(
          ({ model, part, side }) => model === entry.id && part === bone.bind.part && side === bone.bind.side,
        );
        assert.deepEqual(hidden(bone, entry).sort(), [...(site.covers ?? [])].sort(), `${entry.id} on ${bone.id}`);
        if (site.covers) {
          assert.equal(site.bodySite, bone.bind.site, `${entry.id} on ${bone.id} hides in another site's model`);
          covering += site.covers.length;
        }
      }
    }
    assert.ok(covering > 10, `only ${covering} names were hidden`);
  });
}

test('a part no piece or place renames is worn under its own name, at its own rest, and hides nothing', () => {
  const { rig } = dollTree({});
  const head = rig.bones.find(({ id }) => id === 'head');
  assert.deepEqual(head.bind.wears, { part: 'head', rest: head.bind.rest, hides: {} });
});
