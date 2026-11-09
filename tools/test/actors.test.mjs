import assert from 'node:assert/strict';
import test from 'node:test';
import { installJsonnetSources } from '../sources.mjs';

await installJsonnetSources();
const { meshBones } = await import('../packages/mobgen/src/core/mesh.ts');
const { worldPosition } = await import('../packages/mobgen/src/core/voxelize.ts');

// Exercise the on-disk row boundary while sharing the existing live-pose assertions.
async function bakeFixture(model, options = {}) {
  const { exportMob } = await import('../mobs.mjs');
  const { outputPath } = await import('../layout.mjs');
  const { mkdtempSync, readFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const out = mkdtempSync(join(tmpdir(), 'actor-clips-'));
  const row = { id: `fixture.${model}`, type: `fixture.${model}`, template: model, model, seed: 1, scale: 1,
    pack: 'fixture.pack', lod_divisor: 0, walkCycles: 1, walk_speed: 0.8, walk_frames: 8, attack_frames: 9, crawls: true, crawl_stride: 1.2,
    glb: 'fixture/actor.glb', body: 'fixture/actor.body.json', clips: 'fixture/actor.clips.json', ...options };
  try {
    exportMob(row, out);
    const read = (file) => JSON.parse(readFileSync(join(out, outputPath(row.pack, file))));
    return { body: read(row.body), clips: read(row.clips) };
  } finally { rmSync(out, { recursive: true, force: true }); }
}

const cellFixture = () => ({
  size: 0.25, origin: [-1, 0, 2], dims: [3, 2, 1],
  owner: new Uint8Array([1, 1, 2, 1, 0, 2]),
  color: new Uint8Array(6).fill(3),
  materials: [],
});

test('per-cell faces retain their owning cell, including bone boundaries, without changing surface area', () => {
  const voxels = cellFixture();
  const meshes = meshBones(voxels, 2, { perCell: true });
  const area = (mesh) => {
    let result = 0;
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const points = Array.from(mesh.indices.slice(t, t + 3), (v) => Array.from(mesh.positions.slice(v * 3, v * 3 + 3)));
      const a = points[1].map((x, i) => x - points[0][i]);
      const b = points[2].map((x, i) => x - points[0][i]);
      result += Math.hypot(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]) / 2;
    }
    return result;
  };
  const merged = meshBones(voxels, 2);
  let sawBoundary = false;
  for (const [bone, mesh] of meshes) {
    assert.equal(mesh.cellIndex.length, mesh.positions.length / 3);
    assert.equal(area(mesh), area(merged.get(bone)));
    const exposed = new Set();
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const vertices = Array.from(mesh.indices.slice(t, t + 3));
      const cell = mesh.cellIndex[vertices[0]];
      assert(vertices.every((v) => mesh.cellIndex[v] === cell));
      assert.equal(voxels.owner[cell], bone + 1);
      const i = cell % voxels.dims[0];
      const j = Math.floor(cell / voxels.dims[0]) % voxels.dims[1];
      const k = Math.floor(cell / (voxels.dims[0] * voxels.dims[1]));
      const center = worldPosition(voxels, i, j, k);
      const normal = Array.from(mesh.normals.slice(vertices[0] * 3, vertices[0] * 3 + 3));
      const axis = normal.findIndex((n) => n !== 0);
      for (const vertex of vertices) {
        for (let c = 0; c < 3; c++) {
          const delta = mesh.positions[vertex * 3 + c] - center[c];
          assert.equal(Math.abs(delta), voxels.size / 2);
          if (c === axis) assert.equal(delta, normal[c] * voxels.size / 2);
        }
      }
      const neighbour = mesh.neighbourBone[vertices[0]];
      assert(vertices.every((v) => mesh.neighbourBone[v] === neighbour));
      const adjacent = [i, j, k];
      adjacent[axis] += normal[axis];
      const inside = adjacent.every((x, c) => x >= 0 && x < voxels.dims[c]);
      const expected = inside ? voxels.owner[adjacent[0] + adjacent[1] * voxels.dims[0] + adjacent[2] * voxels.dims[0] * voxels.dims[1]] - 1 : -1;
      assert.equal(neighbour, expected);
      assert.notEqual(neighbour, bone);
      if (neighbour >= 0) sawBoundary = true;
      exposed.add(`${cell}:${normal.join(',')}`);
    }
    for (let cell = 0; cell < voxels.owner.length; cell++) {
      if (voxels.owner[cell] !== bone + 1) continue;
      const coordinates = [cell % voxels.dims[0], Math.floor(cell / voxels.dims[0]) % voxels.dims[1], Math.floor(cell / (voxels.dims[0] * voxels.dims[1]))];
      for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
        const adjacent = [...coordinates];
        adjacent[axis] += sign;
        const inside = adjacent.every((x, c) => x >= 0 && x < voxels.dims[c]);
        const owner = inside ? voxels.owner[adjacent[0] + adjacent[1] * voxels.dims[0] + adjacent[2] * voxels.dims[0] * voxels.dims[1]] : 0;
        const normal = [0, 0, 0]; normal[axis] = sign;
        assert.equal(exposed.has(`${cell}:${normal.join(',')}`), owner !== bone + 1);
      }
    }
  }
  assert(sawBoundary);
});

test('the emitted hull reproduces the generator ground fit after a JSON round trip', async () => {
  const { groundFit } = await import('../actorCompose.mjs');
  const { hullCentersByBone, posedVoxelSurfaceBounds, posedVoxelSurfaceBoundsForBones } = await import('../packages/mobgen/src/core/voxelBounds.ts');
  const { rotX, rotZ, mulMM } = await import('../packages/mobgen/src/core/math.ts');
  const voxels = cellFixture();
  const bones = [
    { id: 'root', parent: null, head: [0, 0, 0], tail: [0, 1, 0] },
    { id: 'chest', parent: 'root', head: [0, 1, 0], tail: [0, 2, 0] },
    { id: 'empty', parent: 'chest', head: [0, 2, 0], tail: [0, 3, 0] },
  ];
  const realized = { body: { bones }, voxels };
  const hull = hullCentersByBone(realized);
  const body = JSON.parse(JSON.stringify({ voxelSize: voxels.size, bones: bones.map((b) => ({ ...b, hull: hull.get(b.id) })) }));
  assert(hull.size > 0);
  for (const rotations of [{}, { root: rotZ(29), chest: mulMM(rotX(47), rotZ(-31)) }]) {
    const pose = { root: [0.3, -0.7, 0.2], rotations };
    const expected = posedVoxelSurfaceBounds(realized, pose);
    assert.deepEqual(groundFit(body, pose, bones.map((b) => b.id)), expected);
    assert.deepEqual(groundFit(body, pose, ['chest']).byBone, posedVoxelSurfaceBoundsForBones(realized, pose, ['chest']));
    // Independent all-cell sweep protects the projected half-height, not just the mapping.
    const { boneTransforms } = await import('../packages/mobgen/src/core/pose.ts');
    const { applyPoint } = await import('../packages/mobgen/src/core/math.ts');
    const transforms = boneTransforms(bones, pose);
    let lowest = Infinity;
    for (let cell = 0; cell < voxels.owner.length; cell++) {
      if (!voxels.owner[cell]) continue;
      const center = worldPosition(voxels, cell % 3, Math.floor(cell / 3), 0);
      const transform = transforms.get(bones[voxels.owner[cell] - 1].id);
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
        const corner = center.map((v, a) => v + [x, y, z][a] * voxels.size / 2);
        lowest = Math.min(lowest, applyPoint(transform, corner)[1]);
      }
    }
    assert(Math.abs(expected.lowest - lowest) < 1e-12);
  }
});

