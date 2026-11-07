import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { meshBones } from './packages/mobgen/src/core/mesh.ts';
import { materialOf, shadeOf } from './packages/mobgen/src/core/voxelize.ts';
import { crowdEmission } from './packages/mobgen/src/mob/crowd.ts';
import { LOOK_AT_PROFILES } from './packages/mobgen/src/mob/lookAtProfiles.ts';
import { outputPath } from './layout.mjs';
import { actorBody } from './actorBody.mjs';
import { figureFor } from './actorFigure.mjs';
import { acidClips, fusedClips, humanoidClips } from './actorClips.mjs';

const clipEmitters = { humanoid: humanoidClips, acid: (figure, _template, row) => acidClips(figure, row), 'fused-mass': fusedClips };
const SHADE_FACTORS = [0.72, 0.88, 1.04, 1.2];

function actorGlb(row, realized, meshes) {
  const nv = [...meshes.values()].reduce((n, mesh) => n + mesh.colors.length, 0);
  const ni = [...meshes.values()].reduce((n, mesh) => n + mesh.indices.length, 0);
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  const col = new Float32Array(nv * 4);
  const bone = new Float32Array(nv * 2);
  const emission = new Float32Array(nv * 2);
  const cell = row.fused ? new Float32Array(nv * 2) : undefined;
  const indices = new Uint32Array(ni);
  let vo = 0;
  let io = 0;
  for (const [owner, mesh] of meshes) {
    pos.set(mesh.positions, vo * 3);
    nor.set(mesh.normals, vo * 3);
    for (let v = 0; v < mesh.colors.length; v++) {
      const byte = mesh.colors[v];
      const material = realized.body.materials[materialOf(realized.voxels, byte)];
      const shade = SHADE_FACTORS[shadeOf(byte)];
      col.set([...material.color.map((x) => Math.min(1, x * shade)), material.emissive], (vo + v) * 4);
      bone.set([owner, mesh.neighbourBone[v]], (vo + v) * 2);
      emission.set(crowdEmission(material), (vo + v) * 2);
      if (cell) cell[(vo + v) * 2] = mesh.cellIndex[v];
    }
    for (const index of mesh.indices) indices[io++] = index + vo;
    vo += mesh.colors.length;
  }
  const parts = [pos, nor, col, bone, emission, ...(cell ? [cell] : []), indices];
  const offsets = [];
  let length = 0;
  for (const part of parts) { offsets.push(length); length += part.byteLength; }
  const bin = Buffer.alloc(length);
  parts.forEach((part, i) => Buffer.from(part.buffer, part.byteOffset, part.byteLength).copy(bin, offsets[i]));
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < nv; v++) for (let a = 0; a < 3; a++) {
    min[a] = Math.min(min[a], pos[v * 3 + a]);
    max[a] = Math.max(max[a], pos[v * 3 + a]);
  }
  const attributes = { POSITION: 0, NORMAL: 1, COLOR_0: 2, TEXCOORD_1: 3, TEXCOORD_2: 4, ...(cell ? { TEXCOORD_3: 5 } : {}) };
  const types = ['VEC3', 'VEC3', 'VEC4', 'VEC2', 'VEC2', ...(cell ? ['VEC2'] : []), 'SCALAR'];
  const json = {
    asset: { version: '2.0', generator: 'skelly-assets tools/mobs.mjs' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: row.id, extras: { bones: realized.body.bones.map((bone) => bone.id) } }],
    meshes: [{ primitives: [{ attributes, indices: parts.length - 1, mode: 4 }] }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: parts.map((part, i) => ({ buffer: 0, byteOffset: offsets[i], byteLength: part.byteLength })),
    accessors: parts.map((part, i) => ({ bufferView: i, componentType: part === indices ? 5125 : 5126, count: part === indices ? ni : nv, type: types[i], ...(i === 0 ? { min, max } : {}) })),
  };
  const raw = Buffer.from(JSON.stringify(json));
  const js = Buffer.concat([raw, Buffer.alloc((4 - raw.length % 4) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const chunk = (size, type) => { const bytes = Buffer.alloc(8); bytes.writeUInt32LE(size); bytes.writeUInt32LE(type, 4); return bytes; };
  return Buffer.concat([header, chunk(js.length, 0x4e4f534a), js, chunk(bin.length, 0x004e4942), bin]);
}

/** Pose rows retain the generator frame, including unscaled positions and local rotations. */
export function bakeActor(row, template, generated, out) {
  const emitClips = clipEmitters[template.bodyPlan];
  if (!emitClips) throw new Error(`unsupported actor body plan ${template.bodyPlan}`);
  for (const field of ['glb', 'body', 'clips']) if (typeof row[field] !== 'string' || !row[field]) throw new Error(`pose row requires ${field}`);
  const model = row.model ?? row.template;
  const figure = figureFor(generated, template, row.scale);
  const body = actorBody(figure, template, { type: row.type ?? row.id, model, seed: row.seed, scale: row.scale, lookAt: row.lookAt ?? LOOK_AT_PROFILES[model] });
  const clips = emitClips(figure, template, row);
  const fused = template.bodyPlan === 'fused-mass';
  const meshes = fused ? meshBones(generated.realized.voxels, body.bones.length, { perCell: true }) : generated.realized.meshes;
  const outputs = [[row.body, JSON.stringify(body)], [row.clips, JSON.stringify(clips)], [row.glb, actorGlb({ ...row, fused }, generated.realized, meshes)]];
  for (const [file, bytes] of outputs) {
    const path = join(out, outputPath(row.pack, file));
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
  }
}
