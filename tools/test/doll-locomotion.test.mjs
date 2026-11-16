import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { after, test } from 'node:test';
import { decodeFrame } from '../../site/clipFrames.mjs';
import { applyPoint, boneTransforms } from '../../site/kinematics.mjs';
import { clipIssues, posedCorners } from '../../site/poseFile.mjs';
import { dollRig, readRigContent } from '../dollRig.mjs';
import { readDoll, readDressing } from '../dress.mjs';
import { exportLocomotion, gaitAngles, locomotionClips, locomotionProblems, readLocomotion } from '../locomotion.mjs';

// The doll alone, built from the repo's own content, so the gait is checked on the legs it ships with.
const repo = resolve(import.meta.dirname, '../..');
const built = mkdtempSync(join(tmpdir(), 'doll-locomotion-'));
after(() => rmSync(built, { recursive: true, force: true }));
execFileSync(
  process.execPath,
  [join(repo, 'tools/build.mjs'), '--no-cache', '--out', built, 'player_bust', 'player_arm', 'player_leg'],
  { cwd: repo, stdio: 'pipe' },
);
// A build of named ids writes no manifest, so the models it built are listed here as the manifest would list them.
const manifest = {
  models: readdirSync(built).flatMap((pack) =>
    readdirSync(join(built, pack, 'assets/models')).map((file) => ({
      id: file.slice(0, -'.glb'.length),
      pack,
      path: `assets/models/${file}`,
    })),
  ),
};
const dressing = readDressing(repo);
const rig = dollRig(readRigContent(repo), readDoll(built, manifest, dressing), dressing);
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
        assert.ok(Math.abs(moved - step) < 1e-3, `${name} ${foot} frame ${k}: moved ${moved} m, a steady step ${step}`);
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