// The combined absolute/relative mass rule is deliberately separate from pose tolerance.
const massAgreement = (actual, reference) => {
  if (Array.isArray(reference)) {
    assert.equal(actual.length, reference.length);
    reference.forEach((value, i) => massAgreement(actual[i], value));
  } else {
    assert(Number.isFinite(actual));
    assert(Math.abs(actual - reference) <= 1e-9 * (1 + Math.abs(reference)), `${actual} disagrees with ${reference}`);
  }
};

test('the emitted body reproduces the generator\'s mass laws', async () => {
  const { bodyGeometry } = await import('../actorBody.mjs');
  const { voxelMassProperties, voxelBounds, partMassProperties } = await import('../actorMass.mjs');
  const { templateFigure } = await import('../packages/mobgen/src/mob/humanoidFigure.ts');
  const { consumableTemplate } = await import('../packages/mobgen/src/core/template.ts');
  const { massProperties, voxelBounds: liveBounds } = await import('../packages/mobgen/src/core/massProperties.ts');
  const { templatePartMassProperties } = await import('../packages/mobgen/src/core/templateMass.ts');
  const { severableParts, severedBoneSet } = await import('../packages/mobgen/src/mob/dismember.ts');
  const template = consumableTemplate('humanoid');
  const figure = templateFigure(template.name, 1);
  const { realized } = figure;
  const { bones } = realized.body;
  const body = JSON.parse(JSON.stringify(bodyGeometry(figure, template)));
  const parts = severableParts(bones);
  assert(parts.length > 0);
  const subtrees = parts.map((part) => bones.filter((bone) => severedBoneSet(bones, [part]).has(bone.id)));
  const selections = [bones, ...bones.filter((b) => figure.voxelCentersByBone.has(b.id)).map((b) => [b]), ...subtrees];
  let sawHullReduction = false;
  for (const [i, bone] of body.bones.entries()) {
    const expected = figure.voxelCentersByBone.get(bone.id);
    assert.deepEqual(bone.voxels, expected);
    if (expected) {
      assert(bone.hull.length > 0);
      assert(bone.hull.every((p) => expected.some((q) => p.every((v, a) => v === q[a]))));
      sawHullReduction ||= bone.hull.length < bone.voxels.length;
    } else assert.equal(bone.hull, undefined);
    const { voxels, hull, ...metadata } = bone;
    const { marrowMaterial, ...source } = bones[i];
    assert.deepEqual(metadata, source);
    for (const absent of ['mass', 'massCenter', 'box']) assert(!Object.hasOwn(bone, absent));
  }
  assert(sawHullReduction, 'fixture must distinguish hull candidates from owned voxels');
  assert.equal(body.voxelSize, realized.voxels.size);
  const pointsFor = (selection) => body.bones.filter((b) => selection.some((s) => s.id === b.id)).flatMap((b) => b.voxels ?? []);
  for (const selected of selections) {
    const indices = selected.map((b) => bones.indexOf(b));
    const points = pointsFor(selected);
    assert(points.length > 0);
    const actual = voxelMassProperties(points, body.voxelSize, 1000 * body.voxelSize ** 3);
    const expected = massProperties(realized.voxels, indices, realized.voxels.size);
    assert.equal(actual.mass, expected.mass);
    assert.deepEqual(voxelBounds(points, body.voxelSize), liveBounds(realized.voxels, indices));
    massAgreement(actual.center, expected.center);
    massAgreement(actual.inertia, expected.inertia);
  }
  const bodyVoxelCount = pointsFor(bones).length;
  let authored = 0;
  let fallback = 0;
  for (const [i, part] of parts.entries()) {
    const points = pointsFor(subtrees[i]);
    const actual = partMassProperties({ points, voxelSize: body.voxelSize, bodyVoxelCount, bodyMassKg: body.bodyMassKg, massFractions: body.massFractions, part });
    const expected = templatePartMassProperties({ voxels: realized.voxels, partBoneIndices: subtrees[i].map((b) => bones.indexOf(b)), bodyBoneIndices: bones.map((_, b) => b), voxelSize: body.voxelSize, template, part });
    if (template.massFractions?.[part] !== undefined) {
      authored++;
      assert.equal(actual.mass, expected.mass);
      assert.equal(actual.fraction, expected.fraction);
    } else {
      fallback++;
      massAgreement(actual.mass, expected.mass);
      massAgreement(actual.fraction, expected.fraction);
    }
    massAgreement(actual.center, expected.center);
    massAgreement(actual.inertia, expected.inertia);
    massAgreement(voxelBounds(points, body.voxelSize, actual.center).corners, liveBounds(realized.voxels, subtrees[i].map((b) => bones.indexOf(b)), expected.center).corners);
  }
  assert(authored > 0 && fallback > 0);
});

test('point-list mass keeps the assigned product and rejects empty or invalid inputs', async () => {
  const { voxelMassProperties, voxelBounds, partMassProperties } = await import('../actorMass.mjs');
  const points = [[-1, 0, 0], [0, 0, 0], [1, 0, 0]];
  const input = { points, voxelSize: 0.5, bodyVoxelCount: 3, bodyMassKg: 1, massFractions: { arm: 0.42 }, part: 'arm' };
  assert.equal(partMassProperties(input).mass, 0.42);
  assert.equal(partMassProperties(input).fraction, 0.42);
  assert.equal(partMassProperties({ ...input, massFractions: undefined }).fraction, 1);
  assert.throws(() => voxelMassProperties([], 1, 1), RangeError);
  assert.throws(() => voxelBounds([], 1), RangeError);
  for (const voxelSize of [0, -1, Infinity, NaN]) assert.throws(() => voxelMassProperties(points, voxelSize, 1), RangeError);
  for (const voxelMass of [0, -1, Infinity, NaN]) assert.throws(() => voxelMassProperties(points, 1, voxelMass), RangeError);
  for (const fraction of [0, -1, 1.1, Infinity, NaN]) assert.throws(() => partMassProperties({ ...input, massFractions: { arm: fraction } }), RangeError);
  for (const bodyMassKg of [0, -1, Infinity, NaN]) assert.throws(() => partMassProperties({ ...input, bodyMassKg }), RangeError);
});

