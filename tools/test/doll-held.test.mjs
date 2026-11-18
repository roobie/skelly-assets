import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { posedSolid, signedDepth } from '../../site/clearance.mjs';
import { decodeFrame } from '../../site/clipFrames.mjs';
import { add, applyPoint, boneTransforms, length, mulMM, mulMV, quatToMat3, sub } from '../../site/kinematics.mjs';
import { compilePose } from '../../site/poseFile.mjs';
import { poseJson } from '../keyFrames.mjs';
import { outputPath } from '../layout.mjs';
import { partStrokes, pressCheckPoses, pressCheckSockets } from '../press-check.mjs';
import {
  exportWields,
  heldWeapon,
  strikePhases,
  strikeTiming,
  WIELD_SETS,
  wieldClips,
  wieldPoses,
  wieldProblems,
  wieldResults,
  wieldWeapons,
} from '../wields.mjs';
import { dollTree, gunIds, guns, pressCheck, repo, WEAR, wields } from './doll-tree.mjs';

// One garment dresses the doll, for the body a held gun must stand clear of.
const { built, manifest, models, rig, restIn, itemMesh, thingOf } = dollTree({ wears: [WEAR], held: true });
const rest = restIn(WEAR);

// A held gun stands clear of the body but for the hands that close on it: no point of its mesh deeper inside any other
// part than a garment's thickness would hide (SINK), and some point within a finger's breadth of the torso or the
// firing arm (TOUCH), so a shouldered stock bears on the body rather than floating before it.
const SINK = 0.005,
  TOUCH = 0.01;
const holding = new Set();
for (const { id, parent } of rig.bones) if (id.startsWith('hand.') || holding.has(parent)) holding.add(id);
const unheld = rest.body.filter(({ bone }) => !holding.has(bone));
// How deep the held mesh `positions`, placed in the world by `place`, stands inside each unheld part of the posed body.
const sinking = (posed, positions, place) => {
  const points = [];
  for (let i = 0; i < positions.length; i += 3) points.push(place(positions.slice(i, i + 3)));
  return unheld.map(({ bone, mesh }) => {
    const solid = posedSolid(mesh, posed.get(bone));
    return { bone, depth: Math.max(...points.map((p) => -signedDepth(solid, p, 0.1))) };
  });
};
const assertBorne = (name, depths) => {
  for (const { bone, depth } of depths)
    assert.ok(depth <= SINK, `${name}: the gun stands ${(depth * 1000).toFixed(0)} mm into the ${bone}`);
  const touch = Math.max(
    ...depths.filter(({ bone }) => ['spine', 'upperArm.R'].includes(bone)).map(({ depth }) => depth),
  );
  assert.ok(touch >= -TOUCH, `${name}: the gun stands ${(-touch * 1000).toFixed(0)} mm off the shoulder`);
};

const rifleEntry = models.find((model) => model.id === pressCheck.rifle);
const pressPoses = pressCheckPoses(
  rig,
  pressCheck,
  partStrokes(readFileSync(join(built, rifleEntry.pack, rifleEntry.path))),
  pressCheckSockets(pressCheck, heldWeapon(thingOf(pressCheck.rifle), itemMesh(pressCheck.rifle))),
);

test("the press check's pose files are what its tool writes from its key frames", () => {
  assert.ok(Object.keys(pressPoses).length > 0);
  for (const [name, file] of Object.entries(pressPoses)) {
    assert.equal(
      readFileSync(join(repo, 'models/poses', `${name}.json`), 'utf8'),
      `${poseJson(file)}\n`,
      `${name}: run tools/press-check.mjs`,
    );
  }
});

test('through the press check the rifle points ahead, level or down, its stock borne in the shoulder', () => {
  const { positions } = itemMesh(pressCheck.rifle);
  for (const [name, file] of Object.entries(pressPoses)) {
    const { model, turn } = file.hold['hand.R'];
    assert.equal(model, pressCheck.rifle);
    const bore = mulMV(quatToMat3(turn), [0, 0, 1]);
    const heading = (Math.atan2(bore[0], bore[2]) * 180) / Math.PI,
      tip = (-Math.asin(bore[1]) * 180) / Math.PI;
    assert.ok(Math.abs(heading) < 10, `${name}: the bore heads ${heading.toFixed(1)}° off straight ahead`);
    assert.ok(tip > -0.5 && tip < 30, `${name}: the bore tips ${tip.toFixed(1)}° down`);
    const { frame, held } = compilePose(rig, file, { meshOf: itemMesh });
    const item = held['hand.R'];
    assertBorne(
      name,
      sinking(boneTransforms(rig.bones, decodeFrame(frame)), positions, (p) => applyPoint(item, p)),
    );
  }
});

