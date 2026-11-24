import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { posedSolid, signedDepth } from '../../site/clearance.mjs';
import { decodeFrame } from '../../site/clipFrames.mjs';
import { padOf, probeOf } from '../../site/fingers.mjs';
import {
  applyPoint,
  boneTransforms,
  boundBox,
  composed,
  dot,
  length,
  mulMV,
  normalize,
  sub,
} from '../../site/kinematics.mjs';
import { compilePose, frameAngles } from '../../site/poseFile.mjs';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { dollTree, repo } from './doll-tree.mjs';

// The pose fixtures hold the wields' weapons and guns, so the tree holds everything a hand does.
const { rig, itemMesh } = dollTree({ held: true });
const fixtures = readdirSync(join(repo, 'models/poses'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => ({ name, file: JSON.parse(readFileSync(join(repo, 'models/poses', name), 'utf8')) }));
const bones = new Map(rig.bones.map((bone) => [bone.id, bone]));

// A part's nearest approach to a posed solid, negative when sunk in, at the points the grip probes it.
const partGap = (transforms, id, solid) =>
  Math.min(...probeOf(bones.get(id)).map((p) => signedDepth(solid, applyPoint(transforms.get(id), p), 0.1)));

// A part as a posed solid, its exact box.
const partSolid = (transforms, id) => {
  const { box, rest } = boundBox(bones.get(id).bind);
  const corner = (i) => [0, 1, 2].map((a) => ((i >> a) & 1 ? box.max[a] : box.min[a]));
  const quads = [
    [0, 1, 3, 2],
    [4, 6, 7, 5],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 5, 7, 3],
  ];
  return posedSolid(
    {
      positions: [0, 1, 2, 3, 4, 5, 6, 7].flatMap(corner),
      indices: quads.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]),
    },
    composed(transforms.get(id), rest),
  );
};

// A gripping thumb closes over the fist: its knuckle stays by the palm, within the fist's depth of the palm along
// `into`, the way from the palm into the held item, and its last two bones lie on the fingers or the item, neither
// standing off them nor sunk in them.
const assertThumbOverFist = (transforms, side, item, into, name) => {
  const head = (id) => applyPoint(transforms.get(id), bones.get(id).head);
  const off = dot(sub(head(`thumb_02.${side}`), head(`hand.${side}`)), into);
  assert.ok(off > 0 && off < 0.07, `${name}: the thumb's knuckle stands ${(off * 1000).toFixed(0)} mm off the palm`);
  const fist = rig.bones
    .filter((bone) => bone.digit && bone.digit !== 'thumb' && bone.id.endsWith(`.${side}`))
    .map((bone) => partSolid(transforms, bone.id));
  for (const id of [`thumb_02.${side}`, `thumb_03.${side}`]) {
    const least = Math.min(...[item, ...fist].map((body) => partGap(transforms, id, body)));
    assert.ok(least < 0.004, `${name}: ${id} stands ${(least * 1000).toFixed(1)} mm off the fist`);
    assert.ok(least > -0.0015, `${name}: ${id} sinks ${(-least * 1000).toFixed(1)} mm into the fist`);
  }
};

test('every pose fixture compiles on the doll within its limits', () => {
  assert.ok(fixtures.length > 0);
  for (const { name, file } of fixtures) {
    const { report } = compilePose(rig, file, { meshOf: itemMesh });
    assert.deepEqual(report.clamped, [], `${name} asks past a limit`);
    for (const [id, left] of Object.entries(report.residuals))
      assert.ok(left < 1e-6, `${name}: ${id} falls ${left} m short`);
    for (const [hand, digits] of Object.entries(report.grips)) {
      for (const [digit, { residual }] of Object.entries(digits))
        assert.ok(!(residual > 1e-3), `${name}: ${hand} ${digit} pinches ${residual} m off`);
    }
  }
});

test('a curled hand closes toward its own palm on both sides, the mirrored copy a mirror of the reference', () => {
  const { frame, report } = compilePose(rig, {
    rig: { id: rig.id, revision: rig.revision },
    hands: { 'hand.L': { curl: 1 }, 'hand.R': { curl: 1 } },
  });
  assert.deepEqual(report.clamped, []);
  const curled = boneTransforms(rig.bones, decodeFrame(frame));
  const tip = (side) => {
    const bone = bones.get(`index_03.${side}`);
    return applyPoint(curled.get(bone.id), bone.tail);
  };
  for (const side of ['L', 'R']) {
    const hand = bones.get(`hand.${side}`),
      knuckle = bones.get(`index_01.${side}`);
    const knuckleAt = applyPoint(curled.get(knuckle.id), knuckle.head);
    const fromKnuckle = sub(tip(side), knuckleAt);
    const intoPalm = mulMV(curled.get(hand.id).r, [hand.bind.mirror ? -1 : 1, 0, 0]);
    const towardWrist = normalize(sub(applyPoint(curled.get(hand.id), hand.head), knuckleAt));
    // The knuckles stand at the palm's mid-thickness and the finger is longer than the palm is thick, so a full
    // curl tucks the tip back under the knuckle row, only a few millimetres toward the palm's face.
    assert.ok(dot(fromKnuckle, intoPalm) > 0.002, `the ${side} fingertip comes back to the palm's side`);
    assert.ok(dot(fromKnuckle, towardWrist) > 0.02, `the ${side} fingertip folds back past the knuckle row`);
  }
  const [l, r] = [tip('L'), tip('R')];
  assert.ok(length(sub(r, [-l[0], l[1], l[2]])) < 1e-9, 'the right fingertip mirrors the left across x');
});

