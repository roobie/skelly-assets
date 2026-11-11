import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { after, test } from 'node:test';
import { boneTransforms as mobBoneTransforms } from '../packages/mobgen/src/core/pose.ts';
import { clearanceProbe, coveredSurface } from '../../site/clearance.mjs';
import { boneTransforms, dot, length, normalize, scale, sub } from '../../site/kinematics.mjs';
import { compilePose, decodeFrame } from '../../site/poseFile.mjs';
import { decodeFrame as actorDecodeFrame } from '../actorCompose.mjs';
import { modelTaxonomies } from '../check-taxonomy.mjs';
import { dollRig, readRigContent, restMeshes, treeMeshes } from '../dollRig.mjs';
import { modelBox, readDoll, readDressing, wornSites } from '../dress.mjs';
import { manifestTaxonomy } from '../taxonomy.mjs';

// The doll and some garments built from the repo's own content, so these check the rig, the fixtures, the probe and the
// fitted shells against the doll as it is drawn, not against a stand-in.
const repo = resolve(import.meta.dirname, '../..');
const WEAR = 'leather_jacket';
// The everyday clothes the worn-fit templates shape (models/worn-clothing.libsonnet).
const CLOTHES = ['jacket', 'hoodie', 'jeans', 'rubber_boots', 'sneakers'];
const sources = await modelTaxonomies(repo);
const shellsOf = (wear) => sources.filter(({ id }) => id.startsWith(`${wear}_worn_`)).map(({ id }) => id);
const built = mkdtempSync(join(tmpdir(), 'doll-pose-'));
after(() => rmSync(built, { recursive: true, force: true }));
const wears = [WEAR, ...CLOTHES];
execFileSync(process.execPath, [join(repo, 'tools/build.mjs'), '--no-cache', '--out', built, 'player_bust', 'player_arm', 'player_leg', ...wears.flatMap((wear) => [wear, ...shellsOf(wear)])], { cwd: repo, stdio: 'pipe' });

// A build of named ids writes no manifest, so the models it built are listed here with their source taxonomy, as the
// manifest would list them.
const taxonomies = new Map(sources.map(({ pack, id, taxonomy }) => [`${pack}/${id}`, taxonomy]));
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
const restIn = (wear) => restMeshes(rig, wornSites(models.find((model) => model.id === wear), { dressing, doll, models, boxOf }), treeMeshes(built, manifest));
const rest = restIn(WEAR);
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

test('a jacket of boxes standing off the torso and arms is clean at rest', () => {
  // Each box is its part's bounds grown by a centimetre: convex, so it encloses its part whatever the part's shape.
  const EASE = 0.01;
  const boxAround = ({ positions }) => {
    const points = Array.from({ length: positions.length / 3 }, (_, i) => positions.slice(i * 3, i * 3 + 3));
    const [min, max] = [Math.min, Math.max].map((pick, side) => [0, 1, 2].map((a) => pick(...points.map((p) => p[a])) + (side ? EASE : -EASE)));
    const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [0, 1, 2].map((a) => ((k >> a) & 1 ? max : min)[a]));
    const indices = [0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, 0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7, 0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5];
    return { positions: corners.flat(), indices };
  };
  const pieces = rest.body.filter(({ bone }) => /^(spine|upperArm|forearm)/.test(bone)).map(({ bone, mesh }) => ({ piece: `box ${bone}`, bone, mesh: boxAround(mesh) }));
  const jacket = { body: rest.body, pieces };
  const surface = coveredSurface(rig, jacket);
  assert.ok(surface.some(({ samples }) => samples.some(({ cover }) => cover >= 0)), 'the boxes cover the body');
  assert.deepEqual(clearanceProbe(rig, jacket, surface)(still), { pokes: [], flush: [], sinks: [], seams: [] });
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
  const { pokes } = clearanceProbe(rig, { ...rest, pieces })(still);
  assert.ok(pokes.some(({ bone }) => bone.startsWith('upperArm.')), 'an upper arm shows through');
});

test('each fitted everyday garment covers the body and leaves none of it poking through at rest', () => {
  for (const wear of CLOTHES) {
    const dressed = restIn(wear);
    const surface = coveredSurface(rig, dressed);
    assert.ok(surface.some(({ samples }) => samples.some(({ cover }) => cover >= 0)), `${wear} covers the body`);
    const { pokes } = clearanceProbe(rig, dressed, surface)(still);
    assert.deepEqual(pokes.map(({ bone, piece }) => `${bone} out of ${piece}`).filter((v, i, all) => all.indexOf(v) === i), [], wear);
  }
});
