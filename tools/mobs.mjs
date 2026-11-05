// Exports the 3D mobs of the --mobs-3d layer: for each row of models/mobs.json a merged vertex-coloured mesh (a GLB) and the
// mob's walk, attack and idle clips as per-bone matrix frames (JSON). Usage: node tools/model/mobs.mjs [--out dir] [mobId ...]
// (tools/build_mobs.sh is the usual way in). With no ids it builds every row; the files go flat into --out, by default
// assets/own/skelly. Needs node 26 or later and `npm ci` in tools/model. Adapted from skelly's mobgen export of the shambler
// (see README.md beside this file); mobgen itself is the copy in packages/mobgen.
//
// The mesh: every bone's greedy-meshed voxel faces in rest-world metres, facing +z (the way the avatar models face), the bone
// index of each vertex in TEXCOORD_1.x (and the bone across each face in .y), the colour in COLOR_0 (rgb: the material colour
// times the face's shade; a: the material's own glow). The clips: for each bone a 3x4 matrix (r0..r8 row-major, then t0..t2)
// that takes a rest-world point to its posed place, as mobgen's boneTransformsInto gives it. Skinning is rigid: one bone per vertex.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { installJsonnetSources } from './sources.mjs';

const here = import.meta.dirname;
const repo = resolve(here, '../..');
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { out: { type: 'string', default: join(repo, 'assets/own/skelly') } },
});
const sheet = JSON.parse(readFileSync(join(repo, 'models/mobs.json'), 'utf8'));
const rows = sheet.mobs.map((row) => ({ ...sheet.defaults, ...row }));
const wanted = positionals.length > 0 ? positionals : rows.map((row) => row.id);
const unknown = wanted.filter((id) => !rows.some((row) => row.id === id));
if (unknown.length > 0) {
  console.log(`not in models/mobs.json: ${unknown.join(' ')}`);
  process.exit(1);
}
const out = resolve(values.out);
mkdirSync(out, { recursive: true });

installJsonnetSources();
const src = (p) => `./packages/mobgen/src/${p}`;
const { generate, generateValid, realize, realizeLod } = await import(src('core/generate.ts'));
const { consumableTemplate, registerTemplate } = await import(src('core/template.ts'));
await import(src('mob/templates.ts')); // importing a template module registers it
await import(src('mob/acidTemplate.ts'));
await import(src('mob/amalgamTemplate.ts'));
await import(src('mob/dogTemplate.ts'));
await import(src('mob/skeletonTemplate.ts'));
const { materialOf, shadeOf } = await import(src('core/voxelize.ts'));
const { allocateBoneTransforms, boneTransformsInto, indexBonesByParent } = await import(src('core/pose.ts'));
const { advanceClock, createGaitCache, legGeometryFor, footRestExtents, walkPose, stepLengthMeters } = await import(src('mob/gait.ts'));
const { idleBasePose } = await import(src('mob/idle.ts'));
const { attackClipFor, attackPose } = await import(src('mob/attack.ts'));

const SHADE_FACTORS = [0.72, 0.88, 1.04, 1.2]; // skelly's viewer/scene.ts SHADE_FACTORS: the shade of a face as a brightness
const round = (x) => Math.round(x * 1e5) / 1e5;

const hex = (c) => (typeof c === 'string' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255) : c);

// The row's template with the row's own narrowed param ranges (`params`), palette (`materials`: name -> {color: "#rrggbb" | [r, g, b], emissive})
// and signature `parts` laid over it; registered under the row's id, so rows of one template do not meet.
function deriveTemplate(base, row) {
  const materials = { ...base.materials };
  for (const [name, m] of Object.entries(row.materials ?? {})) materials[name] = { emissive: 0, ...m, color: hex(m.color) };
  const materialHsl = Object.fromEntries(Object.entries(base.materialHsl ?? {}).filter(([name]) => !(name in (row.materials ?? {}))));
  const derived = { ...base, name: `mob:${row.id}`, materials, materialHsl, params: { ...base.params, ...row.params }, budgetParams: base.budgetParams ?? base.params, parts: row.parts ?? [] };
  registerTemplate(derived);
  return derived;
}

