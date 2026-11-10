import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { after, test } from 'node:test';
import { boneTransforms as mobBoneTransforms } from '../packages/mobgen/src/core/pose.ts';
import { clearanceProbe } from '../../site/clearance.mjs';
import { applyPoint, boneTransforms, dot, length, mulMV, normalize, scale, sub } from '../../site/kinematics.mjs';
import { compilePose, decodeFrame } from '../../site/poseFile.mjs';
import { decodeFrame as actorDecodeFrame } from '../actorCompose.mjs';
import { modelTaxonomies } from '../check-taxonomy.mjs';
import { dollRig, readRigContent, restMeshes, treeMeshes } from '../dollRig.mjs';
import { modelBox, readDoll, readDressing, wornSites } from '../dress.mjs';
import { manifestTaxonomy } from '../taxonomy.mjs';

// The doll and one jacket built from the repo's own content, so these check the rig, the fixtures and the probe against
// the doll as it is drawn, not against a stand-in.
const repo = resolve(import.meta.dirname, '../..');
const WEAR = 'leather_jacket';
const built = mkdtempSync(join(tmpdir(), 'doll-pose-'));
after(() => rmSync(built, { recursive: true, force: true }));
execFileSync(process.execPath, [join(repo, 'tools/build.mjs'), '--no-cache', '--out', built, 'player_bust', 'player_arm', 'player_leg', WEAR, `${WEAR}_worn_body`, `${WEAR}_worn_upper`, `${WEAR}_worn_fore`], { cwd: repo, stdio: 'pipe' });

// A build of named ids writes no manifest, so the models it built are listed here with their source taxonomy, as the
// manifest would list them.
const taxonomies = new Map((await modelTaxonomies(repo)).map(({ pack, id, taxonomy }) => [`${pack}/${id}`, taxonomy]));
const manifest = {
  models: readdirSync(built).flatMap((pack) => readdirSync(join(built, pack, 'assets/models')).map((file) => {
    const id = file.slice(0, -'.glb'.length);
    return { id, pack, path: `assets/models/${file}`, ...manifestTaxonomy(taxonomies.get(`${pack}/${id}`)) };
  })),
};
const dressing = readDressing(repo);
const doll = readDoll(built, manifest, dressing);
const rig = dollRig(readRigContent(repo), doll, dressing);
const models = manifest.models.filter((model) => model.path.endsWith('.glb'));
const boxOf = (id) => { const entry = models.find((model) => model.id === id); return modelBox(readFileSync(join(built, entry.pack, entry.path))); };
const rest = restMeshes(rig, wornSites(models.find((model) => model.id === WEAR), { dressing, doll, models, boxOf }), treeMeshes(built, manifest));
const margin = rig.clearance.marginMetres;
const fixtures = readdirSync(join(repo, 'models/poses')).filter((name) => name.endsWith('.json'))
  .map((name) => ({ name, file: JSON.parse(readFileSync(join(repo, 'models/poses', name), 'utf8')) }));
const still = boneTransforms(rig.bones, { root: [0, 0, 0], rotations: {} });

test('every pose fixture compiles on the doll within its limits, and its frame poses a mob the same way', () => {
  assert.ok(fixtures.length > 0);
  for (const { name, file } of fixtures) {
    const { frame, report } = compilePose(rig, file);
    assert.deepEqual(report.clamped, [], `${name} asks past a limit`);
    for (const [id, left] of Object.entries(report.residuals)) assert.ok(left < 1e-6, `${name}: ${id} falls ${left} m short`);
    // mobgen's own transforms of the frame as a mob clip reader decodes it agree with ours.
    const theirs = mobBoneTransforms(rig.bones, actorDecodeFrame(frame)), ours = boneTransforms(rig.bones, decodeFrame(frame));
    for (const bone of rig.bones) theirs.get(bone.id).t.forEach((v, i) => assert.ok(Math.abs(v - ours.get(bone.id).t[i]) < 1e-9, `${name}: ${bone.id}`));
  }
});

test('the jacket at rest is clean within the rig margin', () => {
  assert.ok(rest.pieces.length > 0);
  assert.deepEqual(clearanceProbe(rig, rest, { margin })(still), { pokes: [], sinks: [] });
});