test('actor body metadata preserves figure regions, support geometry and template action timing', async () => {
  const { actorBody } = await import('../actorBody.mjs');
  const { templateFigure } = await import('../packages/mobgen/src/mob/humanoidFigure.ts');
  const { consumableTemplate } = await import('../packages/mobgen/src/core/template.ts');
  const { planOf } = await import('../packages/mobgen/src/core/generate.ts');
  const { footRestExtents } = await import('../packages/mobgen/src/mob/gait.ts');
  const { GROUND_CONTACT_BONES } = await import('../packages/mobgen/src/mob/crawl.ts');
  const { burstBones } = await import('../packages/mobgen/src/mob/dismember.ts');
  const { attackClipFor } = await import('../packages/mobgen/src/mob/attack.ts');
  const { flinchClipFor } = await import('../packages/mobgen/src/mob/reactions.ts');
  const { LOOK_AT_PROFILES } = await import('../packages/mobgen/src/mob/lookAtProfiles.ts');
  const fixture = { type: 'fixture.actor', model: 'humanoid', seed: 1, scale: 1 };
  const figure = templateFigure(fixture.model, fixture.seed);
  const template = consumableTemplate(fixture.model);
  const body = JSON.parse(JSON.stringify(actorBody(figure, template, { ...fixture, lookAt: LOOK_AT_PROFILES[fixture.model] })));
  for (const [key, value] of Object.entries(fixture)) assert.equal(body[key], value);
  assert.equal(body.bodyPlan, template.bodyPlan);
  assert.deepEqual(body.regions, planOf(template.bodyPlan).regionBones);
  assert.deepEqual(body.boxes, figure.boxes);
  assert.deepEqual(body.severableParts, figure.severableParts);
  assert.deepEqual(body.burstBones, burstBones(figure.realized.body.bones));
  assert.deepEqual(body.extents, Object.fromEntries(footRestExtents(figure.realized.body.bones, figure.realized.voxels)));
  assert(GROUND_CONTACT_BONES.length > 0);
  assert.deepEqual(body.groundContactBones, GROUND_CONTACT_BONES);
  assert.deepEqual(body.anchors, figure.realized.body.anchors ?? {});
  assert.deepEqual(body.lookAt, LOOK_AT_PROFILES[fixture.model]);
  const attack = attackClipFor(template);
  assert.deepEqual(body.animation, { attackPeakAtSimSeconds: attack.hitTime, attackDurationSimSeconds: attack.duration, hitDurationSimSeconds: flinchClipFor(template).duration });
  const heights = [...figure.realized.meshes.values()].flatMap((mesh) => Array.from(mesh.positions).filter((_, i) => i % 3 === 1));
  assert(heights.length > 0);
  assert.equal(body.height, Math.max(...heights) - Math.min(...heights));
  assert.equal(body.bodyMassKg, template.bodyMassKg);
  assert.deepEqual(body.massFractions, template.massFractions);
  assert(body.bones.some((bone) => bone.voxels?.length));
  assert(body.bones.every((bone) => !('mass' in bone) && !('box' in bone)));
});

test('standing walk frame count scales with walk cycles while crawling does not', async () => {
  const { clips } = await bakeFixture('humanoid', { walkCycles: 3, walk_frames: 8 });
  assert.equal(clips.standing.walk.frames.length, clips.standing.walk.cycles * clips.crawling.walk.frames.length);
  assert.equal(clips.crawling.walk.frames.length, 8);
});

test('humanoid pose clips reproduce live standing and crawling poses over a closing gait cycle', async () => {
  const { humanoidPoseClips } = await import('../actorClips.mjs');
  const { decodeFrame } = await import('../actorCompose.mjs');
  const { templateFigure } = await import('../packages/mobgen/src/mob/humanoidFigure.ts');
  const { createGaitCache, footRestExtents, legGeometryFor, stepLengthMeters, walkPose } = await import('../packages/mobgen/src/mob/gait.ts');
  const { idleBasePose } = await import('../packages/mobgen/src/mob/idle.ts');
  const { crawlGaitPose } = await import('../packages/mobgen/src/mob/crawl.ts');
  const figure = templateFigure('humanoid', 1);
  const row = { walkCycles: 3, walk_frames: 8, walk_speed: 0.8 };
  const { clips } = await bakeFixture('humanoid', row);
  const actor = { bones: figure.realized.body.bones, extents: footRestExtents(figure.realized.body.bones, figure.realized.voxels), params: figure.genome.params, seed: figure.seed, cache: createGaitCache(), planPeriodSteps: 2 * row.walkCycles };
  const close = (a, b) => {
    if (Array.isArray(a)) { assert.equal(a.length, b.length); a.forEach((x, i) => close(x, b[i])); }
    else if (typeof a === 'object') { assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort()); for (const key of Object.keys(a)) close(a[key], b[key]); }
    else assert(Math.abs(a - b) <= 1e-9, `${a} != ${b}`);
  };
  for (const stance of ['slack', 'aggravated']) close(decodeFrame(clips.standing.idle[stance].base), idleBasePose(actor, stance));
  assert.equal(clips.standing.walk.cycles, row.walkCycles);
  assert.equal(clips.standing.walk.loop, true);
  const basis = { params: actor.params, geomL: legGeometryFor(actor.bones, actor.extents, 'L'), speed: row.walk_speed, seed: actor.seed, cache: actor.cache, planPeriodSteps: actor.planPeriodSteps };
  const loopMetres = Array.from({ length: actor.planPeriodSteps }, (_, step) => stepLengthMeters(basis, step)).reduce((sum, length) => sum + length, 0);
  assert.equal(clips.standing.walk.periodSimSeconds, undefined);
  assert(Math.abs(clips.standing.walk.strideMetres * row.walkCycles - loopMetres) <= 1e-12, 'the walk loop spans its plan period in strides');
  for (const [i, frame] of clips.standing.walk.frames.entries()) {
    const steps = 2 * row.walkCycles * i / clips.standing.walk.frames.length;
    const pose = walkPose(actor, { stepIndex: Math.floor(steps), progress: steps % 1 }, row.walk_speed);
    close(decodeFrame(frame), { root: pose.root, rotations: pose.rotations });
  }
  const end = walkPose(actor, { stepIndex: 2 * row.walkCycles, progress: 0 }, row.walk_speed);
  close(decodeFrame(clips.standing.walk.frames[0]), { root: end.root, rotations: end.rotations });
  close(decodeFrame(clips.crawling.idle.frames[0]), crawlGaitPose(figure.realized, 0, 0));
  assert.equal(clips.crawling.walk.cycles, 1);
  assert.equal(clips.crawling.walk.strideMetres, 1.2, 'the crawl walk states the row\'s authored crawl stride');
  for (const [i, frame] of clips.crawling.walk.frames.entries()) close(decodeFrame(frame), crawlGaitPose(figure.realized, 2 * Math.PI * i / clips.crawling.walk.frames.length, row.walk_speed));
  const legless = humanoidPoseClips(templateFigure('legless-humanoid', 1), { ...row, crawls: true, crawl_stride: 0.9, legCut: 0.55 });
  assert(!('standing' in legless));
  assert(legless.crawling.walk.frames.length > 1);
  assert.equal(legless.crawling.walk.strideMetres, 0.9);
  assert.throws(() => humanoidPoseClips(templateFigure('legless-humanoid', 1), { ...row, crawls: false, legCut: 0.55 }), RangeError);
});

test('a humanoid row that does not crawl bakes no crawling set', async () => {
  const { clips } = await bakeFixture('humanoid', { crawls: false, crawl_stride: undefined });
  assert.deepEqual(Object.keys(clips), ['standing']);
  assert.equal(clips.standing.attack.kind, 'overlay');
});

test('content rows that crawl carry a valid crawl stride; the player row bakes no crawling set', async () => {
  const { readMobRows } = await import('../layout.mjs');
  for (const row of readMobRows().filter((r) => /humanoid$/.test(r.template) && r.crawls)) {
    assert(Number.isFinite(row.crawl_stride) && row.crawl_stride > 0, `${row.id} crawl stride must be positive and finite`);
  }
  const player = readMobRows().find((r) => r.type === 'player');
  assert.equal(player.crawls, false);
});

