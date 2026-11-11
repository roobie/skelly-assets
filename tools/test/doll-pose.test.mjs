import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { after, test } from 'node:test';
import { boneTransforms as mobBoneTransforms } from '../packages/mobgen/src/core/pose.ts';
import { clearanceProbe, posedSolid, signedDepth } from '../../site/clearance.mjs';
import { padOf } from '../../site/fingers.mjs';
import { add, applyPoint, boneTransforms, dot, length, mulMV, normalize, quatToMat3, scale, sub } from '../../site/kinematics.mjs';
import { compilePose, decodeFrame } from '../../site/poseFile.mjs';
import { decodeFrame as actorDecodeFrame } from '../actorCompose.mjs';
import { modelTaxonomies } from '../check-taxonomy.mjs';
import { dollRig, readRigContent, restMeshes, treeMeshes } from '../dollRig.mjs';
import { modelBox, readDoll, readDressing, wornSites } from '../dress.mjs';
import { partStrokes, poseJson, pressCheckPoses, readPressCheck } from '../press-check.mjs';
import { manifestTaxonomy } from '../taxonomy.mjs';

// The doll, one jacket and the press check's rifle built from the repo's own content, so these check the rig, the
// fixtures and the probe against the doll as it is drawn, not against a stand-in.
const repo = resolve(import.meta.dirname, '../..');
const WEAR = 'leather_jacket';
const pressCheck = readPressCheck(repo);
const built = mkdtempSync(join(tmpdir(), 'doll-pose-'));
after(() => rmSync(built, { recursive: true, force: true }));
execFileSync(process.execPath, [join(repo, 'tools/build.mjs'), '--no-cache', '--out', built, 'player_bust', 'player_arm', 'player_leg', WEAR, `${WEAR}_worn_body`, `${WEAR}_worn_upper`, `${WEAR}_worn_fore`, pressCheck.rifle], { cwd: repo, stdio: 'pipe' });

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
const meshes = treeMeshes(built, manifest);
const rest = restMeshes(rig, wornSites(models.find((model) => model.id === WEAR), { dressing, doll, models, boxOf }), meshes);
// A held item as one mesh of all its parts at rest.
const itemMesh = (id) => meshes(id).reduce((mesh, part) => {
  const base = mesh.positions.length / 3;
  return { positions: [...mesh.positions, ...part.positions], indices: [...mesh.indices, ...part.indices.map((i) => base + i)] };
}, { positions: [], indices: [] });
const margin = rig.clearance.marginMetres;
const fixtures = readdirSync(join(repo, 'models/poses')).filter((name) => name.endsWith('.json'))
  .map((name) => ({ name, file: JSON.parse(readFileSync(join(repo, 'models/poses', name), 'utf8')) }));
const still = boneTransforms(rig.bones, { root: [0, 0, 0], rotations: {} });

