import assert from 'node:assert/strict';
import { test } from 'node:test';
import { padOf } from '../../site/fingers.mjs';
import {
  add,
  applyPoint,
  boneTransforms,
  IDENTITY_M,
  jointRotation,
  mat3ToQuat,
  mulMM,
  mulMV,
  quatToMat3,
  rotAxis,
  sub,
  transpose,
} from '../../site/kinematics.mjs';
import { dollRig, restMeshes } from '../dollRig.mjs';
import { dollOf, wornSites } from '../dress.mjs';

// A toy doll that rests its arms in a T-pose: the arm model hangs down -y and the doll turns it a quarter turn about z
// at its site, -90 degrees on the right and the mirrored left one by derivation, not by a second authoring. The rig's
// nodes are rest-turned off the model's axes, as the UAL mannequin's are.
const box = (min, max) => ({ min, max });
const close = (actual, expected, message = '') =>
  actual.forEach((x, i) => assert.ok(Math.abs(x - expected[i]) < 1e-4, `${message} ${actual} is not ${expected}`));
const mirrorX = ([x, y, z]) => [-x, y, z];

const dressing = {
  id: 'toy',
  bust: 'bust',
  limbs: [{ name: 'arm', model: 'arm', anchor: 'shoulder', turn: { axis: [0, 0, 1], degrees: -90 } }],
  sides: ['right', 'left'],
  mirrored: 'left',
  boneSuffix: { right: '.R', left: '.L' },
  piece: 'body',
  slots: { cuff: { slot: 'arms', part: 'upper' } },
  places: [],
  layers: [],
  lying: [],
};
const figure = {
  bust: {
    parts: [{ part: 'torso', at: [0, 0, 0], box: box([-0.1, 0, -0.1], [0.1, 0.5, 0.1]) }],
    anchors: { shoulder_right: [-0.1, 0.4, 0], shoulder_left: [0.1, 0.4, 0] },
  },
  arm: {
    parts: [
      { part: 'upper', at: [0, 0, 0], box: box([-0.05, -0.4, -0.05], [0.05, 0, 0.05]) },
      { part: 'fore', at: [0, -0.4, 0], box: box([-0.04, -0.8, -0.04], [0.04, -0.4, 0.04]) },
    ],
    anchors: { shoulder: [0, 0, 0] },
  },
};
const doll = dollOf(dressing, figure);

const rotations = {
  spine: mat3ToQuat(rotAxis([1, 0, 0], 20)),
  upper: { right: mat3ToQuat(rotAxis([0.3, 1, 0.2], 50)), left: mat3ToQuat(rotAxis([-0.3, 1, 0.2], -35)) },
  fore: { right: mat3ToQuat(rotAxis([0, 0, 1], 70)), left: mat3ToQuat(rotAxis([0.5, 0.5, 0.1], 25)) },
};
const rigContent = {
  id: 'toy',
  revision: 1,
  root: 'spine',
  reference: 'right',
  bones: {
    spine: {
      nodeRotation: rotations.spine,
      part: 'torso',
      parent: null,
      pivot: 'origin',
      along: [0, 1, 0],
      limits: { flex: [0, 0], twist: [0, 0], abduct: [0, 0] },
    },
    upper: {
      sided: true,
      nodeRotation: rotations.upper,
      part: 'upper',
      parent: 'spine',
      pivot: 'origin',
      along: [0, -1, 0],
      limits: { flex: [-10, 20], twist: [-30, 40], abduct: [-5, 60] },
    },
    fore: {
      sided: true,
      nodeRotation: rotations.fore,
      part: 'fore',
      parent: 'upper',
      pivot: 'origin',
      along: [0, -1, 0],
      limits: { flex: [0, 100], twist: [-10, 10], abduct: [0, 0] },
    },
  },
};
const rig = dollRig(doll, { ...dressing, rig: rigContent });
const bone = (id) => rig.bones.find((b) => b.id === id);

test('the left arm takes the right arm turn mirrored across x, and neither turns the bust', () => {
  assert.equal(doll.sites[0].turn, undefined);
  const [right, left] = doll.sites.slice(1).map(({ turn }) => turn);
  close(right, [0, 0, -Math.SQRT1_2, Math.SQRT1_2], 'right');
  close(left, [0, 0, Math.SQRT1_2, Math.SQRT1_2], 'left');
  assert.equal(doll.parts.get('torso')[0].turn, undefined);
});