test('a flexed wrist bends either hand toward its palm and an abducted one toward its thumb', () => {
  const asked = (side, angles) => ({
    [`hand.${side}`]: bones.get(`hand.${side}`).sense.map((sense, i) => sense * angles[i]),
  });
  for (const [angles, toward] of [
    [[40, 0, 0], 'palm'],
    [[0, 0, 15], 'thumb'],
  ]) {
    const { frame, report } = compilePose(rig, {
      rig: { id: rig.id, revision: rig.revision },
      angles: { ...asked('L', angles), ...asked('R', angles) },
    });
    assert.deepEqual(report.clamped, []);
    const posed = boneTransforms(rig.bones, decodeFrame(frame));
    for (const side of ['L', 'R']) {
      const hand = bones.get(`hand.${side}`);
      const along = normalize(
        sub(applyPoint(posed.get(hand.id), hand.tail), applyPoint(posed.get(hand.id), hand.head)),
      );
      // At rest the palm faces the body and the thumb runs forward, +z, on either hand.
      const way = toward === 'palm' ? [hand.bind.mirror ? -1 : 1, 0, 0] : [0, 0, 1];
      assert.ok(dot(along, way) > 0.2, `the ${side} hand bends toward its ${toward}, along ${along}`);
    }
  }
});

test("a protracted clavicle brings either shoulder forward by the clavicle's reach, a retracted one back", () => {
  const reach = JSON.parse(evaluateJsonnet("(import 'models/dolls/player/clavicle.libsonnet').reach", repo));
  const [retracted, protracted] = bones.get('clavicle.L').limits.flex;
  for (const [flex, forward] of [
    [protracted, reach],
    [retracted, undefined],
  ]) {
    const asked = (side) => ({
      [`clavicle.${side}`]: bones.get(`clavicle.${side}`).sense.map((s, i) => s * [flex, 0, 0][i]),
    });
    const { frame, report } = compilePose(rig, {
      rig: { id: rig.id, revision: rig.revision },
      angles: { ...asked('L'), ...asked('R') },
    });
    assert.deepEqual(report.clamped, []);
    const posed = boneTransforms(rig.bones, decodeFrame(frame));
    for (const side of ['L', 'R']) {
      const { head } = bones.get(`upperArm.${side}`);
      const moved = applyPoint(posed.get(`clavicle.${side}`), head)[2] - head[2];
      if (forward === undefined) assert.ok(moved < 0, `the retracted ${side} shoulder comes ${moved} m forward`);
      else {
        assert.ok(Math.abs(moved - forward) < 1e-6, `the protracted ${side} shoulder comes ${moved} m forward`);
        // The shoulder sweeps round the clavicle's joint, so it comes out as well as forward, on either side outward.
        const out = (applyPoint(posed.get(`clavicle.${side}`), head)[0] - head[0]) * (side === 'L' ? 1 : -1);
        assert.ok(Math.abs(out - 0.044) < 0.0005, `the protracted ${side} shoulder comes ${out} m out, not 0.044`);
      }
    }
  }
});

test('opposition rolls either thumb pad toward its own little finger, the mirrored copy a mirror of the reference', () => {
  const shorthand = { thumb: { oppose: 1, lift: 0.5 } };
  const { frame, report } = compilePose(rig, {
    rig: { id: rig.id, revision: rig.revision },
    hands: { 'hand.L': shorthand, 'hand.R': shorthand },
  });
  assert.deepEqual(report.clamped, []);
  const posed = boneTransforms(rig.bones, decodeFrame(frame));
  const tip = (side) => {
    const bone = bones.get(`thumb_03.${side}`);
    return applyPoint(posed.get(bone.id), bone.tail);
  };
  for (const side of ['L', 'R']) {
    const root = bones.get(`thumb_01.${side}`);
    // The pad faces the way the palm does at rest, and the little finger lies at -z of either hand.
    const pad = mulMV(posed.get(root.id).r, [root.bind.mirror ? -1 : 1, 0, 0]);
    assert.ok(pad[2] < -0.5, `the ${side} thumb pad turns toward the little finger, not ${pad}`);
  }
  const [l, r] = [tip('L'), tip('R')];
  assert.ok(length(sub(r, [-l[0], l[1], l[2]])) < 1e-9, 'the right thumb tip mirrors the left across x');
});