test('serialized idle oscillators reproduce the live ordered rotation product at multiple times and seeds', async () => {
  const { applyMotion, decodeFrame } = await import('../actorCompose.mjs');
  const { applyIdleMotion } = await import('../packages/mobgen/src/mob/idle.ts');
  const { clips } = await bakeFixture('humanoid');
  for (const idle of Object.values(clips.standing.idle)) {
    assert(idle.motion.length > 0);
    assert(idle.motion.every((motion) => motion.bones.length > 0));
  }
  for (const [stance, idle] of Object.entries(clips.standing.idle)) for (const time of [0, 0.37, 3.2]) for (const seed of [2, 17]) {
    const base = decodeFrame(idle.base);
    const actual = applyMotion(base, idle.motion, time, seed);
    const expected = applyIdleMotion(base, stance, time, seed);
    assert.deepEqual(actual.root, expected.root);
    for (const id of Object.keys(expected.rotations)) expected.rotations[id].forEach((x, i) => assert(Math.abs(x - actual.rotations[id][i]) <= 1e-9));
  }
});

test('humanoid overlays reproduce action poses over live idle and walk bases at both sides', async () => {
  const { applyOverlay } = await import('../actorCompose.mjs');
  const { templateFigure } = await import('../packages/mobgen/src/mob/humanoidFigure.ts');
  const { consumableTemplate } = await import('../packages/mobgen/src/core/template.ts');
  const { createGaitCache, footRestExtents, walkPose } = await import('../packages/mobgen/src/mob/gait.ts');
  const { idleBasePose } = await import('../packages/mobgen/src/mob/idle.ts');
  const { crawlGaitPose, groundCrawlPose, crawlHitPose } = await import('../packages/mobgen/src/mob/crawl.ts');
  const { attackClipFor, attackPose, attackRotations } = await import('../packages/mobgen/src/mob/attack.ts');
  const { flinchClipFor, flinchPoseWithClip } = await import('../packages/mobgen/src/mob/reactions.ts');
  const figure = templateFigure('humanoid', 1);
  const template = consumableTemplate('humanoid');
  const row = { type: 'fixture.actor', model: 'humanoid', seed: 1, scale: 1, walkCycles: 1, walk_frames: 8, walk_speed: 0.8, attack_frames: 9 };
  const { body, clips } = await bakeFixture('humanoid', row);
  const actor = { bones: figure.realized.body.bones, extents: footRestExtents(figure.realized.body.bones, figure.realized.voxels), params: figure.genome.params, seed: figure.seed, cache: createGaitCache() };
  const attack = attackClipFor(template);
  const flinch = flinchClipFor(template);
  const crawlAttack = attackClipFor(consumableTemplate('legless-humanoid'));
  const close = (a, b) => {
    a.root.forEach((x, i) => assert(Math.abs(x - b.root[i]) <= 1e-9));
    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    for (const id of new Set([...Object.keys(a.rotations), ...Object.keys(b.rotations)])) {
      (b.rotations[id] ?? identity).forEach((x, i) => assert(Math.abs(x - (a.rotations[id] ?? identity)[i]) <= 1e-9, `${id}[${i}]`));
    }
  };
  let changedBySide = false;
  for (const [stance, bases] of Object.entries({
    standing: [idleBasePose(actor, 'slack'), walkPose(actor, { stepIndex: 1, progress: 0.4 }, 0.8)],
    crawling: [crawlGaitPose(figure.realized, 0, 0), crawlGaitPose(figure.realized, 1.7, 0.8)],
  })) for (const base of bases) for (const kind of ['attack', 'flinch']) {
    const clip = clips[stance][kind];
    assert.equal(clip.kind, 'overlay');
    // The span and strike keys name their clock, and no clock-less twin survives.
    assert(clip.durationSimSeconds > 0);
    assert(!('duration' in clip) && !('hitTime' in clip) && !('peak' in clip));
    assert(typeof (kind === 'attack' ? clip.hitAtSimSeconds : clip.peakAtSimSeconds) === 'number');
    assert(clip.frames.length > 2);
    for (let i = 0; i < clip.frames.length; i++) {
      const time = clip.durationSimSeconds * i / (clip.frames.length - 1);
      for (const side of [-1, 1]) {
        const actual = applyOverlay(body, base, clip, time, side, stance);
        const expected = stance === 'standing'
          ? kind === 'attack' ? attackPose(actor, attack, time, base) : flinchPoseWithClip(actor, time, base, { clip: flinch, side })
          : kind === 'attack' ? groundCrawlPose(figure.realized, { ...base, rotations: attackRotations(actor, crawlAttack, time, base).rotations }) : crawlHitPose(figure.realized, base, time, side);
        close(actual, expected);
      }
      if (kind === 'flinch' && i > 0 && i < clip.frames.length - 1) {
        const left = applyOverlay(body, base, clip, time, -1, stance);
        const right = applyOverlay(body, base, clip, time, 1, stance);
        changedBySide ||= JSON.stringify(left.rotations) !== JSON.stringify(right.rotations);
      }
    }
  }
  assert(changedBySide);
});

test('acid clips preserve idle timing and compose joint deltas over live bases with limits and sole hold', async () => {
  const { applyJointDelta, decodeFrame } = await import('../actorCompose.mjs');
  const { templateFigure } = await import('../packages/mobgen/src/mob/humanoidFigure.ts');
  const { acidTemplate } = await import('../packages/mobgen/src/mob/acidTemplate.ts');
  const { acidIdlePose, acidWalkPose, acidStrideLength, acidAttackPose, acidWindupPose, acidHitPose } = await import('../packages/mobgen/src/mob/acidPoses.ts');
  const figure = templateFigure('acid', 1);
  const row = { type: 'fixture.acid', model: 'acid', seed: 1, scale: 1, walkCycles: 1, walk_frames: 8, attack_frames: 9 };
  const baked = await bakeFixture('acid', row);
  const clips = baked.clips.standing;
  const body = baked.body;
  const tuning = acidTemplate.animation;
  assert.deepEqual(body.animation, { attackPeakAtSimSeconds: tuning.attackPeak, attackDurationSimSeconds: tuning.attackDuration, hitDurationSimSeconds: tuning.hitDuration, deathDurationRealSeconds: tuning.deathDuration });
  assert.equal(clips.idle.periodSimSeconds, tuning.idlePeriod);
  assert.equal(clips.idle.loop, true);
  const close = (actual, expected) => {
    actual.root.forEach((x, i) => assert(Math.abs(x - expected.root[i]) <= 1e-9, `root[${i}]`));
    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    for (const id of new Set([...Object.keys(actual.rotations), ...Object.keys(expected.rotations)])) {
      (expected.rotations[id] ?? identity).forEach((x, i) => assert(Math.abs(x - (actual.rotations[id] ?? identity)[i]) <= 1e-9, `${id}[${i}]`));
    }
  };
  for (const [i, frame] of clips.idle.frames.entries()) close(decodeFrame(frame), acidIdlePose(figure.realized, tuning.idlePeriod * i / clips.idle.frames.length));
  close(decodeFrame(clips.idle.frames[0]), acidIdlePose(figure.realized, tuning.idlePeriod));
  for (const speed of [-0.2, 0, 0.4, 1.4]) for (let i = 0; i < clips.walk.frames.length; i++) {
    const phase = 2 * Math.PI * i / clips.walk.frames.length;
    const base = acidIdlePose(figure.realized, 0.37);
    close(applyJointDelta(body, base, clips.walk, phase, { speed }), acidWalkPose(figure.realized, acidStrideLength(figure.realized) * phase / (2 * Math.PI), speed, 0.37));
  }
  const bases = [acidIdlePose(figure.realized, 0.37), acidWalkPose(figure.realized, 0.23, 0.7, 0.37)];
  let sideVaries = false;
  for (const base of bases) for (const name of ['attack', 'spitDraw', 'hit']) {
    const clip = clips[name];
    assert.equal(clip.kind, 'jointDelta');
    if (name === 'spitDraw') assert(!('durationSimSeconds' in clip) && !('durationRealSeconds' in clip));
    else {
      assert.equal(clip.durationSimSeconds, name === 'attack' ? tuning.attackDuration : tuning.hitDuration);
      assert(!('duration' in clip) && !('durationRealSeconds' in clip));
    }
    for (let i = 0; i < clip.frames.length; i++) for (const side of [-1, 1]) {
      const cursor = (clip.durationSimSeconds ?? 1) * i / (clip.frames.length - 1);
      const actual = applyJointDelta(body, base, clip, cursor, { side });
      const expected = name === 'attack' ? acidAttackPose(figure.realized, base, cursor) : name === 'spitDraw' ? acidWindupPose(figure.realized, base, cursor) : acidHitPose(figure.realized, base, cursor, side);
      close(actual, expected);
      if (name === 'hit') sideVaries ||= JSON.stringify(actual) !== JSON.stringify(applyJointDelta(body, base, clip, cursor, { side: -side }));
    }
  }
  assert(sideVaries);
  const { jointRotation, jointAngles, clampJointAngles } = await import('../packages/mobgen/src/core/joints.ts');
  // A deliberately excessive delta must clamp, rather than relying on authored curves staying in range.
  const bone = body.bones.find((b) => b.id === 'chest');
  const angles = [1000, -1000, 1000];
  const excessive = { kind: 'jointDelta', cursor: 'progress', frames: [{ angles: { chest: angles } }] };
  const actual = applyJointDelta(body, { root: [0.3, 0, -0.2], rotations: {} }, excessive, 1);
  close({ ...actual, root: [0, 0, 0] }, { root: [0, 0, 0], rotations: { chest: jointRotation(bone, clampJointAngles(bone, angles)) } });
  assert.deepEqual([actual.root[0], actual.root[2]], [0.3, -0.2]);
  assert(jointAngles(bone, actual.rotations.chest).every(Number.isFinite));
});

