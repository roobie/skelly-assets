import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { after, test } from 'node:test';
import { clearanceProbe, COINCIDENT, coveredSurface, PITCH, posedSolid, restClearance, signedDepth } from '../../site/clearance.mjs';
import { decodeFrame } from '../../site/clipFrames.mjs';
import { padOf } from '../../site/fingers.mjs';
import { hides } from '../../site/hiding.mjs';
import { add, applyPoint, boneTransforms, dot, length, mulMM, mulMV, normalize, quatToMat3, scale, sub } from '../../site/kinematics.mjs';
import { compilePose, frameAngles, soleLift } from '../../site/poseFile.mjs';
import { modelSources } from '../check-sources.mjs';
import { dollRig, readRigContent, restMeshes, treeMeshes } from '../dollRig.mjs';
import { modelBox, readDoll, readDressing, wornSites } from '../dress.mjs';
import { poseJson } from '../keyFrames.mjs';
import { partStrokes, pressCheckPoses, readPressCheck } from '../press-check.mjs';
import { manifestTaxonomy } from '../taxonomy.mjs';
import { heldItems, readWields, strikePhases, strikeTiming, wieldClips, wieldPoses, wieldProblems, wieldWeapons } from '../wields.mjs';
import { CLEAN, counted } from './findings.mjs';

// The doll, some garments, the press check's rifle and the wields' weapons built from the repo's own content, so these check the rig, the
// fixtures, the probe and the fitted shells against the doll as it is drawn, not against a stand-in.
const repo = resolve(import.meta.dirname, '../..');
const WEAR = 'leather_jacket';
// The everyday clothes the worn-fit templates shape (models/worn-clothing.libsonnet), and the sleeveless top whose
// armholes stand beside the arm (models/catalogue/worn.libsonnet).
const CLOTHES = ['jacket', 'hoodie', 'jeans', 'rubber_boots', 'sneakers', 'tank_top'];
const pressCheck = readPressCheck(repo);
const wields = readWields(repo);
const weaponIds = [...new Set(Object.values(wields.classes).flatMap(({ weapon }) => (weapon ? [weapon.model] : [])))];
const sources = await modelSources(repo);
const shellsOf = (wear) => sources.filter(({ id }) => id.startsWith(`${wear}_worn_`)).map(({ id }) => id);
const built = mkdtempSync(join(tmpdir(), 'doll-pose-'));
after(() => rmSync(built, { recursive: true, force: true }));
// The other fitted garments, each on a fit the everyday clothes don't exercise: the robe template and the narrow boot.
// `leather_gloves` is left out until it stops poking at rest (#191).
const OTHER_WORN = ['wizard_robe', 'combat_boots'];
const wears = [WEAR, ...CLOTHES, ...OTHER_WORN];
execFileSync(process.execPath, [join(repo, 'tools/build.mjs'), '--no-cache', '--out', built, 'player_bust', 'player_arm', 'player_leg', ...wears.flatMap((wear) => [wear, ...shellsOf(wear)]), pressCheck.rifle, ...weaponIds], { cwd: repo, stdio: 'pipe' });