test('the grip preset seats a haft across the palm, slanted so every finger wraps it from its root, and the thumb closes over the fist, on either hand', () => {
  // An octagonal haft across the palm, as a hand-worn handle is rounded, seated on the palm's grip socket and following
  // the hand; the forearm is bent so the hand stands clear of the body.
  const width = 0.03;
  const rim = (end) =>
    [0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => {
      const angle = ((2 * i + 1) * Math.PI) / 8;
      return [Math.cos(angle), Math.sin(angle)].map((c) => (c * width) / 2 / Math.cos(Math.PI / 8)).concat(end * 0.1);
    });
  const ring = [0, 1, 2, 3, 4, 5, 6, 7];
  const sides = ring.flatMap((i) => [i, (i + 1) % 8, 8 + ((i + 1) % 8), i, 8 + ((i + 1) % 8), 8 + i]);
  const caps = [1, 2, 3, 4, 5, 6].flatMap((k) => [0, k, k + 1, 8, 8 + k, 9 + k]);
  const haft = { positions: [...rim(-1), ...rim(1)], indices: [...sides, ...caps] };
  for (const side of ['L', 'R']) {
    const forearm = bones.get(`forearm.${side}`);
    const file = {
      rig: { id: rig.id, revision: rig.revision },
      angles: { [forearm.id]: forearm.sense.map((sense, i) => sense * [90, 0, 0][i]) },
      hands: { [`hand.${side}`]: 'grip' },
      hold: {
        [`hand.${side}`]: { model: 'haft', socket: { at: [-width / 2, 0, 0], into: [1, 0, 0], axis: [0, 0, 1] } },
      },
    };
    const { frame, report, held } = compilePose(rig, file, { meshOf: () => haft });
    const item = held[`hand.${side}`];
    const solid = posedSolid(haft, item);
    const transforms = boneTransforms(rig.bones, decodeFrame(frame));
    const gap = (id) => partGap(transforms, id, solid);
    const digits = rig.bones.filter((bone) => bone.digit && bone.id.endsWith(`.${side}`));
    for (const bone of digits)
      assert.ok(gap(bone.id) > -0.0015, `${bone.id} sinks ${(-gap(bone.id) * 1000).toFixed(1)} mm into the haft`);
    // A closed fist has no daylight in it: every phalanx of every finger, the little one's too, bears on the haft.
    for (const bone of digits.filter((b) => b.digit !== 'thumb')) {
      assert.ok(gap(bone.id) < 0.004, `${bone.id} stands ${(gap(bone.id) * 1000).toFixed(1)} mm off the haft`);
    }
    // Slanted across the palm, the haft lies furthest from the index finger's root and nearest the little finger's, so
    // the knuckles bend more toward the little finger, as a hand's do round a handle; held square, the little finger's
    // knuckle bends least and the finger stands off the fist.
    const angles = frameAngles(rig, frame);
    const flex = (id) => Math.abs(angles[id][0]);
    assert.ok(
      flex(`pinky_01.${side}`) >= flex(`index_01.${side}`),
      `the ${side} little finger's knuckle bends ${flex(`pinky_01.${side}`).toFixed(0)}°, less than the index's ${flex(`index_01.${side}`).toFixed(0)}°`,
    );
    // Away from the palm is the socket's `into`; a tip past the haft's middle that way has wrapped round it.
    const beyond = (tip) => dot(sub(applyPoint(transforms.get(tip.id), padOf(tip)), item.t), mulMV(item.r, [1, 0, 0]));
    // Every finger wraps the haft, the little one too, so none stands off a handle the others hold.
    const tips = digits.filter((bone) => bone.digit !== 'thumb' && !digits.some((other) => other.parent === bone.id));
    for (const tip of tips)
      assert.ok(beyond(tip) > 0, `${tip.id} stops ${(-beyond(tip) * 1000).toFixed(1)} mm short of the haft's middle`);
    assert.ok(report.grips[`hand.${side}`].thumb.touched, `the ${side} thumb closes on the haft`);
    assertThumbOverFist(transforms, side, solid, mulMV(item.r, [1, 0, 0]), side);
    const thumbTip = bones.get(`thumb_03.${side}`);
    assert.ok(
      beyond(thumbTip) > 0,
      `the ${side} thumb closes over the haft's far side, not ${(-beyond(thumbTip) * 1000).toFixed(1)} mm short of its middle`,
    );
  }
});

test("the idles' gripping hands close the thumb over the fist", () => {
  for (const name of ['onehand_stance_idle.json', 'twohand_stance_idle.json']) {
    const { file } = fixtures.find((fixture) => fixture.name === name);
    const { frame, held } = compilePose(rig, file, { meshOf: itemMesh });
    const transforms = boneTransforms(rig.bones, decodeFrame(frame));
    const gripping = Object.keys(file.hold).filter((hand) => file.hands[hand] === 'grip');
    assert.ok(gripping.length > 0, `${name} grips nothing`);
    for (const hand of gripping) {
      const solid = posedSolid(itemMesh(file.hold[hand].model), held[hand]);
      const side = hand.split('.')[1];
      const into = normalize(mulMV(held[hand].r, file.hold[hand].socket.into));
      assertThumbOverFist(transforms, side, solid, into, `${name} ${hand}`);
    }
  }
});