test('acid death clips reproduce the generator fall over the rest frame at every endpoint-inclusive frame time', async () => {
  const { decodeFrame } = await import('../actorCompose.mjs');
  const { templateFigure } = await import('../packages/mobgen/src/mob/humanoidFigure.ts');
  const { acidTemplate } = await import('../packages/mobgen/src/mob/acidTemplate.ts');
  const { acidIdlePose, acidDeathPose } = await import('../packages/mobgen/src/mob/acidPoses.ts');
  const figure = templateFigure('acid', 1);
  const row = { attack_frames: 9 };
  const { body, clips } = await bakeFixture('acid', row);
  const tuning = acidTemplate.animation;
  const rest = acidIdlePose(figure.realized, 0);
  const close = (actual, expected) => {
    actual.root.forEach((x, i) => assert(Math.abs(x - expected.root[i]) <= 1e-9, `root[${i}]`));
    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    for (const id of new Set([...Object.keys(actual.rotations), ...Object.keys(expected.rotations)])) {
      (expected.rotations[id] ?? identity).forEach((x, i) => assert(Math.abs(x - (actual.rotations[id] ?? identity)[i]) <= 1e-9, `${id}[${i}]`));
    }
  };
  assert(!('death' in body.animation));
  const clip = (direction) => clips.standing.death[direction];
  for (const [name, direction] of [['forward', 1], ['backward', -1]]) {
    const death = clip(name);
    assert.equal(death.kind, 'pose');
    assert.equal(death.loop, false);
    assert.equal(death.durationRealSeconds, tuning.deathDuration);
    assert(!('durationSimSeconds' in death));
    assert.equal(death.frames.length, row.attack_frames);
    for (const [i, frame] of death.frames.entries()) {
      close(decodeFrame(frame), acidDeathPose(figure.realized, rest, death.durationRealSeconds * i / (death.frames.length - 1), direction));
    }
    // Frame zero is the rest frame itself: the fall starts from idle frame zero.
    close(decodeFrame(death.frames[0]), rest);
  }
  // Directions fold differently, so the two clips are not copies.
  assert.notDeepEqual(clip('forward').frames.at(-1), clip('backward').frames.at(-1));
});

test('the death clips settle', async () => {
  const { decodeFrame, sampleClip } = await import('../actorCompose.mjs');
  const { templateFigure } = await import('../packages/mobgen/src/mob/humanoidFigure.ts');
  const { acidTemplate } = await import('../packages/mobgen/src/mob/acidTemplate.ts');
  const { acidIdlePose, acidDeathPose } = await import('../packages/mobgen/src/mob/acidPoses.ts');
  const figure = templateFigure('acid', 1);
  const { clips } = await bakeFixture('acid');
  const { deathDuration } = acidTemplate.animation;
  const rest = acidIdlePose(figure.realized, 0);
  for (const [name, direction] of [['forward', 1], ['backward', -1]]) {
    const death = clips.standing.death[name];
    assert.equal(death.durationRealSeconds, deathDuration);
    assert(death.frames.length >= 2);
    const settled = acidDeathPose(figure.realized, rest, deathDuration, direction);
    // The settled fold is what the generator holds from deathDuration on.
    const last = decodeFrame(death.frames.at(-1));
    for (const expected of [settled, acidDeathPose(figure.realized, rest, 2 * deathDuration, direction)]) {
      last.root.forEach((x, i) => assert(Math.abs(x - expected.root[i]) <= 1e-9, `${name} root[${i}]`));
      const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
      for (const id of new Set([...Object.keys(last.rotations), ...Object.keys(expected.rotations)])) {
        (expected.rotations[id] ?? identity).forEach((x, i) => assert(Math.abs(x - (last.rotations[id] ?? identity)[i]) <= 1e-9, `${name} ${id}[${i}]`));
      }
    }
    // Finite sampling returns the stored settled frame at and after duration.
    assert.strictEqual(sampleClip(death, deathDuration), death.frames.at(-1));
    assert.strictEqual(sampleClip(death, 3 * deathDuration), death.frames.at(-1));
  }
});

