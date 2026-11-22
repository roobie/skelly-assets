import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { posedSolid, signedDepth } from '../../site/clearance.mjs';
import { decodeFrame } from '../../site/clipFrames.mjs';
import { padOf } from '../../site/fingers.mjs';
import { applyPoint, boneTransforms, boundBox, dot, length, mulMV, normalize, sub } from '../../site/kinematics.mjs';
import { compilePose, frameAngles } from '../../site/poseFile.mjs';
import { dollTree, repo } from './doll-tree.mjs';

// The pose fixtures hold the wields' weapons and guns, so the tree holds everything a hand does.
const { rig, itemMesh } = dollTree({ held: true });
const fixtures = readdirSync(join(repo, 'models/poses'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => ({ name, file: JSON.parse(readFileSync(join(repo, 'models/poses', name), 'utf8')) }));

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
  const bones = new Map(rig.bones.map((bone) => [bone.id, bone]));
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
  const bones = new Map(rig.bones.map((bone) => [bone.id, bone]));
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

test('opposition rolls either thumb pad toward its own little finger, the mirrored copy a mirror of the reference', () => {
  const shorthand = { thumb: { oppose: 1, lift: 0.5 } };
  const { frame, report } = compilePose(rig, {
    rig: { id: rig.id, revision: rig.revision },
    hands: { 'hand.L': shorthand, 'hand.R': shorthand },
  });
  assert.deepEqual(report.clamped, []);
  const bones = new Map(rig.bones.map((bone) => [bone.id, bone]));
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

test("the grip preset seats a haft across the palm, slanted so every finger wraps it from its root, the thumb's first segment bearing on it and its tip closing over it, on either hand", () => {
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
  const bones = new Map(rig.bones.map((bone) => [bone.id, bone]));
  // A part's nearest approach to the haft over its box's corners, edges and faces, negative when sunk in.
  const lattice = ({ min, max }) =>
    [0, 1, 2, 3]
      .flatMap((i) => [0, 1, 2, 3].flatMap((j) => [0, 1, 2, 3].map((k) => [i, j, k])))
      .filter((steps) => steps.some((s) => s === 0 || s === 3))
      .map((steps) => steps.map((s, a) => min[a] + (s / 3) * (max[a] - min[a])));
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
    // A turned part is sampled on its box as it hangs, carried by its rest turn, where that box bounds it exactly.
    const gap = (id) => {
      const { box, rest } = boundBox(bones.get(id).bind);
      const at = (p) => applyPoint(transforms.get(id), applyPoint(rest, p));
      return Math.min(...lattice(box).map((p) => signedDepth(solid, at(p), 0.1)));
    };
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
    assert.ok(
      gap(`thumb_01.${side}`) < 0.003,
      `the ${side} thumb's first segment bears on the haft, not ${(gap(`thumb_01.${side}`) * 1000).toFixed(1)} mm off it`,
    );
    const thumbTip = bones.get(`thumb_03.${side}`);
    assert.ok(
      beyond(thumbTip) > 0,
      `the ${side} thumb closes over the haft's far side, not ${(-beyond(thumbTip) * 1000).toFixed(1)} mm short of its middle`,
    );
  }
});