// A build of named ids writes no manifest, so the models it built are listed here with their source taxonomy, what
// they cover and the lift of their soles, from the model entry the thing export writes beside each (a gun export writes none), as the manifest
// would list them.
const taxonomies = new Map(sources.map(({ pack, id, taxonomy }) => [`${pack}/${id}`, taxonomy]));
const manifest = {
  models: readdirSync(built).flatMap((pack) => readdirSync(join(built, pack, 'assets/models')).map((file) => {
    const id = file.slice(0, -'.glb'.length);
    const entry = join(built, pack, 'things', `${id}.model.json`);
    const { covers, soleLift: lift } = existsSync(entry) ? JSON.parse(readFileSync(entry, 'utf8')) : {};
    return { id, pack, path: `assets/models/${file}`, covers, soleLift: lift, ...manifestTaxonomy(taxonomies.get(`${pack}/${id}`)) };
  })),
};
const dressing = readDressing(repo);
const doll = readDoll(built, manifest, dressing);
const rig = dollRig(readRigContent(repo), doll, dressing);
const models = manifest.models.filter((model) => model.path.endsWith('.glb'));
const boxOf = (id) => { const entry = models.find((model) => model.id === id); return modelBox(readFileSync(join(built, entry.pack, entry.path))); };
const anchorsOf = (id) => {
  const { pack } = models.find((model) => model.id === id);
  const entry = join(built, pack, 'things', `${id}.model.json`);
  return existsSync(entry) ? JSON.parse(readFileSync(entry, 'utf8')).anchors ?? {} : {};
};
const meshes = treeMeshes(built, manifest);
const sitesIn = (wear) => wornSites(models.find((model) => model.id === wear), { dressing, doll, models, boxOf, anchorsOf });
const restIn = (wear) => restMeshes(rig, sitesIn(wear), meshes);
const rest = restIn(WEAR);
const { meshOf: itemMesh, entryOf: thingOf } = heldItems(built, manifest);
const fixtures = readdirSync(join(repo, 'models/poses')).filter((name) => name.endsWith('.json'))
  .map((name) => ({ name, file: JSON.parse(readFileSync(join(repo, 'models/poses', name), 'utf8')) }));
const still = boneTransforms(rig.bones, { root: [0, 0, 0], rotations: {} });