const weapons = wieldWeapons(wields, thingOf, itemMesh);
// Baking every wield takes most of a minute, so the default run bakes one strike of a class whose second hand takes the
// weapon again in every frame, the path a one-hand strike never walks; ASSETS_SWEEPS=1 bakes them all, as the build
// does when it refuses any frame `wieldProblems` finds.
const [twoHanded, cls] = Object.entries(wields.classes).find(
  ([, { weapon }]) => Object.keys(weapon?.hands ?? {}).length > 1,
);
const [strike] = Object.keys(cls.strikes);
const baking = process.env.ASSETS_SWEEPS
  ? wields
  : {
      ...wields,
      classes: {
        [twoHanded]: { ...cls, stances: { guard: cls.stances.guard }, strikes: { [strike]: cls.strikes[strike] } },
      },
    };
let baked;
const bakedWields = () => (baked ??= wieldClips(rig, baking, weapons, itemMesh));
const strikes = () => Object.entries(bakedWields().clips).filter(([, clip]) => clip.phases);
// The weapon of class `kind` as a clip's held seat stands it on the leading hand in `posed`: its file carried into the
// root frame, turned to its held axes, then by the seat's turn.
const seatedWeapon = (clip, kind, posed) => {
  const { grip } = thingOf(wields.classes[kind].weapon.model);
  const { held } = weapons[kind].weapon;
  const hand = posed.get(clip.held.bone),
    turn = quatToMat3(clip.held.turn);
  return {
    r: [hand.r, turn, held].reduce(mulMM),
    t: add(hand.t, mulMV(hand.r, sub(clip.held.at, mulMV(mulMM(turn, held), grip.at)))),
  };
};

test("the wields' pose files are what their tool writes from their key frames", () => {
  const poses = wieldPoses(rig, wields, weapons);
  assert.ok(Object.keys(poses).length > 0);
  for (const [name, file] of Object.entries(poses)) {
    assert.equal(
      readFileSync(join(repo, 'models/poses', `${name}.json`), 'utf8'),
      `${poseJson(file)}\n`,
      `${name}: run tools/wields.mjs`,
    );
  }
});

test('a strike whose phase shares are not all positive or do not sum to 100 is refused', () => {
  const shares = { windup: 25, strike: 25, follow: 25, recovery: 25 };
  assert.equal(strikePhases({ shares }).at(-1).to, 1);
  for (const bad of [
    { ...shares, follow: 0 },
    { ...shares, recovery: undefined },
    { ...shares, windup: 30 },
  ]) {
    assert.throws(() => strikePhases({ shares: bad }), JSON.stringify(bad));
  }
});

test("every strike's phases end one after another, the last with the clip, and its hit lands where the strike phase ends", () => {
  const timings = Object.values(wields.classes).flatMap(({ strikes: all }) =>
    Object.entries(all).map(([name, spec]) => [name, strikeTiming(spec)]),
  );
  assert.ok(timings.length > 0);
  for (const [name, { durationSimSeconds, hitAtSimSeconds, phases }] of timings) {
    const ends = phases.map(({ endsAtSimSeconds }) => endsAtSimSeconds);
    assert.ok(
      ends.every((end, i) => end > (ends[i - 1] ?? 0)),
      `${name}: phases end at [${ends}]`,
    );
    assert.equal(ends.at(-1), durationSimSeconds, `${name}: the last phase ends with the clip`);
    assert.equal(hitAtSimSeconds, phases.find(({ phase }) => phase === 'strike').endsAtSimSeconds, name);
  }
});