test('fused body preserves manifest, sparse owners, scaled bounds and ground-origin strike geometry', async () => {
  const { actorBody } = await import('../actorBody.mjs');
  const { figureFor } = await import('../actorFigure.mjs');
  const { fusedClips } = await import('../actorClips.mjs');
  const { generateValid } = await import('../packages/mobgen/src/core/generate.ts');
  const { fusedMassTemplate } = await import('../packages/mobgen/src/mob/fusedMassTemplate.ts');
  const { fusedMassManifest } = await import('../packages/mobgen/src/mob/fusedMass.ts');
  const { HIT_FLINCH } = await import('../packages/mobgen/src/mob/reactions.ts');
  const { LOOK_AT_PROFILES } = await import('../packages/mobgen/src/mob/lookAtProfiles.ts');
  const generated = generateValid(fusedMassTemplate, 1, { maxAttempts: 1 });
  assert(generated);
  const scale = 1.7;
  const figure = figureFor(generated, fusedMassTemplate, scale);
  const body = JSON.parse(JSON.stringify(actorBody(figure, fusedMassTemplate, { type: 'fixture.fused', model: 'fused-mass', seed: 1, scale, lookAt: LOOK_AT_PROFILES['fused-mass'] })));
  const voxels = generated.realized.voxels;
  assert.deepEqual(body.manifest, fusedMassManifest(generated.realized.body, voxels));
  assert.deepEqual(body.regions, Object.fromEntries(body.manifest.regions.map((region) => [region.id, region.boneIds])));
  assert.deepEqual(Object.keys(body.boxes), Object.keys(body.regions));
  assert.deepEqual(body.cells, { size: voxels.size, origin: voxels.origin, dims: voxels.dims, filled: Array.from(voxels.owner).flatMap((owner, i) => owner ? [[i, owner]] : []) });
  assert(body.cells.filled.length > 0);
  for (let axis = 0; axis < 3; axis++) {
    const values = body.bones.flatMap((bone) => bone.voxels ?? []).map((p) => p[axis]);
    const lo = Math.min(...values) - body.voxelSize / 2;
    const hi = Math.max(...values) + body.voxelSize / 2;
    assert.equal(body.bounds.min[axis], lo * scale);
    assert.equal(body.bounds.max[axis], hi * scale);
    assert(Math.abs(body.originOffset[axis] + (axis === 1 ? lo : (lo + hi) / 2) * scale) <= 1e-9);
    assert(Math.abs(body.restStrikeOrigin[axis] - (body.coreInteriorPoint[axis] * scale + body.originOffset[axis])) <= 1e-9);
  }
  for (const [region, ids] of Object.entries(body.regions)) for (const id of ids) {
    const points = body.bones.find((bone) => bone.id === id).voxels;
    if (!points) continue;
    const box = body.boxes[region].find((box) => box.bone === id);
    assert(box);
    points.forEach((p) => p.forEach((v, a) => assert(Math.abs(v - box.center[a]) <= box.halfSize[a])));
  }
  const core = body.bones.find((bone) => bone.id === 'core');
  assert(core.voxels.some((p) => p.every((v, a) => Math.abs(v - body.coreInteriorPoint[a]) < body.voxelSize / 2)));
  const peak = HIT_FLINCH.keys[1];
  assert.deepEqual(body.animation, { flinch: { peakAtSimSeconds: peak.t, durationSimSeconds: HIT_FLINCH.duration, pitch: peak.rotations.chest[0], roll: peak.rotations.chest[2] } });
  assert.equal(body.bodyMassKg, fusedMassTemplate.bodyMassKg);
  assert(!('massFractions' in body));
  const clips = JSON.parse(JSON.stringify(fusedClips(figure)));
  assert.deepEqual(Object.keys(clips.standing), ['idle']);
  assert.equal(clips.standing.idle.frames.length, 1);
  assert.deepEqual(clips.standing.idle.frames[0], { root: body.originOffset.map((v) => v / scale), rotations: {} });
});