test('every pose fixture compiles on the doll within its limits, and its frame poses a mob the same way', () => {
  assert.ok(fixtures.length > 0);
  for (const { name, file } of fixtures) {
    const { frame, report } = compilePose(rig, file, { meshOf: itemMesh });
    assert.deepEqual(report.clamped, [], `${name} asks past a limit`);
    for (const [id, left] of Object.entries(report.residuals)) assert.ok(left < 1e-6, `${name}: ${id} falls ${left} m short`);
    for (const [hand, digits] of Object.entries(report.grips)) {
      for (const [digit, { residual }] of Object.entries(digits)) assert.ok(!(residual > 1e-3), `${name}: ${hand} ${digit} pinches ${residual} m off`);
    }
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

test('the grip preset seats a haft in the wedge of palm and thumb, the finger roots on it and the thumb closing over it, on either hand', () => {
  // An octagonal haft across the palm, as a hand-worn handle is rounded, seated on the palm's grip socket and following
  // the hand; the forearm is bent so the hand stands clear of the body.
  const width = 0.03;
  const rim = (end) => [0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => {
    const angle = ((2 * i + 1) * Math.PI) / 8;
    return [Math.cos(angle), Math.sin(angle)].map((c) => (c * width) / 2 / Math.cos(Math.PI / 8)).concat(end * 0.1);
  });
  const ring = [0, 1, 2, 3, 4, 5, 6, 7];
  const sides = ring.flatMap((i) => [i, (i + 1) % 8, 8 + ((i + 1) % 8), i, 8 + ((i + 1) % 8), 8 + i]);
  const caps = [1, 2, 3, 4, 5, 6].flatMap((k) => [0, k, k + 1, 8, 8 + k, 9 + k]);
  const haft = { positions: [...rim(-1), ...rim(1)], indices: [...sides, ...caps] };
  const bones = new Map(rig.bones.map((bone) => [bone.id, bone]));
  // A part's nearest approach to the haft over its box's corners, edges and faces, negative when sunk in.
  const lattice = ({ min, max }) => [0, 1, 2, 3].flatMap((i) => [0, 1, 2, 3].flatMap((j) => [0, 1, 2, 3].map((k) => [i, j, k])))
    .filter((steps) => steps.some((s) => s === 0 || s === 3))
    .map((steps) => steps.map((s, a) => min[a] + (s / 3) * (max[a] - min[a])));
  for (const side of ['L', 'R']) {
    const forearm = bones.get(`forearm.${side}`);
    const file = {
      rig: { id: rig.id, revision: rig.revision },
      angles: { [forearm.id]: forearm.sense.map((sense, i) => sense * [90, 0, 0][i]) },
      hands: { [`hand.${side}`]: 'grip' },
      hold: { [`hand.${side}`]: { model: 'haft', socket: { at: [-width / 2, 0, 0], into: [1, 0, 0], axis: [0, 0, 1] } } },
    };
    const { frame, report, held } = compilePose(rig, file, { meshOf: () => haft });
    const item = held[`hand.${side}`];
    const solid = posedSolid(haft, item);
    const transforms = boneTransforms(rig.bones, decodeFrame(frame));
    const gap = (id) => Math.min(...lattice(bones.get(id).bind.box).map((p) => signedDepth(solid, applyPoint(transforms.get(id), p), 0.1)));
    const digits = rig.bones.filter((bone) => bone.digit && bone.id.endsWith(`.${side}`));
    for (const bone of digits) assert.ok(gap(bone.id) > -0.0015, `${bone.id} sinks ${(-gap(bone.id) * 1000).toFixed(1)} mm into the haft`);
    // A closed fist has no daylight at the finger roots: each knuckle phalanx bears on the haft.
    for (const bone of digits.filter((b) => b.spread !== undefined)) {
      assert.ok(gap(bone.id) < 0.005, `${bone.id} stands ${(gap(bone.id) * 1000).toFixed(1)} mm off the haft`);
    }
    assert.ok(report.grips[`hand.${side}`].thumb.touched, `the ${side} thumb closes on the haft`);
    assert.ok(gap(`thumb.${side}`) < 0.003, `the ${side} thumb's root bears on the haft, not ${(gap(`thumb.${side}`) * 1000).toFixed(1)} mm off it`);
    // Away from the palm is the socket's `into`; the tip past the haft's middle that way has closed over it.
    const tip = bones.get(`thumb3.${side}`);
    const beyond = dot(sub(applyPoint(transforms.get(tip.id), padOf(tip)), item.t), mulMV(item.r, [1, 0, 0]));
    assert.ok(beyond > 0, `the ${side} thumb closes over the haft's far side, not ${(beyond * 1000).toFixed(1)} mm short of its middle`);
  }
});

const rifleEntry = models.find((model) => model.id === pressCheck.rifle);
const pressPoses = pressCheckPoses(rig, pressCheck, partStrokes(readFileSync(join(built, rifleEntry.pack, rifleEntry.path))));

test('the press check\'s pose files are what its tool writes from its key frames', () => {
  assert.ok(Object.keys(pressPoses).length > 0);
  for (const [name, file] of Object.entries(pressPoses)) {
    assert.equal(readFileSync(join(repo, 'models/poses', `${name}.json`), 'utf8'), `${poseJson(file)}\n`, `${name}: run tools/press-check.mjs`);
  }
});

test('through the press check the rifle points ahead and down, its butt pad against the body', () => {
  const torso = rest.body.find((part) => part.bone === 'spine').mesh;
  for (const [name, file] of Object.entries(pressPoses)) {
    const { model, at, turn } = file.hold['hand.R'];
    assert.equal(model, pressCheck.rifle);
    const r = quatToMat3(turn), bore = mulMV(r, [0, 0, 1]);
    const heading = Math.atan2(bore[0], bore[2]) * 180 / Math.PI, tip = -Math.asin(bore[1]) * 180 / Math.PI;
    assert.ok(Math.abs(heading) < 10, `${name}: the bore heads ${heading.toFixed(1)}° off straight ahead`);
    assert.ok(tip > 0 && tip < 30, `${name}: the bore tips ${tip.toFixed(1)}° down`);
    const { frame } = compilePose(rig, file, { meshOf: itemMesh });
    const chest = posedSolid(torso, boneTransforms(rig.bones, decodeFrame(frame)).get('spine'));
    const gap = signedDepth(chest, add(mulMV(r, pressCheck.butt), at), 0.1);
    assert.ok(Math.abs(gap) < 0.01, `${name}: the butt pad stands ${(gap * 1000).toFixed(0)} mm off the chest`);
  }
});