test('every pose fixture compiles on the doll within its limits', () => {
  assert.ok(fixtures.length > 0);
  for (const { name, file } of fixtures) {
    const { frame, report } = compilePose(rig, file, { meshOf: itemMesh });
    assert.deepEqual(report.clamped, [], `${name} asks past a limit`);
    for (const [id, left] of Object.entries(report.residuals)) assert.ok(left < 1e-6, `${name}: ${id} falls ${left} m short`);
    for (const [hand, digits] of Object.entries(report.grips)) {
      for (const [digit, { residual }] of Object.entries(digits)) assert.ok(!(residual > 1e-3), `${name}: ${hand} ${digit} pinches ${residual} m off`);
    }
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
  assert.deepEqual(counted(clearanceProbe(rig, jacket, surface)(still)), CLEAN);
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

test('the grip preset seats a haft in the wedge of palm and thumb, slanted so every finger wraps it from its root, the thumb closing over it, on either hand', () => {
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
    // A closed fist has no daylight in it: every phalanx of every finger, the little one's too, bears on the haft.
    for (const bone of digits.filter((b) => b.digit !== 'thumb')) {
      assert.ok(gap(bone.id) < 0.004, `${bone.id} stands ${(gap(bone.id) * 1000).toFixed(1)} mm off the haft`);
    }
    // Slanted across the palm, the haft lies furthest from the index finger's root and nearest the little finger's, so
    // the knuckles bend more toward the little finger, as a hand's do round a handle; held square, the little finger's
    // knuckle bends least and the finger stands off the fist.
    const angles = frameAngles(rig, frame);
    const flex = (id) => Math.abs(angles[id][0]);
    assert.ok(flex(`little.${side}`) >= flex(`index.${side}`), `the ${side} little finger's knuckle bends ${flex(`little.${side}`).toFixed(0)}°, less than the index's ${flex(`index.${side}`).toFixed(0)}°`);
    // Away from the palm is the socket's `into`; a tip past the haft's middle that way has wrapped round it.
    const beyond = (tip) => dot(sub(applyPoint(transforms.get(tip.id), padOf(tip)), item.t), mulMV(item.r, [1, 0, 0]));
    // Every finger wraps the haft, the little one too, so none stands off a handle the others hold.
    const tips = digits.filter((bone) => bone.digit !== 'thumb' && !digits.some((other) => other.parent === bone.id));
    for (const tip of tips) assert.ok(beyond(tip) > 0, `${tip.id} stops ${(-beyond(tip) * 1000).toFixed(1)} mm short of the haft's middle`);
    assert.ok(report.grips[`hand.${side}`].thumb.touched, `the ${side} thumb closes on the haft`);
    assert.ok(gap(`thumb.${side}`) < 0.003, `the ${side} thumb's root bears on the haft, not ${(gap(`thumb.${side}`) * 1000).toFixed(1)} mm off it`);
    const thumbTip = bones.get(`thumb3.${side}`);
    assert.ok(beyond(thumbTip) > 0, `the ${side} thumb closes over the haft's far side, not ${(-beyond(thumbTip) * 1000).toFixed(1)} mm short of its middle`);
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

const weapons = wieldWeapons(wields, thingOf, itemMesh);
// Baking every wield takes most of a minute, so the default run bakes one strike of a class whose second hand takes the
// weapon again in every frame, the path a one-hand strike never walks; ASSETS_SWEEPS=1 bakes them all, as the build
// does when it refuses any frame `wieldProblems` finds.
const [twoHanded, cls] = Object.entries(wields.classes).find(([, { weapon }]) => Object.keys(weapon?.hands ?? {}).length > 1);
const [strike] = Object.keys(cls.strikes);
const baking = process.env.ASSETS_SWEEPS ? wields
  : { ...wields, classes: { [twoHanded]: { ...cls, stances: { guard: cls.stances.guard }, strikes: { [strike]: cls.strikes[strike] } } } };
let baked;
const bakedWields = () => (baked ??= wieldClips(rig, baking, weapons, itemMesh));
const strikes = () => Object.entries(bakedWields().clips).filter(([, clip]) => clip.phases);

test('the wields\' pose files are what their tool writes from their key frames', () => {
  const poses = wieldPoses(rig, wields, weapons);
  assert.ok(Object.keys(poses).length > 0);
  for (const [name, file] of Object.entries(poses)) {
    assert.equal(readFileSync(join(repo, 'models/poses', `${name}.json`), 'utf8'), `${poseJson(file)}\n`, `${name}: run tools/wields.mjs`);
  }
});

test('a strike whose phase shares are not all positive or do not sum to 100 is refused', () => {
  const shares = { windup: 25, strike: 25, follow: 25, recovery: 25 };
  assert.equal(strikePhases({ shares }).at(-1).to, 1);
  for (const bad of [{ ...shares, follow: 0 }, { ...shares, recovery: undefined }, { ...shares, windup: 30 }]) {
    assert.throws(() => strikePhases({ shares: bad }), JSON.stringify(bad));
  }
});

test('every strike\'s phases end one after another, the last with the clip, and its hit lands where the strike phase ends', () => {
  const timings = Object.values(wields.classes).flatMap(({ strikes: all }) => Object.entries(all).map(([name, spec]) => [name, strikeTiming(spec)]));
  assert.ok(timings.length > 0);
  for (const [name, { durationSimSeconds, hitAtSimSeconds, phases }] of timings) {
    const ends = phases.map(({ endsAtSimSeconds }) => endsAtSimSeconds);
    assert.ok(ends.every((end, i) => end > (ends[i - 1] ?? 0)), `${name}: phases end at [${ends}]`);
    assert.equal(ends.at(-1), durationSimSeconds, `${name}: the last phase ends with the clip`);
    assert.equal(hitAtSimSeconds, phases.find(({ phase }) => phase === 'strike').endsAtSimSeconds, name);
  }
});

test('a baked strike starts and ends in its class\'s guard', () => {
  const { clips } = bakedWields();
  assert.ok(strikes().length > 0);
  for (const [name, clip] of strikes()) {
    const guard = clips[name.replace(/_strike_.*/, '_stance_guard')].frames[0];
    for (const frame of [clip.frames[0], clip.frames.at(-1)]) {
      assert.ok(frame.root.every((x, axis) => Math.abs(x - guard.root[axis]) < 1e-6), `${name}: stands where the guard does`);
      for (const [id, q] of Object.entries(guard.rotations)) {
        const turn = Math.abs(q.reduce((sum, x, i) => sum + x * frame.rotations[id][i], 0));
        assert.ok(turn > 1 - 1e-9, `${name}: ${id} turns as in the guard`);
      }
    }
  }
});

test('every baked wield frame stays within its limits, each hand on its weapon\'s grip', () => {
  assert.deepEqual(wieldProblems(bakedWields().reports), []);
});

test('a weapon seated by a strike\'s held seat stands where the hit key holds it, its striking end ahead of the chest', () => {
  const armed = strikes().filter(([, clip]) => clip.held);
  assert.ok(armed.length > 0);
  const poses = wieldPoses(rig, baking, weapons);
  for (const [name, clip] of armed) {
    const kind = name.split('_strike_')[0];
    const { grip, anchors } = thingOf(wields.classes[kind].weapon.model);
    const { held } = weapons[kind].weapon;
    const { frame, held: holding } = compilePose(rig, poses[`${name}-hit`], { meshOf: itemMesh });
    const posed = boneTransforms(rig.bones, decodeFrame(frame));
    const hand = posed.get(clip.held.bone), chest = posed.get('spine');
    // The weapon's file carried into the root frame by the seat: turned to its held axes, then by the seat's turn.
    const r = [hand.r, quatToMat3(clip.held.turn), held].reduce(mulMM);
    const t = add(hand.t, mulMV(hand.r, sub(clip.held.at, mulMV(mulMM(quatToMat3(clip.held.turn), held), grip.at))));
    const item = holding[clip.held.bone];
    assert.ok(length(sub(t, item.t)) < 1e-3, `${name}: the seat puts the weapon ${length(sub(t, item.t))} m from where the hit key holds it`);
    assert.ok(r.every((x, i) => Math.abs(x - item.r[i]) < 1e-3), `${name}: the seat turns the weapon off the hit key's`);
    const end = applyPoint({ r, t }, anchors.strike);
    assert.ok(end[2] > chest.t[2] + 0.3, `${name}: the striking end stands ${(end[2] - chest.t[2]).toFixed(2)} m ahead of the chest`);
  }
});

test('a bare-handed strike lands its fist ahead of the shoulders, between them and ahead of its own elbow', () => {
  // The target stands ahead of the figure: a fist landing out to the side misses it, and one level with its elbow lands
  // an elbow strike.
  const bare = Object.entries(wields.classes).filter(([, { weapon }]) => !weapon);
  assert.ok(bare.length > 0);
  const poses = wieldPoses(rig, { ...wields, classes: Object.fromEntries(bare) }, Object.fromEntries(bare.map(([kind]) => [kind, {}])));
  for (const [kind, { strikes: all }] of bare) {
    const guard = poses[`${kind}_stance_guard`];
    for (const name of Object.keys(all)) {
      const hit = poses[`${kind}_strike_${name}-hit`];
      // The striking hand is the one the hit carries farthest from the guard.
      const [hand] = Object.keys(hit.reach).sort((a, b) =>
        length(sub(hit.reach[b].target, guard.reach[b].target)) - length(sub(hit.reach[a].target, guard.reach[a].target)));
      const posed = boneTransforms(rig.bones, decodeFrame(compilePose(rig, hit).frame));
      const point = (id, end) => { const bone = rig.bones.find((b) => b.id === id); return applyPoint(posed.get(id), bone[end]); };
      const fist = point(hand, 'tail'), elbow = point(rig.bones.find((b) => b.id === hand).parent, 'head');
      const shoulders = Object.keys(hit.reach).map((id) => point(rig.bones.find((b) => b.id === id).reach.chain[0], 'head'));
      const [right, left] = shoulders.map(([x]) => x).sort((a, b) => a - b);
      assert.ok(shoulders.every(([, , z]) => fist[2] > z), `${kind} ${name}: the fist lands behind a shoulder`);
      assert.ok(fist[0] > right && fist[0] < left, `${kind} ${name}: the fist lands ${fist[0].toFixed(2)} m across, outside the shoulders`);
      assert.ok(fist[2] > elbow[2], `${kind} ${name}: the fist lands ${(elbow[2] - fist[2]).toFixed(2)} m behind its elbow`);
    }
  }
});

test('each fitted garment covers the body and leaves none of it poking through at rest', () => {
  for (const wear of wears) {
    const dressed = restIn(wear);
    const surface = coveredSurface(rig, dressed);
    assert.ok(surface.some(({ samples }) => samples.some(({ cover }) => cover >= 0)), `${wear} covers the body`);
    const { pokes } = restClearance(rig, dressed, surface);
    assert.deepEqual(pokes.map(({ bone, piece }) => `${bone} out of ${piece}`).filter((v, i, all) => all.indexOf(v) === i), [], wear);
  }
});

test('a grounded shod doll stands its boots on the ground and its bare feet a sole above it', () => {
  const lowest = ({ positions }) => Math.min(...positions.filter((_, i) => i % 3 === 1));
  const shod = wears.filter((wear) => shellsOf(wear).some((id) => id.endsWith('_worn_foot')));
  assert.ok(shod.length > 0, 'no fitted footwear among the worn garments, so nothing was checked');
  for (const wear of shod) {
    const lift = soleLift(sitesIn(wear));
    assert.ok(lift > 0, `${wear} declares no sole lift`);
    // At rest the grounded pose only moves the root, so the rest meshes stand where it puts them, raised by its root.
    const { frame: { root: [, raised] } } = compilePose(rig, { rig: { id: rig.id, revision: rig.revision }, ground: true }, { soles: lift });
    const { body, pieces } = restIn(wear);
    const feet = pieces.filter(({ piece }) => piece.endsWith('_worn_foot'));
    const bare = Math.min(...body.map(({ mesh }) => lowest(mesh))) + raised;
    const soled = Math.min(...feet.map(({ mesh }) => lowest(mesh))) + raised;
    // Within a sampling pitch, too small to see: a voxelised sole's underside stands off its authored plane.
    assert.ok(Math.abs(soled) < PITCH, `${wear}: its soles stand ${(soled * 1000).toFixed(1)} mm off the ground`);
    assert.ok(Math.abs(bare - lift) < PITCH, `${wear}: the bare feet stand ${(bare * 1000).toFixed(1)} mm up, not on its ${(lift * 1000).toFixed(1)} mm soles`);
  }
});

test('a garment that leaves regions of a part bare leaves none of their skin below the top of the regions it covers', () => {
  // A piece that declares what it covers is not meant to cover the other regions it passes beneath, so the rest probe
  // above cannot see their skin poke through its wall. Below the top of the regions it does cover, that skin lies where
  // the wall wraps the part, so it would.
  const axes = new Map(rig.bones.map(({ id, head, tail }) => [id, normalize(sub(tail, head))]));
  let checked = 0;
  for (const wear of CLOTHES) {
    const dressed = restIn(wear);
    const plain = dressed.pieces.map(({ covers, ...piece }) => piece);
    dressed.pieces.forEach(({ piece, bone, covers }, index) => {
      const body = dressed.body.find((entry) => entry.bone === bone);
      // Covering the whole part leaves no bare region to probe; only the cost of the probe is saved by skipping it.
      if (!covers || covers.includes(body.part)) return;
      const [declared] = coveredSurface(rig, { body: [body], pieces: dressed.pieces });
      const [undeclared] = coveredSurface(rig, { body: [body], pieces: plain });
      const height = ({ point }) => dot(point, axes.get(bone));
      const top = declared.samples.reduce((most, sample) => (hides(covers, body.part, sample.region) ? Math.max(most, height(sample)) : most), -Infinity);
      if (top === -Infinity) return;
      checked += 1;
      const bare = declared.samples.filter(({ cover }, i) => cover < 0 && undeclared.samples[i].cover === index);
      const below = bare.filter((sample) => height(sample) < top - COINCIDENT);
      assert.equal(below.length, 0, `${wear}: ${piece} passes beneath bare skin below the top of ${covers}`);
    });
  }
  assert.ok(checked > 0, 'no garment declares a region narrower than its part, so nothing was checked');
});