test('every content row writes its declared actor files', async () => {
  const { mkdtempSync, existsSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { exportMob } = await import('../mobs.mjs');
  const { outputPath, readMobRows } = await import('../layout.mjs');
  const root = mkdtempSync(join(tmpdir(), 'actor-content-'));
  try {
    const rows = readMobRows();
    assert(rows.some(() => true), 'content must declare actor rows');
    for (const row of rows) {
      exportMob(row, root);
      for (const file of [row.glb, row.body, row.clips]) assert(existsSync(join(root, outputPath(row.pack, file))));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('every baked body names only bones it realizes in its regions and ground contacts', async () => {
  const { mkdtempSync, readFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { exportMob } = await import('../mobs.mjs');
  const { outputPath, readMobRows } = await import('../layout.mjs');
  const root = mkdtempSync(join(tmpdir(), 'actor-own-bones-'));
  try {
    let sawRegions = false;
    let sawGroundContacts = false;
    for (const row of readMobRows()) {
      exportMob(row, root);
      const body = JSON.parse(readFileSync(join(root, outputPath(row.pack, row.body))));
      const bones = new Set(body.bones.map((bone) => bone.id));
      for (const [region, members] of Object.entries(body.regions ?? {})) {
        sawRegions = true;
        for (const bone of members) assert(bones.has(bone), `${row.id} region ${region} names absent bone ${bone}`);
      }
      if (body.groundContactBones !== undefined) {
        sawGroundContacts = true;
        for (const bone of body.groundContactBones) assert(bones.has(bone), `${row.id} ground contact names absent bone ${bone}`);
      }
    }
    assert(sawRegions, 'content must exercise bodies with hit regions');
    assert(sawGroundContacts, 'content must exercise bodies with ground-contact bones');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('pose fixture rows bake nested GLBs and JSON with matching bone, emission, hull and cell contracts', async () => {
  const { mkdtempSync, readFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { exportMob } = await import('../mobs.mjs');
  const { outputPath } = await import('../layout.mjs');
  const { templateFigure } = await import('../packages/mobgen/src/mob/humanoidFigure.ts');
  const { generateValid } = await import('../packages/mobgen/src/core/generate.ts');
  const { consumableTemplate } = await import('../packages/mobgen/src/core/template.ts');
  const { figureFor } = await import('../actorFigure.mjs');
  const { crowdEmission } = await import('../packages/mobgen/src/mob/crowd.ts');
  const { materialOf } = await import('../packages/mobgen/src/core/voxelize.ts');
  const { boneTransforms } = await import('../packages/mobgen/src/core/pose.ts');
  const { applyPoint, rotX, rotZ } = await import('../packages/mobgen/src/core/math.ts');
  const { groundFit, decodeFrame } = await import('../actorCompose.mjs');
  const root = mkdtempSync(join(tmpdir(), 'actor-bake-'));
  let sawCharged = false;
  let sawEmission = false;
  try {
    for (const model of ['humanoid', 'legless-humanoid', 'acid', 'fused-mass']) {
      const row = { id: `fixture.${model}`, type: `fixture.${model}`, model, template: model, seed: 1, scale: 1.3,
        pack: 'fixture.pack', lod_divisor: 0, walkCycles: 1, walk_speed: 0.8, walk_frames: 8, attack_frames: 9, crawls: true, crawl_stride: 1.2,
        glb: `fixture/assets/${model}.glb`, body: `fixture/actors/${model}.body.json`, clips: `fixture/actors/${model}.clips.json` };
      exportMob(row, root);
      const at = (file) => join(root, outputPath(row.pack, file));
      const body = JSON.parse(readFileSync(at(row.body)));
      const clips = JSON.parse(readFileSync(at(row.clips)));
      const bytes = readFileSync(at(row.glb));
      const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
      const node = gltf.scene.children[0];
      const geometry = node.geometry;
      const pos = geometry.getAttribute('position');
      const nor = geometry.getAttribute('normal');
      const color = geometry.getAttribute('color');
      const bone = geometry.getAttribute('uv1');
      const emission = geometry.getAttribute('uv2');
      const cell = geometry.getAttribute('uv3');
      assert.deepEqual(node.userData.bones, body.bones.map((bone) => bone.id));
      assert(pos.count > 0);
      assert.equal(nor.count, pos.count);
      assert.equal(color.count, pos.count);
      assert.equal(bone.count, pos.count);
      assert.equal(emission.count, pos.count);
      for (const index of geometry.index.array) assert(index < pos.count);
      const template = consumableTemplate(model);
      const figure = model === 'fused-mass' ? figureFor(generateValid(template, row.seed, { maxAttempts: 1 }), template, row.scale) : templateFigure(model, row.seed);
      assert.deepEqual(body.boxes, figure.boxes);
      assert.deepEqual(body.severableParts, figure.severableParts);
      for (const bone of body.bones) {
        assert.deepEqual(bone.voxels, figure.voxelCentersByBone.get(bone.id));
        if (bone.voxels) assert(bone.hull.length > 0 && bone.hull.every((p) => bone.voxels.some((v) => v.every((x, a) => x === p[a]))));
      }
      const meshes = model === 'fused-mass' ? meshBones(figure.realized.voxels, body.bones.length, { perCell: true }) : figure.realized.meshes;
      let vertex = 0;
      for (const [owner, mesh] of meshes) for (let v = 0; v < mesh.colors.length; v++, vertex++) {
        assert.equal(bone.getX(vertex), owner);
        assert.equal(bone.getY(vertex), mesh.neighbourBone[v]);
        assert(owner >= 0 && owner < body.bones.length);
        for (let a = 0; a < 3; a++) {
          assert.equal(pos.array[vertex * 3 + a], mesh.positions[v * 3 + a]); // No facing conversion, even for -z rigs.
          assert.equal(nor.array[vertex * 3 + a], mesh.normals[v * 3 + a]);
        }
        const expectedEmission = crowdEmission(figure.realized.body.materials[materialOf(figure.realized.voxels, mesh.colors[v])]);
        expectedEmission.forEach((x, a) => assert.equal(emission.array[vertex * 2 + a], Math.fround(x)));
        sawCharged ||= emission.getY(vertex) > 0;
        sawEmission ||= emission.getX(vertex) > 0;
      }
      assert.equal(vertex, pos.count);
      const heights = Array.from({ length: pos.count }, (_, i) => pos.getY(i));
      assert(Math.abs(body.height - (Math.max(...heights) - Math.min(...heights))) <= body.voxelSize);
      const idle = clips.standing?.idle.slack?.base ?? clips.standing?.idle.frames?.[0] ?? clips.crawling.idle.frames[0];
      const base = decodeFrame(idle);
      // A non-axis-aligned pose catches missing projected half-voxel extents and reversed bone transforms.
      for (const pose of [base, { root: [0.2, -0.1, 0.3], rotations: { [body.bones[0].id]: rotZ(27), [body.bones[1].id]: rotX(-19) } }]) {
        const transforms = boneTransforms(body.bones, pose);
        let lowest = Infinity;
        for (let v = 0; v < pos.count; v++) {
          const point = [pos.getX(v), pos.getY(v), pos.getZ(v)];
          lowest = Math.min(lowest, applyPoint(transforms.get(body.bones[bone.getX(v)].id), point)[1]);
        }
        assert(Math.abs(lowest - groundFit(body, pose, body.bones.map((b) => b.id)).lowest) <= 1e-6);
        if (pose === base) assert(Math.abs(lowest) <= body.voxelSize);
      }
      if (template.bodyPlan === 'humanoid') {
        assert(clips.crawling.idle.frames.length > 0 && clips.crawling.walk.frames.length > 1);
        assert.equal('standing' in clips, template.legCut === undefined);
        assert.equal(clips.crawling.attack.kind, 'overlay');
      } else if (model === 'acid') {
        assert.deepEqual(Object.keys(clips.standing).sort(), ['attack', 'death', 'hit', 'idle', 'spitDraw', 'walk']);
        for (const name of ['walk', 'attack', 'spitDraw', 'hit']) assert.equal(clips.standing[name].kind, 'jointDelta');
        assert.deepEqual(Object.keys(clips.standing.death).sort(), ['backward', 'forward']);
        // Canonical baked fall: the runtime holds no death parameters.
        assert(!('death' in body.animation));
      }
      if (model === 'fused-mass') {
        assert.equal(cell.count, pos.count);
        const filled = new Map(body.cells.filled);
        for (let t = 0; t < geometry.index.count; t += 3) {
          const vertices = Array.from(geometry.index.array.slice(t, t + 3));
          const index = cell.getX(vertices[0]);
          assert(Number.isInteger(index));
          for (const v of vertices) {
            assert.equal(cell.getX(v), index);
            assert.equal(filled.get(index), bone.getX(v) + 1);
          }
        }
      } else assert.equal(cell, undefined);
    }
    assert(sawCharged && sawEmission);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('creature pose clips reproduce their live posers at every stored cursor', async () => {
  const { decodeFrame } = await import('../actorCompose.mjs');
  const { generateValid } = await import('../packages/mobgen/src/core/generate.ts');
  const { consumableTemplate } = await import('../packages/mobgen/src/core/template.ts');
  const { figureFor } = await import('../actorFigure.mjs');
  const { dogIdlePose, dogAttackPose, quadrupedGaitPose, quadrupedStrideLength, DOG_POUNCE } = await import('../packages/mobgen/src/mob/quadruped.ts');
  const { insectIdlePose, insectAttackPose, insectGaitPose, insectStrideLength, INSECT_LUNGE } = await import('../packages/mobgen/src/mob/insect.ts');
  const { floaterIdlePose, floaterCastPose, floaterDriftPose, FLOATER_CAST } = await import('../packages/mobgen/src/mob/floater.ts');
  const { dragonIdlePose, dragonAttackPose, dragonStompPose, DRAGON_LUNGE } = await import('../packages/mobgen/src/mob/dragon.ts');
  await Promise.all(['quadrupedTemplate.ts', 'insectTemplate.ts', 'floaterTemplate.ts', 'dragonTemplate.ts'].map((file) => import(`../packages/mobgen/src/mob/${file}`)));
  const close = (actual, expected) => {
    actual.root.forEach((value, axis) => assert(Math.abs(value - expected.root[axis]) < 1e-12));
    for (const id of new Set([...Object.keys(actual.rotations), ...Object.keys(expected.rotations)])) (actual.rotations[id] ?? [1, 0, 0, 0, 1, 0, 0, 0, 1]).forEach((value, axis) => assert(Math.abs(value - (expected.rotations[id] ?? [1, 0, 0, 0, 1, 0, 0, 0, 1])[axis]) < 1e-12));
  };
  const plans = {
    dog: (figure, row) => { const s = { limp: figure.genome.params.limp, headTilt: figure.genome.params.headTilt, jawOpen: figure.genome.params.jawOpen }; const stride = quadrupedStrideLength(figure.realized, s); return { idle: () => dogIdlePose(figure.realized, s), walk: (u) => quadrupedGaitPose(figure.realized, u * stride, row.walk_speed, s), attack: (t) => dogAttackPose(figure.realized, dogIdlePose(figure.realized, s), t), duration: DOG_POUNCE.duration }; },
    insect: (figure, row) => { const s = { mandibleOpen: figure.genome.params.mandibleOpen }; const stride = insectStrideLength(figure.realized); return { idle: () => insectIdlePose(figure.realized, 0.9), walk: (u) => insectGaitPose(figure.realized, u * stride, row.walk_speed, s), attack: (t) => insectAttackPose(figure.realized, insectIdlePose(figure.realized, 0), t), duration: INSECT_LUNGE.duration }; },
    floater: (figure) => ({ idle: () => floaterIdlePose(figure.realized, figure.genome.params), walk: (u) => floaterDriftPose(figure.realized, figure.genome.params, u), attack: (t) => floaterCastPose(figure.realized, figure.genome.params, t), duration: FLOATER_CAST.duration }),
    dragon: (figure) => ({ idle: () => dragonIdlePose(figure.realized, figure.genome.params), walk: (u) => dragonStompPose(figure.realized, figure.genome.params, u), attack: (t) => dragonAttackPose(figure.realized, figure.genome.params, t), duration: DRAGON_LUNGE.duration }),
  };
  for (const model of Object.keys(plans)) {
    const row = { walk_speed: 0.8, walk_frames: 8, attack_frames: 9 };
    const template = consumableTemplate(model), generated = generateValid(template, 1, { maxAttempts: 1 });
    const figure = figureFor(generated, template, 1), live = plans[model](figure, row), { body, clips } = await bakeFixture(model, row);
    assert(!('regions' in body) && !('boxes' in body) && !('severableParts' in body));
    if (model !== 'dog') assert(!('lookAt' in body));
    const standing = clips.standing;
    for (const [name, at] of Object.entries({ idle: live.idle, walk: live.walk, attack: live.attack })) for (const [i, frame] of standing[name].frames.entries()) {
      const cursor = name === 'attack' ? live.duration * i / (standing[name].frames.length - 1) : i / standing[name].frames.length;
      close(decodeFrame(frame), at(cursor));
    }
  }
});

test('leaper pose clips reproduce its live frames at every stored cursor, whole and maimed', async () => {
  const { decodeFrame } = await import('../actorCompose.mjs');
  const { generateValid } = await import('../packages/mobgen/src/core/generate.ts');
  const { consumableTemplate } = await import('../packages/mobgen/src/core/template.ts');
  const { figureFor } = await import('../actorFigure.mjs');
  const { leaperFrame } = await import('../packages/mobgen/src/mob/leaper/motion.ts');
  const row = { walk_speed: 0.6, walk_frames: 8, attack_frames: 9 };
  const template = consumableTemplate('leaper');
  const { realized } = figureFor(generateValid(template, 1, { maxAttempts: 1 }), template, 1);
  const { clips } = await bakeFixture('leaper', row);
  const cases = [
    [clips.standing.walk, 'stalk', {}], [clips.standing.attack, 'rake', {}], [clips.standing.pounce, 'pounce', {}],
    [clips.limping.walk.right, 'limp', { cuts: ['thigh.R'], mirrored: true }], [clips.dragging.walk, 'drag', { cuts: ['thigh.L', 'thigh.R'] }],
  ];
  for (const [clip, name, cut] of cases) for (const [i, frame] of clip.frames.entries()) {
    const live = leaperFrame(realized, name, clip.loop ? i / clip.frames.length : i / (clip.frames.length - 1), cut);
    const decoded = decodeFrame(frame);
    // Loops play in place; finite clips keep the travel that is part of the move.
    const root = clip.loop ? [live.pose.root[0], live.pose.root[1], 0] : live.pose.root;
    decoded.root.forEach((value, axis) => assert(Math.abs(value - root[axis]) < 1e-12, `${name} root at frame ${i}`));
    for (const [id, rotation] of Object.entries(live.pose.rotations)) rotation.forEach((value, k) => assert(Math.abs(decoded.rotations[id][k] - value) < 1e-12, `${name} ${id} at frame ${i}`));
    if (name === 'pounce') assert.equal(frame.charge, live.charge);
  }
  assert(clips.standing.pounce.takeoffAtSimSeconds < clips.standing.pounce.hitAtSimSeconds);
});

// Hand-authored motion, independent of generated geometry and content tuning.
const motionFixture = (t) => ({
  root: [t, 2 * t, -t],
  rotations: { chest: [Math.cos(t), -Math.sin(t), 0, Math.sin(t), Math.cos(t), 0, 0, 0, 1] },
});

test('finite pose sampling stores both endpoints and holds the last frame', async () => {
  const { poseClip } = await import('../actorClips.mjs');
  const { sampleClip } = await import('../actorCompose.mjs');
  const clip = poseClip(motionFixture, { loop: false, durationSimSeconds: 2, frames: 3 });
  assert.equal(clip.kind, 'pose');
  assert.equal(clip.loop, false);
  assert.deepEqual(clip.frames.map((f) => f.root), [0, 1, 2].map((t) => motionFixture(t).root));
  assert.strictEqual(sampleClip(clip, 2), clip.frames.at(-1));
  assert.strictEqual(sampleClip(clip, 4), clip.frames.at(-1));
  assert.strictEqual(sampleClip(clip, -1), clip.frames[0]);
  assert.strictEqual(sampleClip(clip, 1), clip.frames[1]);
  assert.deepEqual(sampleClip(clip, 1.5).root, motionFixture(1.5).root);
});

test('a finite clip without exactly one span key is rejected, not sampled as NaN', async () => {
  const { sampleClip } = await import('../actorCompose.mjs');
  const { poseClip } = await import('../actorClips.mjs');
  const frames = [{ root: [0, 0, 0], rotations: {} }, { root: [1, 0, 0], rotations: {} }];
  for (const clip of [{ kind: 'pose', loop: false, frames }, { kind: 'pose', loop: false, durationSimSeconds: 1, durationRealSeconds: 1, frames }]) {
    assert.throws(() => sampleClip(clip, 0.5), RangeError);
  }
  // The writer leaves no way to bake such a clip by accident: a finite span must name its clock.
  assert.throws(() => poseClip(motionFixture, { loop: false, duration: 1, frames: 2 }), TypeError);
});

test('loop sampling returns stored frames and interpolates the last interval toward frame zero', async () => {
  const { poseClip } = await import('../actorClips.mjs');
  const { sampleClip } = await import('../actorCompose.mjs');
  const clip = poseClip(motionFixture, { loop: true, periodSimSeconds: 2, frames: 4 });
  assert.deepEqual(clip.frames.map((f) => f.root), [0, 0.5, 1, 1.5].map((t) => motionFixture(t).root));
  assert.strictEqual(sampleClip(clip, 1), clip.frames[0]);
  assert.strictEqual(sampleClip(clip, -0.25), clip.frames[3]);
  assert.strictEqual(sampleClip(clip, 0.5), clip.frames[2]);
  assert.deepEqual(sampleClip(clip, 0.875).root, [0.75, 1.5, -0.75]);
  const single = poseClip(motionFixture, { loop: false, durationSimSeconds: 2, frames: 1 });
  assert.strictEqual(sampleClip(single, 100), single.frames[0]);
});

test('pose interpolation uses shortest-arc spherical quaternion interpolation and decoding preserves root translation', async () => {
  const { sampleClip, decodeFrame } = await import('../actorCompose.mjs');
  const { slerpQuat, quatToMat3 } = await import('../packages/mobgen/src/core/math.ts');
  const a = [0, 0, 0, 1];
  const b = [0, 0, -Math.sin(1.2), -Math.cos(1.2)];
  const clip = { kind: 'pose', loop: false, durationSimSeconds: 1, frames: [
    { root: [0, 0, 0], rotations: { chest: a } },
    { root: [2, 4, -2], rotations: { chest: b } },
  ] };
  const sample = sampleClip(clip, 0.3);
  assert.deepEqual(sample.rotations.chest, slerpQuat(a, b, 0.3));
  assert.deepEqual(decodeFrame(sample), { root: sample.root, rotations: { chest: quatToMat3(sample.rotations.chest) } });
  const { boneTransforms } = await import('../packages/mobgen/src/core/pose.ts');
  const bones = [{ id: 'chest', parent: null, head: [0, 0, 0], tail: [0, 1, 0] }];
  const posed = boneTransforms(bones, decodeFrame(sample)).get('chest');
  assert.deepEqual(posed.t, sample.root);
});