test('a turned limb hangs from its anchor with its parts, origins and boxes in the doll frame', () => {
  const [right, left] = doll.parts.get('fore');
  close(right.at, [-0.5, 0.4, 0], 'right fore');
  close(left.at, [0.5, 0.4, 0], 'left fore');
  close(doll.parts.get('upper')[0].at, [-0.1, 0.4, 0], 'right upper');
  close(right.box.min, [-0.9, 0.36, -0.04], 'right fore box');
  close(right.box.max, [-0.5, 0.44, 0.04], 'right fore box');
  close(left.box.min, [0.5, 0.36, -0.04], 'left fore box');
  close(left.box.max, [0.9, 0.44, 0.04], 'left fore box');
  // The site puts the limb's own anchor on the bust's.
  close(doll.sites[1].at, [-0.1, 0.4, 0], 'right site');
  close(doll.sites[2].at, [0.1, 0.4, 0], 'left site');
});

test('a bust stood off the doll frame origin carries its parts, its anchors and the limbs hung on them', () => {
  const by = [0.01, 0.9, -0.02];
  const stood = dollOf({ ...dressing, bustAt: by }, figure);
  close(stood.sites[0].at, by, 'bust site');
  close(stood.parts.get('torso')[0].at, by, 'torso');
  close(stood.parts.get('torso')[0].box.min, [-0.09, 0.9, -0.12], 'torso box');
  close(stood.anchors.shoulder_right, [-0.09, 1.3, -0.02], 'anchor');
  for (const [i, copy] of stood.parts.get('fore').entries()) {
    close(
      copy.at,
      doll.parts.get('fore')[i].at.map((c, axis) => c + by[axis]),
      `fore ${copy.side}`,
    );
  }
});

test("a bone's head, reach and joint frame follow the turn, the left a mirror image of the right", () => {
  const [right, left] = [bone('upper.R'), bone('upper.L')];
  close(right.head, [-0.1, 0.4, 0]);
  close(right.tail, [-0.5, 0.4, 0]);
  close(left.tail, [0.5, 0.4, 0]);
  close(bone('fore.R').tail, [-0.9, 0.4, 0], 'fore reaches its far face');
  close(bone('fore.L').tail, [0.9, 0.4, 0]);
  // Flex axis x turns to -y on the right and +y on the left, the axial image of a rotation across the plane.
  close([right.frame.x, right.frame.y, right.frame.z].flat(), [0, -1, 0, -1, 0, 0, 0, 0, -1]);
  close([left.frame.x, left.frame.y, left.frame.z].flat(), [0, 1, 0, 1, 0, 0, 0, 0, -1]);
});

// The skeleton the toy is measured off: each bone's head where its part's origin lies, and its node's rotation stored
// local to its parent's, as a GLB's are.
const skeleton = (() => {
  const world = (id) => quatToMat3(bone(id).node.rotation);
  return Object.fromEntries(
    rig.bones.map(({ id, parent, head }) => [
      id,
      {
        parent,
        head,
        rotation: mat3ToQuat(parent === null ? world(id) : mulMM(transpose(world(parent)), world(id))),
      },
    ]),
  );
})();
const measured = (bones) => dollRig(doll, { ...dressing, rig: { ...rigContent, skeleton: bones } });