test("a baked strike starts and ends in its class's guard", () => {
  const { clips } = bakedWields();
  assert.ok(strikes().length > 0);
  for (const [name, clip] of strikes()) {
    const guard = clips[name.replace(/_strike_.*/, '_stance_guard')].frames[0];
    for (const frame of [clip.frames[0], clip.frames.at(-1)]) {
      assert.ok(
        frame.root.every((x, axis) => Math.abs(x - guard.root[axis]) < 1e-6),
        `${name}: stands where the guard does`,
      );
      for (const [id, q] of Object.entries(guard.rotations)) {
        const turn = Math.abs(q.reduce((sum, x, i) => sum + x * frame.rotations[id][i], 0));
        assert.ok(turn > 1 - 1e-9, `${name}: ${id} turns as in the guard`);
      }
    }
  }
});

test("every baked wield frame stays within its limits, each hand on its weapon's grip", () => {
  assert.deepEqual(wieldProblems(bakedWields().reports), []);
});

test("a weapon seated by a strike's held seat stands where the hit key holds it, its striking end ahead of the chest", () => {
  const armed = strikes().filter(([, clip]) => clip.held);
  assert.ok(armed.length > 0);
  const poses = wieldPoses(rig, baking, weapons);
  for (const [name, clip] of armed) {
    const kind = name.split('_strike_')[0];
    const { anchors } = thingOf(wields.classes[kind].weapon.model);
    const { frame, held: holding } = compilePose(rig, poses[`${name}-hit`], { meshOf: itemMesh });
    const posed = boneTransforms(rig.bones, decodeFrame(frame));
    const chest = posed.get('spine');
    const { r, t } = seatedWeapon(clip, kind, posed);
    const item = holding[clip.held.bone];
    assert.ok(
      length(sub(t, item.t)) < 1e-3,
      `${name}: the seat puts the weapon ${length(sub(t, item.t))} m from where the hit key holds it`,
    );
    assert.ok(
      r.every((x, i) => Math.abs(x - item.r[i]) < 1e-3),
      `${name}: the seat turns the weapon off the hit key's`,
    );
    const end = applyPoint({ r, t }, anchors.strike);
    assert.ok(
      end[2] > chest.t[2] + 0.3,
      `${name}: the striking end stands ${(end[2] - chest.t[2]).toFixed(2)} m ahead of the chest`,
    );
  }
});

test("every baked strike's hit falls within a frame of where its striking end reaches farthest ahead", () => {
  // A game lands the blow and the target's flinch at the hit, and the target stands ahead of the figure, so the weapon's
  // striking end, or a bare hand's fist, meets it where it reaches farthest ahead. A bare strike's striking hand is the
  // one that reaches farthest.
  assert.ok(strikes().length > 0);
  for (const [name, clip] of strikes()) {
    const kind = name.split('_strike_')[0];
    const posed = clip.frames.map((frame) => boneTransforms(rig.bones, decodeFrame(frame)));
    const tracks = clip.held
      ? [
          posed.map((p) =>
            applyPoint(seatedWeapon(clip, kind, p), thingOf(wields.classes[kind].weapon.model).anchors.strike),
          ),
        ]
      : Object.keys(wields.classes[kind].free).map((hand) =>
          posed.map((p) => applyPoint(p.get(hand), rig.bones.find((b) => b.id === hand).tail)),
        );
    // Each track's farthest reach ahead and the frame it comes in; the striking track is the one reaching farthest.
    const reaches = tracks.map((track) =>
      track.reduce((best, [, , z], k) => (z > best.z ? { z, k } : best), { z: -Infinity, k: 0 }),
    );
    const { k } = reaches.reduce((best, reach) => (reach.z > best.z ? reach : best));
    const step = clip.durationSimSeconds / (clip.frames.length - 1);
    const contact = k * step;
    assert.ok(
      Math.abs(contact - clip.hitAtSimSeconds) <= step + 1e-9,
      `${name}: the striking end reaches farthest ahead at ${contact.toFixed(3)} s, the hit lands at ${clip.hitAtSimSeconds} s`,
    );
  }
});