function exportMob(row) {
  const { id, seed, walk_speed: WALK_SPEED, walk_frames: WALK_FRAMES, attack_frames: ATTACK_FRAMES } = row;
  const divisor = row.lod_divisor; // the LOD voxel is the template's 0.5 m block over this; 0 keeps the full detail
  const template = deriveTemplate(consumableTemplate(row.template), row);
  const found = generateValid(template, seed, { maxAttempts: 1 });
  if (!found) {
    const issues = realize(generate(template, seed)).report.issues;
    throw new Error(`seed ${seed} does not make a valid ${row.template}: ${issues.map((i) => JSON.stringify(i)).join('; ')}`);
  }
  const realized = divisor > 0 ? realizeLod(found, 0.5 / divisor).realized : found.realized;
  const genome = found.genome; // the LOD keeps the genome's body, so the walk is posed from the full-detail one
  if (!realized.report.ok) console.error(`warning: the realized body does not pass its own report: ${realized.report.issues.map((i) => i.message).join('; ')}`);
  const { bones } = realized.body;

  // Facing: mobgen's rest pose may face -z; the avatar models face +z, so turn the whole export half a turn about y when it does.
  const feet = bones.filter((b) => b.id.startsWith('foot.'));
  const toe = feet.reduce((s, b) => s + (b.tail[2] - b.head[2]), 0);
  const FLIP = toe < 0;
  const fp = (p) => (FLIP ? [-p[0], p[1], -p[2]] : p);

  // ---- the mesh ----
  let nv = 0;
  let ni = 0;
  for (const m of realized.meshes.values()) {
    nv += m.positions.length / 3;
    ni += m.indices.length;
  }
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  const col = new Float32Array(nv * 4);
  const bone = new Float32Array(nv * 2);
  const idx = new Uint32Array(ni);
  let vo = 0;
  let io = 0;
  for (const [b, m] of realized.meshes) {
    const n = m.positions.length / 3;
    for (let v = 0; v < n; v++) {
      const p = fp([m.positions[v * 3], m.positions[v * 3 + 1], m.positions[v * 3 + 2]]);
      const q = fp([m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]]);
      pos.set(p, (vo + v) * 3);
      nor.set(q, (vo + v) * 3);
      const byte = m.colors[v];
      const mat = realized.body.materials[materialOf(realized.voxels, byte)];
      const f = SHADE_FACTORS[shadeOf(byte)] ?? 1;
      col.set([Math.min(1, mat.color[0] * f), Math.min(1, mat.color[1] * f), Math.min(1, mat.color[2] * f), mat.emissive], (vo + v) * 4);
      bone[(vo + v) * 2] = b;
      bone[(vo + v) * 2 + 1] = m.neighbourBone[v]; // the bone across the face, -1 to open air: a later gore tint reads it
    }
    // a half turn about y reverses the handedness of nothing (it is a rotation), so the winding stays
    for (let i = 0; i < m.indices.length; i++) idx[io + i] = m.indices[i] + vo;
    vo += n;
    io += m.indices.length;
  }
  const triangles = ni / 3;

  // ---- the clips ----
  const parentIndex = indexBonesByParent(bones);
  const scratch = allocateBoneTransforms(bones.length);
  const walkActor = {
    bones,
    extents: footRestExtents(bones, realized.voxels),
    params: genome.params,
    seed: genome.seed,
    cache: createGaitCache(),
  };
  const geomL = legGeometryFor(bones, walkActor.extents, 'L');
  // One pose to one frame: for every bone the rotation and translation, with the half turn about y folded in (M r M, M t, M = diag(-1,1,-1)).
  const frame = (pose) => {
    boneTransformsInto(bones, pose, parentIndex, scratch);
    const result = [];
    for (const t of scratch) {
      const r = t.r.slice();
      const p = t.t.slice();
      if (FLIP) {
        r[1] = -r[1]; r[3] = -r[3]; r[5] = -r[5]; r[7] = -r[7]; // the entries mixing y with x or z flip; x and z mix with each other keep
        p[0] = -p[0]; p[2] = -p[2];
      }
      result.push(...r.map(round), ...p.map(round));
    }
    return result;
  };
  const basis = { params: walkActor.params, geomL, speed: WALK_SPEED, seed: walkActor.seed, cache: walkActor.cache };
  const idle = idleBasePose(walkActor, row.idle);
  // Two steps (one cycle) from step 2 on, so the first step's start-up style is past; sampled by distance as the game plays it.
  const cycleM = stepLengthMeters(basis, 2) + stepLengthMeters(basis, 3);
  let clock = { stepIndex: 2, progress: 0 };
  const walk = [];
  for (let i = 0; i < WALK_FRAMES; i++) {
    walk.push(frame(walkPose(walkActor, clock, WALK_SPEED, { idle })));
    clock = advanceClock(clock, cycleM / WALK_FRAMES, basis);
  }
  const clip = attackClipFor(template);
  const attack = [];
  for (let i = 0; i < ATTACK_FRAMES; i++) {
    attack.push(frame(attackPose(walkActor, clip, (clip.duration * i) / (ATTACK_FRAMES - 1), idle)));
  }
  const clips = {
    _doc: 'Per-bone rigid matrices (r0..r8 row-major then t0..t2, metres, y up, facing +z) taking a rest-world point to its posed place; built by tools/build_mobs.sh from models/mobs.json.',
    seed,
    bones: bones.map((b) => b.id),
    dispositions: bones.map((b) => b.disposition ?? 'fixed'), // 'sever' and 'burst' bones are what dismemberment cuts
    parents: Array.from(parentIndex),
    walk: { frames: walk, cycle_m: round(cycleM), loop: true },
    attack: { frames: attack, duration: round(clip.duration), hit_time: round(clip.hitTime), loop: false },
    idle: { frames: [frame(idle)], loop: true },
  };
  writeFileSync(join(out, row.clips), JSON.stringify(clips));

  // ---- the GLB ----
  const parts = [pos, nor, col, bone, idx];
  const bufLen = parts.reduce((s, a) => s + a.byteLength, 0);
  const bin = Buffer.alloc(bufLen);
  const offsets = [];
  let off = 0;
  for (const a of parts) {
    offsets.push(off);
    Buffer.from(a.buffer, a.byteOffset, a.byteLength).copy(bin, off);
    off += a.byteLength;
  }
  const lo = Array(3).fill(Infinity);
  const hi = Array(3).fill(-Infinity);
  for (let i = 0; i < nv; i++) {
    for (let c = 0; c < 3; c++) {
      lo[c] = Math.min(lo[c], pos[i * 3 + c]);
      hi[c] = Math.max(hi[c], pos[i * 3 + c]);
    }
  }
  const json = {
    asset: { version: '2.0', generator: 'tools/model/mobs.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: id }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2, TEXCOORD_1: 3 }, indices: 4, mode: 4 }] }],
    buffers: [{ byteLength: bufLen }],
    bufferViews: parts.map((a, i) => ({ buffer: 0, byteOffset: offsets[i], byteLength: a.byteLength })),
    accessors: [
      { bufferView: 0, componentType: 5126, count: nv, type: 'VEC3', min: lo, max: hi },
      { bufferView: 1, componentType: 5126, count: nv, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: nv, type: 'VEC4' },
      { bufferView: 3, componentType: 5126, count: nv, type: 'VEC2' },
      { bufferView: 4, componentType: 5125, count: ni, type: 'SCALAR' },
    ],
  };
  let js = Buffer.from(JSON.stringify(json));
  js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  const binPad = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
  const head = Buffer.alloc(12);
  head.write('glTF', 0);
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(12 + 8 + js.length + 8 + binPad.length, 8);
  const chunk = (len, type) => {
    const b = Buffer.alloc(8);
    b.writeUInt32LE(len, 0);
    b.writeUInt32LE(type, 4);
    return b;
  };
  writeFileSync(join(out, row.glb), Buffer.concat([head, chunk(js.length, 0x4e4f534a), js, chunk(binPad.length, 0x004e4942), binPad]));

  console.log(`${id} (${row.template} seed ${seed} lod ${divisor}): ${triangles} triangles, ${nv} vertices, ${bones.length} bones, height ${(hi[1] - lo[1]).toFixed(2)} m, facing flipped ${FLIP}`);
  console.log(`  walk cycle ${cycleM.toFixed(2)} m in ${WALK_FRAMES} frames; attack ${clip.duration}s (hit ${clip.hitTime}s) in ${ATTACK_FRAMES} frames`);
}

let failed = false;
for (const id of wanted) {
  try {
    exportMob(rows.find((row) => row.id === id));
  } catch (error) {
    console.log(`EXPORT FAILED ${id}: ${error.message}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
