import assert from 'node:assert/strict';
import { test } from 'node:test';
import { add, mulMV, quatToMat3, sub, transpose } from '../../site/kinematics.mjs';
import { dollDressing, dollDressings, PLAYER, readDoll, readDressing, wornSites } from '../dress.mjs';
import { dollTree, repo } from './doll-tree.mjs';

// Every doll's parts and no garment: where a piece is drawn is its slot's doing, whatever the piece is shaped like.
const { built, manifest } = dollTree({ everyDoll: true });
const dressings = readDressing(repo);
// Far below a voxel, above the float32 a part's place is stored in.
const SAME = 1e-5;
// The player's digits hang straight where the mannequin's curl, so their joints stand apart by design; a digit's
// pieces are drawn at its own joint on each doll, which no other doll's joint locates.
const isDigit = (segment) => /_\d+$/.test(segment);

// Where each segment's pieces are drawn on the doll, as its copies hang before any turn the doll rests them in, so a
// T-posed arm is read as the hanging arm it is drawn as.
const pieceOrigins = (dressing) => {
  const doll = readDoll(built, manifest, dressing);
  const segments = Object.keys(dressing.slots).filter((segment) => !isDigit(segment));
  const models = segments.map((segment) => ({ id: `frame_worn_${segment}`, tags: { fit: ['worn'] } }));
  const unused = () => assert.fail('a piece is placed by its slot alone');
  const sites = wornSites({ id: 'frame' }, { dressing, doll, models, boxOf: unused, anchorsOf: unused }).slice(
    doll.sites.length,
  );
  return Object.fromEntries(
    segments.map((segment) => [
      segment,
      sites
        .filter(({ model }) => model === `frame_worn_${segment}`)
        .map(({ part, side, at, turn }) => {
          if (!turn) return at;
          // A turned limb hangs from its bust anchor, so the turn is undone about that anchor.
          const { site } = doll.parts.get(part).find((copy) => copy.side === side);
          const { anchor } = dressing.limbs.find(({ model }) => model === doll.sites[site].model);
          const about = doll.anchors[`${anchor}_${side}`];
          return add(about, mulMV(transpose(quatToMat3(turn)), sub(at, about)));
        }),
    ]),
  );
};

test('every doll draws each segment’s pieces where the doll they are fitted to does, the dolls one offset apart', () => {
  const fitted = pieceOrigins(dollDressing(dressings, PLAYER));
  for (const dressing of dollDressings(dressings).filter(({ id }) => id !== PLAYER)) {
    /** @type {{ offset: number[]; segments: Set<string> }[]} */
    const apart = [];
    for (const [segment, origins] of Object.entries(pieceOrigins(dressing))) {
      for (const [copy, origin] of origins.entries()) {
        const offset = sub(origin, fitted[segment][copy]);
        const same = apart.find((group) => group.offset.every((v, axis) => Math.abs(v - offset[axis]) < SAME));
        if (same) same.segments.add(segment);
        else apart.push({ offset, segments: new Set([segment]) });
      }
    }
    const groups = apart.map(
      ({ offset, segments }) => `${offset.map((v) => v.toFixed(4))} for ${[...segments].join(' ')}`,
    );
    assert.equal(apart.length, 1, `${dressing.id}: ${groups.join('; ')}`);
  }
});