test('upper sleeves narrowed inside their arms let the upper arms poke through', () => {
  // Each upper sleeve shrunk about its bone's axis until its widest reach is half the arm's, which puts it inside the
  // arm's narrowest side however much ease the jacket gives: too tight for the arm it is drawn on.
  const bones = new Map(rig.bones.map((bone) => [bone.id, bone]));
  const radial = ({ head, tail }) => {
    const axis = normalize(sub(tail, head));
    return (p) => { const offset = sub(p, head); return sub(offset, scale(axis, dot(offset, axis))); };
  };
  const points = ({ positions }) => Array.from({ length: positions.length / 3 }, (_, i) => positions.slice(i * 3, i * 3 + 3));
  const girth = (mesh, bone) => Math.max(...points(mesh).map((p) => length(radial(bone)(p))));
  const narrowed = ({ mesh, bone: id }) => {
    const bone = bones.get(id), across = radial(bone);
    const arm = rest.body.find((part) => part.bone === id).mesh;
    const factor = (0.5 * girth(arm, bone)) / girth(mesh, bone);
    return { positions: points(mesh).flatMap((p) => sub(p, scale(across(p), 1 - factor))), indices: mesh.indices };
  };
  const pieces = rest.pieces.map((piece) => (piece.piece === `${WEAR}_worn_upper` ? { ...piece, mesh: narrowed(piece) } : piece));
  assert.ok(pieces.some((piece, i) => piece !== rest.pieces[i]), 'the jacket has upper sleeves to narrow');
  const { pokes } = clearanceProbe(rig, { ...rest, pieces }, { margin })(still);
  assert.ok(pokes.some(({ bone }) => bone.startsWith('upperArm.')), 'an upper arm shows through');
});

test('a curled hand closes toward its own palm on both sides, the mirrored copy a mirror of the reference', () => {
  const { frame, report } = compilePose(rig, { rig: { id: rig.id, revision: rig.revision }, hands: { 'hand.L': { curl: 1 }, 'hand.R': { curl: 1 } } });
  assert.deepEqual(report.clamped, []);
  const bones = new Map(rig.bones.map((bone) => [bone.id, bone]));
  const curled = boneTransforms(rig.bones, decodeFrame(frame));
  const tip = (side) => { const bone = bones.get(`index3.${side}`); return applyPoint(curled.get(bone.id), bone.tail); };
  for (const side of ['L', 'R']) {
    const hand = bones.get(`hand.${side}`), knuckle = bones.get(`index.${side}`);
    const intoPalm = mulMV(curled.get(hand.id).r, [hand.bind.mirror ? -1 : 1, 0, 0]);
    // The fingers hang from the palm's mid-thickness, so a full curl ends a few millimetres toward the palm face.
    assert.ok(dot(sub(tip(side), applyPoint(curled.get(knuckle.id), knuckle.head)), intoPalm) > 0.005, `the ${side} fingertip comes back toward the palm`);
  }
  const [l, r] = [tip('L'), tip('R')];
  assert.ok(length(sub(r, [-l[0], l[1], l[2]])) < 1e-9, 'the right fingertip mirrors the left across x');
});

test('a flexed wrist bends either hand toward its palm and an abducted one toward its thumb', () => {
  const bones = new Map(rig.bones.map((bone) => [bone.id, bone]));
  const asked = (side, angles) => ({ [`hand.${side}`]: bones.get(`hand.${side}`).sense.map((sense, i) => sense * angles[i]) });
  for (const [angles, toward] of [[[40, 0, 0], 'palm'], [[0, 0, 15], 'thumb']]) {
    const { frame, report } = compilePose(rig, { rig: { id: rig.id, revision: rig.revision }, angles: { ...asked('L', angles), ...asked('R', angles) } });
    assert.deepEqual(report.clamped, []);
    const posed = boneTransforms(rig.bones, decodeFrame(frame));
    for (const side of ['L', 'R']) {
      const hand = bones.get(`hand.${side}`);
      const along = normalize(sub(applyPoint(posed.get(hand.id), hand.tail), applyPoint(posed.get(hand.id), hand.head)));
      // At rest the palm faces the body and the thumb runs forward, +z, on either hand.
      const way = toward === 'palm' ? [hand.bind.mirror ? -1 : 1, 0, 0] : [0, 0, 1];
      assert.ok(dot(along, way) > 0.2, `the ${side} hand bends toward its ${toward}, along ${along}`);
    }
  }
});

test('opposition rolls either thumb pad toward its own little finger, the mirrored copy a mirror of the reference', () => {
  const shorthand = { thumb: { oppose: 1, lift: 0.5 } };
  const { frame, report } = compilePose(rig, { rig: { id: rig.id, revision: rig.revision }, hands: { 'hand.L': shorthand, 'hand.R': shorthand } });
  assert.deepEqual(report.clamped, []);
  const bones = new Map(rig.bones.map((bone) => [bone.id, bone]));
  const posed = boneTransforms(rig.bones, decodeFrame(frame));
  const tip = (side) => { const bone = bones.get(`thumb3.${side}`); return applyPoint(posed.get(bone.id), bone.tail); };
  for (const side of ['L', 'R']) {
    const root = bones.get(`thumb.${side}`);
    // The pad faces the way the palm does at rest, and the little finger lies at -z of either hand.
    const pad = mulMV(posed.get(root.id).r, [root.bind.mirror ? -1 : 1, 0, 0]);
    assert.ok(pad[2] < -0.5, `the ${side} thumb pad turns toward the little finger, not ${pad}`);
  }
  const [l, r] = [tip('L'), tip('R')];
  assert.ok(length(sub(r, [-l[0], l[1], l[2]])) < 1e-9, 'the right thumb tip mirrors the left across x');
});