test('a bare-handed strike lands its fist ahead of the shoulders, between them and ahead of its own elbow', () => {
  // The target stands ahead of the figure: a fist landing out to the side misses it, and one level with its elbow lands
  // an elbow strike.
  const bare = Object.entries(wields.classes).filter(([, { weapon }]) => !weapon);
  assert.ok(bare.length > 0);
  const poses = wieldPoses(
    rig,
    { ...wields, classes: Object.fromEntries(bare) },
    Object.fromEntries(bare.map(([kind]) => [kind, {}])),
  );
  for (const [kind, { strikes: all }] of bare) {
    const guard = poses[`${kind}_stance_guard`];
    for (const name of Object.keys(all)) {
      const hit = poses[`${kind}_strike_${name}-hit`];
      // The striking hand is the one the hit carries farthest from the guard.
      const [hand] = Object.keys(hit.reach).sort(
        (a, b) =>
          length(sub(hit.reach[b].target, guard.reach[b].target)) -
          length(sub(hit.reach[a].target, guard.reach[a].target)),
      );
      const posed = boneTransforms(rig.bones, decodeFrame(compilePose(rig, hit).frame));
      const point = (id, end) => {
        const bone = rig.bones.find((b) => b.id === id);
        return applyPoint(posed.get(id), bone[end]);
      };
      const fist = point(hand, 'tail'),
        elbow = point(rig.bones.find((b) => b.id === hand).parent, 'head');
      const shoulders = Object.keys(hit.reach).map((id) =>
        point(rig.bones.find((b) => b.id === id).reach.chain[0], 'head'),
      );
      const [right, left] = shoulders.map(([x]) => x).sort((a, b) => a - b);
      assert.ok(
        shoulders.every(([, , z]) => fist[2] > z),
        `${kind} ${name}: the fist lands behind a shoulder`,
      );
      assert.ok(
        fist[0] > right && fist[0] < left,
        `${kind} ${name}: the fist lands ${fist[0].toFixed(2)} m across, outside the shoulders`,
      );
      assert.ok(
        fist[2] > elbow[2],
        `${kind} ${name}: the fist lands ${(elbow[2] - fist[2]).toFixed(2)} m behind its elbow`,
      );
    }
  }
});

const gunWeapons = wieldWeapons(guns, thingOf, itemMesh);
const gunPoses = wieldPoses(rig, guns, gunWeapons);
let gunBake;
const bakedGuns = () => (gunBake ??= wieldClips(rig, guns, gunWeapons, itemMesh));
const DEG = 180 / Math.PI;
// A gun stance's pose file compiled: the figure posed round the gun, and the gun's points where the pose holds it.
const gunStance = (name) => {
  const family = name.split('_stance_')[0];
  const { frame, held } = compilePose(rig, gunPoses[name], { meshOf: itemMesh });
  const item = held[guns.classes[family].weapon.lead];
  return {
    family,
    item,
    weapon: gunWeapons[family].weapon,
    posed: boneTransforms(rig.bones, decodeFrame(frame)),
    at: (p) => applyPoint(item, p),
  };
};
const stancesOf = (stance) => Object.keys(gunPoses).filter((name) => name.endsWith(`_stance_${stance}`));

test("the gun clips' pose files are what their tool writes from their key frames", () => {
  assert.deepEqual(
    Object.keys(gunPoses).sort(),
    gunIds.flatMap((id) => [`${id}_stance_guard`, `${id}_stance_idle`]).sort(),
  );
  for (const [name, file] of Object.entries(gunPoses)) {
    assert.equal(
      readFileSync(join(repo, 'models/poses', `${name}.json`), 'utf8'),
      `${poseJson(file)}\n`,
      `${name}: run tools/wields.mjs`,
    );
  }
});

test('every baked gun frame stays within its limits, each palm on its socket', () => {
  assert.deepEqual(wieldProblems(bakedGuns().reports), []);
});

test("a gun seated by its clip's held seat stands where the clip's key holds it", () => {
  for (const [name, clip] of Object.entries(bakedGuns().clips)) {
    const { weapon, item } = gunStance(name);
    const hand = boneTransforms(rig.bones, decodeFrame(clip.frames[0])).get(clip.held.bone);
    // The gun's file carried into the root frame by the seat: turned to its held axes, then by the seat's turn.
    const seat = mulMM(quatToMat3(clip.held.turn), weapon.held);
    const r = mulMM(hand.r, seat);
    const t = add(hand.t, mulMV(hand.r, sub(clip.held.at, mulMV(seat, weapon.at))));
    const off = length(sub(t, item.t));
    assert.ok(off < 1e-3, `${name}: the seat puts the gun ${(off * 1000).toFixed(2)} mm from its key's`);
    const cos = (r.reduce((sum, x, i) => sum + x * item.r[i], 0) - 1) / 2;
    const turn = Math.acos(Math.min(1, cos)) * DEG;
    assert.ok(turn < 0.1, `${name}: the seat turns the gun ${turn.toFixed(2)}° off its key's`);
  }
});

