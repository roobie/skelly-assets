import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { decodeFrame } from '../../site/clipFrames.mjs';
import { applyPoint, boneTransforms } from '../../site/kinematics.mjs';
import { clipIssues, posedCorners } from '../../site/poseFile.mjs';
import { exportDollRigs } from '../dollRig.mjs';
import { exportLocomotion, gaitAngles, locomotionClips, locomotionProblems, readLocomotion } from '../locomotion.mjs';
import { dollTree, repo } from './doll-tree.mjs';

// The doll alone, so the gait is checked on the legs it ships with, and every other doll's parts for the rig export.
const { built, manifest, rig } = dollTree({ everyDoll: true });
const gait = readLocomotion(repo);
const { clips, reports } = locomotionClips(rig, gait);
const posed = (frame) => boneTransforms(rig.bones, decodeFrame(frame));
const ankle = (frame, foot) => applyPoint(posed(frame).get(foot), rig.bones.find((bone) => bone.id === foot).head);

test('no baked frame asks a joint past its limit, the feet aside, which the gait holds as level as they go', () => {
  assert.deepEqual(locomotionProblems(reports), []);
});

test('every clip poses the rig, and every frame stands the barefoot doll on the ground', () => {
  for (const [name, clip] of Object.entries(clips)) {
    const poseClip = name === 'idle' ? { kind: 'pose', frames: [clip.base] } : clip;
    assert.deepEqual(clipIssues(rig, poseClip), [], name);
    for (const frame of poseClip.frames) {
      const lowest = Math.min(...posedCorners(rig, decodeFrame(frame)).map((p) => p[1]));
      assert.ok(Math.abs(lowest) < 1e-9, `${name}: the lowest point stands at ${lowest}`);
    }
  }
});

test('the idle sways the stand by oscillators on the rig, on Sim seconds', () => {
  assert.deepEqual(clips.idle.base, clips.stand.frames[0]);
  const bones = new Set(rig.bones.map((bone) => bone.id));
  for (const oscillator of clips.idle.motion) {
    assert.ok(oscillator.periodSimSeconds > 0);
    for (const { bone } of oscillator.bones) assert.ok(bones.has(bone), bone);
  }
});

test("each walk's planted foot runs back at a steady pace, half the stride over its half of the loop", () => {
  for (const name of Object.keys(gait.walks)) {
    const { frames, strideMetres, loop } = clips[name];
    assert.equal(loop, true);
    const half = frames.length / 2;
    gait.bones.feet.forEach((foot, side) => {
      // The left foot plants at the loop's start, the right half a loop on.
      const planted = Array.from({ length: half + 1 }, (_, k) =>
        ankle(frames[(k + side * half) % frames.length], foot),
      );
      const step = strideMetres / 2 / half;
      planted.slice(1).forEach((at, k) => {
        const moved = planted[k][2] - at[2];
        assert.ok(Math.abs(moved - step) < 1e-5, `${name} ${foot} frame ${k}: moved ${moved} m, a steady step ${step}`);
        assert.ok(Math.abs(at[0] - planted[0][0]) < 1e-6, `${name} ${foot}: drifts sideways`);
      });
    });
  }
});

test('each walk loop closes: the pose a loop on is the first', () => {
  for (const walk of Object.values(gait.walks))
    assert.deepEqual(
      Object.entries(gaitAngles(rig, gait, walk, 2 * Math.PI)).map(([id, turn]) => [id, turn.map((a) => a.toFixed(6))]),
      Object.entries(gaitAngles(rig, gait, walk, 0)).map(([id, turn]) => [id, turn.map((a) => a.toFixed(6))]),
    );
});

test("a lean is taken at the hips first, so the run's back swing stays within the hip's extension", () => {
  const run = gaitAngles(rig, gait, gait.walks.run, Math.PI);
  assert.equal(run.pelvis[0], gait.walks.run.leanDeg);
  assert.equal(run.spine[0], 0);
  const [extension] = rig.bones.find((bone) => bone.id === 'thigh.L').limits.flex;
  assert.ok(run['thigh.L'][0] >= extension - 1e-9, `thigh.L flexes ${run['thigh.L'][0]}`);
});

test("each doll's rig is written at its record's path, the player's with the site of each of its models", () => {
  const { files, dolls } = exportDollRigs(built, manifest, repo);
  assert.deepEqual(files, ['skelly.body/motions/doll.rig.json', 'skelly.body/dolls/ual.rig.json']);
  assert.deepEqual(dolls, [
    {
      id: 'player',
      pack: 'skelly.body',
      rig: 'motions/doll.rig.json',
      models: { bust: 'player_bust', arm: 'player_arm', leg: 'player_leg', clavicle: 'player_clavicle' },
    },
    {
      id: 'ual',
      pack: 'skelly.body',
      rig: 'dolls/ual.rig.json',
      models: { bust: 'ual_bust', arm: 'ual_arm', leg: 'ual_leg' },
    },
  ]);
  const written = JSON.parse(readFileSync(join(built, files[0]), 'utf8'));
  assert.equal(written.id, rig.id);
  assert.deepEqual(
    written.doll.map(({ model }) => model),
    ['player_bust', 'player_arm', 'player_arm', 'player_leg', 'player_leg', 'player_clavicle', 'player_clavicle'],
  );
});

test('the export writes the clips beside the rig, naming its revision, and the motions entry for the manifest', () => {
  const { files, motions } = exportLocomotion(built, manifest, repo);
  assert.deepEqual(motions, [
    {
      id: 'doll_locomotion',
      pack: 'skelly.body',
      rig: 'motions/doll.rig.json',
      path: 'motions/doll.locomotion.json',
    },
  ]);
  assert.deepEqual(files, ['skelly.body/motions/doll.locomotion.json']);
  const written = JSON.parse(readFileSync(join(built, files[0]), 'utf8'));
  assert.deepEqual(written.rig, { id: rig.id, revision: rig.revision });
  assert.deepEqual(Object.keys(written.clips).sort(), Object.keys(clips).sort());
});
