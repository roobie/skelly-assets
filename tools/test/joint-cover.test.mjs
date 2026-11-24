// The joint-cover report's reading (tools/jointCover.mjs): which skin shows, which of it a camera above sees, and how
// a garment's keys become its row. The doll is the UAL doll as built, in jeans, whose knees open as it runs.
import assert from 'node:assert/strict';
import test from 'node:test';
import { coveredSurface, shownSkin } from '../../site/clearance.mjs';
import { IDENTITY_M } from '../../site/kinematics.mjs';
import { DOLL, GAITS, jointProbe, jointsOf, worstKeys } from '../jointCover.mjs';
import { ualClips } from '../ualClip.mjs';
import { dollTree, repo } from './doll-tree.mjs';

// A closed box mesh.
const box = (min, max) => {
  const corner = (i) => [0, 1, 2].map((a) => ((i >> a) & 1 ? max[a] : min[a]));
  const quads = [
    [0, 2, 3, 1],
    [4, 5, 7, 6],
    [0, 1, 5, 4],
    [2, 6, 7, 3],
    [0, 4, 6, 2],
    [1, 3, 7, 5],
  ];
  return {
    positions: [0, 1, 2, 3, 4, 5, 6, 7].flatMap(corner),
    indices: quads.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]),
  };
};
const STILL = { r: IDENTITY_M, t: [0, 0, 0] };
const bone = (id, parent, head, tail) => ({ id, parent, head, tail });
const areaOf = (shown) => shown.reduce((sum, { area }) => sum + area, 0);
const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-9, `${message}: ${a} is not ${b}`);

test('skin shows where no piece encloses it, and is seen from above only facing up with nothing over it', () => {
  // A post with a sleeve round its lower half, and a cap that hangs over half of its top.
  const rig = { bones: [bone('post', null, [0, 0, 0], [0, 0.1, 0]), bone('cap', 'post', [0, 0.1, 0], [0, 0.2, 0])] };
  const rest = {
    body: [
      { bone: 'post', part: 'post', mesh: box([-0.02, 0, -0.02], [0.02, 0.1, 0.02]) },
      { bone: 'cap', part: 'cap', mesh: box([0, 0.15, -0.02], [0.02, 0.2, 0.02]) },
    ],
    pieces: [{ piece: 'sleeve', bone: 'post', mesh: box([-0.025, -0.005, -0.025], [0.025, 0.05, 0.025]) }],
  };
  const probe = shownSkin(rest, coveredSurface(rig, rest), { watched: (id) => id === 'post', toward: [0, 1, 0] });
  const shown = probe(
    new Map([
      ['post', STILL],
      ['cap', STILL],
    ]),
  );
  // The four sides above the sleeve and the top show; the bottom and the lower half are inside the sleeve.
  close(areaOf(shown), 4 * 0.04 * 0.05 + 0.04 * 0.04, 'shown');
  // Of the top, the half the cap does not overhang is seen.
  close(areaOf(shown.filter(({ seen }) => seen)), 0.02 * 0.04, 'seen');
  assert.ok(shown.filter(({ seen }) => seen).every(({ normal }) => normal[1] === 1));
  // Lifted clear, the sleeve bares the post it was meant to cover, and those samples name it.
  const lifted = shownSkin({ ...rest, pieces: [{ ...rest.pieces[0], bone: 'cap' }] }, coveredSurface(rig, rest), {
    watched: (id) => id === 'post',
    toward: [0, 1, 0],
  })(
    new Map([
      ['post', STILL],
      ['cap', { r: IDENTITY_M, t: [0, 1, 0] }],
    ]),
  );
  assert.ok(lifted.some(({ piece }) => piece === 'sleeve'));
  assert.ok(lifted.some(({ piece }) => piece === undefined));
});

test('a row keeps, per gait and joint, the key that shows most from above, in pixels at each zoom', () => {
  const none = { shown: 0, seen: 0 };
  const row = worstKeys({
    walk: [
      { knee: none, neck: { shown: 0.02, seen: 0 } },
      { knee: { shown: 0.004, seen: 0.00134 }, neck: { shown: 0.01, seen: 0 } },
      { knee: { shown: 0.009, seen: 0.0005 }, neck: none },
    ],
  });
  // A pixel of a 1.83 m figure drawn 50 px tall is 13.4 cm² of it.
  assert.deepEqual(row.walk.knee, { key: 1, shownCm2: 40, seenCm2: 13.4, px: { 25: 0.25, 50: 1 } });
  // With nothing seen, the key that shows most.
  assert.deepEqual(row.walk.neck, { key: 0, shownCm2: 200, seenCm2: 0, px: { 25: 0, 50: 0 } });
});

const tree = dollTree({ doll: DOLL, wears: ['jeans'] });
const clips = ualClips(repo);

test('the report reads both knees, both elbows and the neck of the UAL rig', () => {
  const joints = jointsOf(tree.rig);
  assert.deepEqual(joints.map(({ joint, at }) => `${joint} ${at}`).sort(), [
    'elbow lowerarm_l',
    'elbow lowerarm_r',
    'knee calf_l',
    'knee calf_r',
    'neck neck_01',
  ]);
  assert.deepEqual(joints.find(({ at }) => at === 'calf_l').bones, ['thigh_l', 'calf_l']);
});

test('jeans cover the knees at rest and open at them in the sprint, and bare no elbow, which they do not reach', () => {
  const probe = jointProbe(tree.rig, tree.restIn('jeans'));
  const rest = probe(clips.nodes(null, 0));
  assert.equal(rest.knee.shown, 0);
  assert.ok(rest.neck.shown > 0.01, 'the neck is bare in jeans');
  const sprint = probe(clips.nodes(GAITS.sprint, 3));
  assert.ok(sprint.knee.shown > 0.001, `a sprinting knee shows only ${sprint.knee.shown} m² of skin`);
  assert.equal(sprint.elbow.shown, 0);
  assert.ok(sprint.knee.seen <= sprint.knee.shown);
});