test("a doll measured off a skeleton seats each part on its bone's head and rests each node as the skeleton's", () => {
  assert.doesNotThrow(() => measured(skeleton));
  const off = { ...skeleton, 'fore.L': { ...skeleton['fore.L'], head: add(skeleton['fore.L'].head, [0, 0.0002, 0]) } };
  assert.throws(() => measured(off), /fore\.L's part lies 0\.00020 m from the skeleton's head/);
  const turned = mat3ToQuat(mulMM(quatToMat3(skeleton.spine.rotation), rotAxis([0, 1, 0], 0.05)));
  assert.throws(() => measured({ ...skeleton, spine: { ...skeleton.spine, rotation: turned } }), /spine's node rests/);
  const { 'upper.R': _, ...missing } = skeleton;
  assert.throws(() => measured(missing), /upper\.R is no bone of the skeleton/);
  const rehung = { ...skeleton, 'fore.L': { ...skeleton['fore.L'], parent: 'upper.R' } };
  assert.throws(() => measured(rehung), /fore\.L hangs from upper\.L, not upper\.R as in the skeleton/);
  // The skeleton may hold a node above the rig's root, as UAL's `root` above its pelvis.
  const [root] = rig.bones.filter(({ parent }) => parent === null);
  const above = { root: { parent: null, head: [0, 0, 0], rotation: [0, 0, 0, 1] } };
  assert.doesNotThrow(() => measured({ ...skeleton, ...above, [root.id]: { ...skeleton[root.id], parent: 'root' } }));
});

test("a limb hangs on each side from that side's own bone of a paired bust part", () => {
  // Both girdle bones move the toy's one bust part, which is all a parent needs to be.
  const girdle = { ...rigContent.bones.spine, parent: 'spine' };
  const paired = dollRig(doll, {
    ...dressing,
    rig: {
      ...rigContent,
      bones: {
        ...rigContent.bones,
        clavicle_r: girdle,
        clavicle_l: girdle,
        upper: { ...rigContent.bones.upper, parent: { right: 'clavicle_r', left: 'clavicle_l' } },
      },
    },
  });
  const parentOf = (id) => paired.bones.find((b) => b.id === id).parent;
  assert.equal(parentOf('upper.R'), 'clavicle_r');
  assert.equal(parentOf('upper.L'), 'clavicle_l');
  assert.equal(parentOf('fore.L'), 'upper.L');
  const oneSided = { ...rigContent.bones.upper, parent: { right: 'spine' } };
  assert.throws(
    () => dollRig(doll, { ...dressing, rig: { ...rigContent, bones: { ...rigContent.bones, upper: oneSided } } }),
    /bone upper hangs from no bone on the left/,
  );
});

test("the left's limits mirror the axes in the mirror plane as they were written, under the turn", () => {
  const [right, left] = [bone('upper.R'), bone('upper.L')];
  assert.deepEqual(right.limits, { flex: [-10, 20], twist: [-30, 40], abduct: [-5, 60] });
  assert.deepEqual(left.limits, { flex: [-10, 20], twist: [-40, 30], abduct: [-60, 5] });
  assert.deepEqual(left.sense, [1, -1, -1]);
  // A pose of the left, its angles the right's times the sense, is the right's pose reflected across x.
  const angles = [12, -20, 33];
  const reflect = (m) => mulMM(mulMM([-1, 0, 0, 0, 1, 0, 0, 0, 1], m), [-1, 0, 0, 0, 1, 0, 0, 0, 1]);
  const posed = jointRotation(right, angles);
  const mirroredPose = jointRotation(
    left,
    angles.map((a, i) => a * left.sense[i]),
  );
  close(mirroredPose, reflect(posed));
});

const withUpper = (upper, on = doll) =>
  dollRig(on, { ...dressing, rig: { ...rigContent, bones: { ...rigContent.bones, upper } } });

test('a bone running obliquely in its part mirrors as squarely as one running down a doll axis', () => {
  const slanted = withUpper({ ...rigContent.bones.upper, along: [0.3, -1, 0.4] }).bones;
  const [right, left] = ['upper.R', 'upper.L'].map((id) => slanted.find((b) => b.id === id));
  close(left.frame.y, mirrorX(right.frame.y), 'the bone mirrored');
  assert.deepEqual(left.sense, [1, -1, -1]);
  const angles = [12, -20, 33];
  const reflect = (m) => mulMM(mulMM([-1, 0, 0, 0, 1, 0, 0, 0, 1], m), [-1, 0, 0, 0, 1, 0, 0, 0, 1]);
  close(
    jointRotation(
      left,
      angles.map((a, i) => a * left.sense[i]),
    ),
    reflect(jointRotation(right, angles)),
  );
});

test('a bone is refused a direction that leaves it no joint frame, or a mirrored copy turned apart from its own', () => {
  const upper = rigContent.bones.upper;
  assert.throws(() => withUpper({ ...upper, along: [0, 0, 0] }), /bone upper runs along no direction/);
  assert.throws(() => withUpper({ ...upper, along: [2, 0, 0] }), /bone upper runs along its flex axis/);
  assert.throws(() => withUpper({ ...upper, flexAxis: [1, 1, 0] }), /bone upper flexes about .* neither along x/);
  const parts = new Map(doll.parts);
  parts.set(
    'upper',
    doll.parts
      .get('upper')
      .map((copy) => (copy.side === 'left' ? { ...copy, turn: mat3ToQuat(rotAxis([0, 0, 1], 80)) } : copy)),
  );
  assert.throws(() => withUpper(upper, { ...doll, parts }), /bone upper's left copy is turned no mirror image/);
});

// The model meshes of the toy: one triangle per part, in the model frame.
const triangle = (points, offset) => ({
  positions: points.flatMap((p) => add(p, offset)),
  indices: [0, 1, 2],
  pieces: [undefined, undefined, undefined],
});
const POINTS = [
  [0.02, -0.1, 0.03],
  [0.05, -0.3, 0],
  [0, -0.2, -0.04],
];
const models = {
  bust: [{ part: 'torso', ...triangle(POINTS, [0, 0.2, 0]) }],
  arm: [
    { part: 'upper', ...triangle(POINTS, [0, 0, 0]) },
    { part: 'fore', ...triangle(POINTS, [0, -0.4, 0]) },
  ],
  sleeve_worn_cuff: [{ part: 'upper', ...triangle(POINTS, [0, 0.05, 0]) }],
};
const meshesOf = (id) => models[id];
const wearable = [
  { id: 'sleeve', tags: { slot: ['arms'] } },
  { id: 'sleeve_worn_cuff', tags: { fit: ['worn'] } },
];
const sites = wornSites(wearable[0], { dressing, doll, models: wearable });
const rest = restMeshes(rig, sites, meshesOf);
const pointsOf = ({ positions }) =>
  Array.from({ length: positions.length / 3 }, (_, i) => positions.slice(i * 3, i * 3 + 3));

test('rest meshes and worn pieces turn with the arm they ride', () => {
  const upper = rest.body.find(({ bone: id }) => id === 'upper.R').mesh;
  // The model's -y is the arm's length: -90 about z takes it to -x, and a point off the axis by x goes to -y.
  close(pointsOf(upper)[0], [-0.1 - 0.1, 0.4 - 0.02, 0.03], 'right upper');
  const left = rest.body.find(({ bone: id }) => id === 'upper.L').mesh;
  close(pointsOf(left)[0], [0.1 + 0.1, 0.4 - 0.02, 0.03], 'left upper, mirrored then turned the other way');
  const cuffs = rest.pieces.filter(({ piece }) => piece === 'sleeve_worn_cuff');
  assert.deepEqual(
    cuffs.map(({ bone: id }) => id),
    ['upper.R', 'upper.L'],
  );
  // The cuff is drawn in the upper arm's frame, so it lies where the arm's own part would at the same model point.
  close(pointsOf(cuffs[0].mesh)[0], [-0.1 - 0.05, 0.4 - 0.02, 0.03], 'right cuff');
  close(pointsOf(cuffs[1].mesh)[0], [0.1 + 0.05, 0.4 - 0.02, 0.03], 'left cuff');
});

// A game's joint nodes, glTF-style: each a translation and a rotation under its parent, at rest the node's rest rotation.
// The clip's turn of a bone about its head, `r` in the pose, is the node's local rotation Np^-1 * r * N, as a game that
// plays a clip over the rest-turned nodes would write it.
const nodeWorld = (id, pose) => {
  const chain = [];
  for (let b = bone(id); b; b = b.parent && bone(b.parent)) chain.unshift(b);
  let world = { r: IDENTITY_M, t: pose.root };
  let parent;
  for (const b of chain) {
    const n = quatToMat3(b.node.rotation);
    const turn = pose.rotations[b.id] ?? IDENTITY_M;
    const local = parent ? mulMM(transpose(quatToMat3(parent.node.rotation)), mulMM(turn, n)) : mulMM(turn, n);
    const move = parent ? mulMV(transpose(quatToMat3(parent.node.rotation)), sub(b.head, parent.head)) : b.head;
    world = { r: mulMM(world.r, local), t: add(world.t, mulMV(world.r, move)) };
    parent = b;
  }
  return world;
};
const seated = (b, q, pose) => {
  const { rotation, translation, scale } = b.bind.rest;
  const local = add(
    mulMV(
      quatToMat3(rotation),
      q.map((c, i) => c * scale[i]),
    ),
    translation,
  );
  return applyPoint(nodeWorld(b.id, pose), local);
};

const POSES = {
  rest: { root: [0, 0, 0], rotations: {} },
  posed: {
    root: [0.2, -0.1, 0.3],
    rotations: Object.fromEntries(
      rig.bones.map(({ id }, i) => [id, rotAxis([1 + (i % 3), 2 - (i % 2), 1 + (i % 4)], 15 + 7 * (i % 5))]),
    ),
  },
};

for (const [name, pose] of Object.entries(POSES)) {
  test(`bind.rest seats a part point through rest-turned nodes where the rest mesh is moved, ${name}`, () => {
    const transforms = boneTransforms(rig.bones, pose);
    const arms = rest.body.filter(({ bone: id }) => /^(upper|fore)\./.test(id));
    assert.equal(arms.length, 4);
    for (const { bone: id, mesh } of arms) {
      const b = bone(id);
      // bind.rest takes a point of the part's own frame, whose origin is the part's `at` in its model.
      pointsOf(mesh).forEach((atRest, i) => {
        close(seated(b, POINTS[i], pose), applyPoint(transforms.get(id), atRest), `${id} point ${i}`);
      });
    }
  });
}

test('a worn piece is seated on the turned arm by the arm bone alone', () => {
  const pose = POSES.posed;
  const transforms = boneTransforms(rig.bones, pose);
  for (const { bone: id, mesh } of rest.pieces) {
    const b = bone(id);
    pointsOf(mesh).forEach((atRest, i) => {
      close(
        seated(b, add(POINTS[i], [0, 0.05, 0]), pose),
        applyPoint(transforms.get(id), atRest),
        `${id} cuff point ${i}`,
      );
    });
  }
  // The cuff keeps its mirror: a left point is the right's reflected across x.
  const [r, l] = rest.pieces.map(({ mesh }) => pointsOf(mesh)[0]);
  close(l, mirrorX(r));
});

// ---- the mirror image of a turn, for any turn and either side as the rig's reference ----

const TURNS = {
  'about z, where the mirror image is the inverse': { axis: [0, 0, 1], degrees: -90 },
  'about y, where the mirror image is the inverse': { axis: [0, 1, 0], degrees: 90 },
  'about x, where the mirror image is the turn itself': { axis: [1, 0, 0], degrees: 90 },
  'about x, the other way': { axis: [1, 0, 0], degrees: -90 },
  'about y, the other way': { axis: [0, 1, 0], degrees: -90 },
  // A half turn is its own inverse and mirror image, so it cannot tell the mirror rule from a plain inverse; it only
  // checks the half turn itself.
  'about -x by a half turn': { axis: [-1, 0, 0], degrees: 180 },
  // An arm swung a little clear of the hips, and a turn askew of every face, which no quarter turn can stand in for.
  'about z by a few degrees': { axis: [0, 0, 1], degrees: 7 },
  'about x by an oblique angle': { axis: [1, 0, 0], degrees: -35 },
};
// The reflection of a rotation across x = 0, and of a frame's polar axes; a rotation axis (flex) flips with it.
const reflect = (m) => mulMM(mulMM([-1, 0, 0, 0, 1, 0, 0, 0, 1], m), [-1, 0, 0, 0, 1, 0, 0, 0, 1]);
const slanted = [0.6, -0.8, 0];

const scenario = (turn, reference) => {
  const turned = { ...dressing, limbs: [{ ...dressing.limbs[0], turn }] };
  const toy = dollOf(turned, figure);
  const content = {
    ...rigContent,
    reference,
    bones: { ...rigContent.bones, fore: { ...rigContent.bones.fore, along: slanted } },
  };
  const toyRig = dollRig(toy, { ...turned, rig: content });
  const toySites = wornSites(wearable[0], { dressing: turned, doll: toy, models: wearable });
  return { toy, toyRig, meshes: restMeshes(toyRig, toySites, meshesOf) };
};

for (const [name, turn] of Object.entries(TURNS)) {
  for (const reference of ['right', 'left']) {
    test(`a turn ${name}: the left arm is the right's image across x, ${reference} the rig's reference`, () => {
      const { toy, toyRig, meshes } = scenario(turn, reference);
      const [right, left] = toy.sites.slice(1).map((site) => site.turn);
      close(left, [right[0], -right[1], -right[2], right[3]], 'mirrored quaternion');
      const bones = (id) => [
        toyRig.bones.find((b) => b.id === `${id}.R`),
        toyRig.bones.find((b) => b.id === `${id}.L`),
      ];
      const meshOf = (list, id) => pointsOf(list.find(({ bone: b }) => b === id).mesh);
      for (const id of ['upper', 'fore']) {
        meshOf(meshes.body, `${id}.L`).forEach((p, i) => close(p, mirrorX(meshOf(meshes.body, `${id}.R`)[i]), id));
        const [r, l] = bones(id);
        close(l.head, mirrorX(r.head), `${id} head`);
        close(l.tail, mirrorX(r.tail), `${id} tail`);
        close(l.frame.y, mirrorX(r.frame.y), `${id} frame y`);
        close(l.frame.z, mirrorX(r.frame.z), `${id} frame z`);
        close(
          l.frame.x,
          mirrorX(r.frame.x).map((c) => -c),
          `${id} frame x, an axis of rotation`,
        );
        const [from, to] = reference === 'right' ? [r, l] : [l, r];
        const angles = [12, -20, 33];
        const posed = jointRotation(from, angles);
        const image = jointRotation(
          to,
          angles.map((a, i) => a * to.sense[i]),
        );
        close(image, reflect(posed), `${id} posed from the ${reference}`);
      }
      meshOf(meshes.pieces, 'upper.L').forEach((p, i) =>
        close(p, mirrorX(meshOf(meshes.pieces, 'upper.R')[i]), 'cuff'),
      );
    });
  }
}

test("a turn by any angle reads the turned part's faces off its box as it hangs, swung about its anchor", () => {
  const rigOf = (degrees) => {
    const turned = { ...dressing, limbs: [{ ...dressing.limbs[0], turn: { axis: [0, 0, 1], degrees } }] };
    return dollRig(dollOf(turned, figure), { ...turned, rig: rigContent });
  };
  const hanging = rigOf(0);
  const swung = rigOf(-7);
  const about = doll.anchors.shoulder_right;
  const swing = (p) => add(mulMV(rotAxis([0, 0, 1], -7), sub(p, about)), about);
  const of = (r, id) => r.bones.find((b) => b.id === id);
  // A looser box, the turned one's bound, would carry the reach and the pad past the part's far face and off its side.
  close(of(swung, 'fore.R').tail, swing(of(hanging, 'fore.R').tail), 'fore reach');
  close(padOf(of(swung, 'fore.R')), swing(padOf(of(hanging, 'fore.R'))), 'pad');
});

test('a turn that is no angle about a doll axis is refused', () => {
  const refused = (turn) => () => dollOf({ ...dressing, limbs: [{ ...dressing.limbs[0], turn }] }, figure);
  assert.throws(refused({ axis: [0, 0, 1], degrees: Number.NaN }), /no angle/);
  assert.throws(refused({ axis: [0.4, 0.2, 1], degrees: 90 }), /not a doll axis/);
  assert.throws(refused({ axis: [0, 0, 0], degrees: 90 }), /not a doll axis/);
  assert.throws(refused({ axis: [0, 0, 2], degrees: 90 }), /not a doll axis/);
});

test('a loose wearable on a turned part rests against it as it hangs and swings with it about its anchor', () => {
  const swung = { ...dressing, limbs: [{ ...dressing.limbs[0], turn: { axis: [0, 0, 1], degrees: -7 } }] };
  const places = [{ slot: 'arms', part: 'upper', against: [-1, 0, 0], sink: 0.5 }];
  const watch = box([-0.02, -0.1, -0.02], [0.02, 0, 0.02]);
  const sites = wornSites(
    { id: 'watch', tags: { slot: ['arms'] } },
    { dressing: { ...swung, places }, doll: dollOf(swung, figure), models: [], boxOf: () => watch },
  );
  const { at, turn } = sites[sites.length - 1];
  const about = doll.anchors.shoulder_right;
  const swing = (p) => add(mulMV(rotAxis([0, 0, 1], -7), sub(p, about)), about);
  // As the upper arm hangs it spans x -0.15 to -0.05 and y 0 to 0.4 here, so the watch rests half sunk on its outer face,
  // at x -0.15, halfway down it.
  const hung = (p) => add(p, [-0.15, 0.25, 0]);
  for (const corner of [watch.min, watch.max, [0.02, -0.1, -0.02]])
    close(add(mulMV(quatToMat3(turn), corner), at), swing(hung(corner)), 'watch');
});

test('a loose wearable across both copies of a turned part is refused, since they turn apart', () => {
  assert.throws(
    () =>
      wornSites(
        { id: 'sleeves', tags: { slot: ['arms'] } },
        {
          dressing: { ...dressing, places: [{ slot: 'arms', part: 'upper', both: true, against: [0, 0, 0], sink: 0 }] },
          doll,
          models: [],
        },
      ),
    /turned apart/,
  );
});