test('at guard the bore points level and straight ahead', () => {
  assert.ok(stancesOf('guard').length > 0);
  for (const name of stancesOf('guard')) {
    const bore = mulMV(gunStance(name).item.r, [0, 0, 1]);
    const heading = Math.atan2(bore[0], bore[2]) * DEG,
      tip = -Math.asin(bore[1]) * DEG;
    assert.ok(Math.abs(heading) < 10, `${name}: the bore heads ${heading.toFixed(1)}° off straight ahead`);
    assert.ok(Math.abs(tip) <= 0.5, `${name}: the bore tips ${tip.toFixed(2)}°`);
  }
});

test('at idle the muzzle points down ahead of the toes', () => {
  assert.ok(stancesOf('idle').length > 0);
  for (const name of stancesOf('idle')) {
    const { weapon, posed, at } = gunStance(name);
    const muzzle = at(weapon.anchors.muzzle),
      grip = at(weapon.at);
    assert.ok(muzzle[1] < grip[1], `${name}: the muzzle stands ${(muzzle[1] - grip[1]).toFixed(2)} m above the grip`);
    const toes = Math.max(
      ...['foot.L', 'foot.R'].map((id) => applyPoint(posed.get(id), rig.bones.find((b) => b.id === id).tail)[2]),
    );
    assert.ok(muzzle[2] > toes, `${name}: the muzzle stands ${(toes - muzzle[2]).toFixed(2)} m behind the toes`);
  }
});

test('in every stance the stock is borne in the shoulder, no part of the gun sunk into the body', () => {
  assert.ok(Object.keys(gunPoses).length > 0);
  for (const name of Object.keys(gunPoses)) {
    const { family, posed, at } = gunStance(name);
    assertBorne(name, sinking(posed, itemMesh(family).positions, at));
  }
});

test('a wield class baked once is read from the cache, and a changed class, mesh or bake bakes it again', () => {
  const cache = mkdtempSync(join(tmpdir(), 'wields-cache-'));
  try {
    const [family] = Object.keys(guns.classes);
    const one = { ...guns, classes: { [family]: guns.classes[family] } };
    const bake = (wields, meshOf = itemMesh, code = 'code') =>
      wieldResults(rig, { guns: { wields, weapons: gunWeapons } }, meshOf, { cache, bake: code });
    // Compared as the export writes them: JSON keeps no -0, so a clip read back from the cache differs only there.
    const written = (value) => JSON.stringify(value);
    const first = bake(one);
    assert.deepEqual([first.baked, first.reused], [1, 0]);
    const again = bake(one);
    assert.deepEqual([again.baked, again.reused], [0, 1]);
    assert.equal(written(again.results), written(first.results));
    for (const [name, clip] of Object.entries(first.results.guns.clips))
      assert.equal(written(clip), written(bakedGuns().clips[name]));
    const slower = { ...one, framesPerSecond: one.framesPerSecond + 1 };
    assert.equal(bake(slower).baked, 1);
    const moved = (id) => {
      const mesh = itemMesh(id);
      return { ...mesh, positions: mesh.positions.map((x, i) => (i === 0 ? x + 1e-3 : x)) };
    };
    assert.equal(bake(one, moved).baked, 1);
    assert.equal(bake(one, itemMesh, 'other code').baked, 1);
  } finally {
    rmSync(cache, { recursive: true });
  }
});

test("the export lists the gun clips' motions entry, a clip with its held seat for every gun and stance", () => {
  // The export reads the doll and the guns from the tree it writes into, so it writes into this test's own.
  const { files, motions } = exportWields(built, manifest, { sets: { guns: WIELD_SETS.guns } });
  const { pack, path } = WIELD_SETS.guns.motions;
  assert.deepEqual(motions, [WIELD_SETS.guns.motions]);
  assert.ok(files.includes(outputPath(pack, path)));
  const { clips } = JSON.parse(readFileSync(join(built, outputPath(pack, path)), 'utf8'));
  for (const id of gunIds)
    for (const stance of ['idle', 'guard']) assert.ok(clips[`${id}_stance_${stance}`]?.held, `${id}_stance_${stance}`);
});
