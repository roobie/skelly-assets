import { meshBones } from './packages/mobgen/src/core/mesh.ts';
import { materialOf, shadeOf } from './packages/mobgen/src/core/voxelize.ts';
import { crowdEmission } from './packages/mobgen/src/mob/crowd.ts';
import { LOOK_AT_PROFILES } from './packages/mobgen/src/mob/lookAtProfiles.ts';
import { actorBody } from './actorBody.mjs';
import { writeGlb } from './glb.mjs';
import { fileBody, fileClips, turnCellIndex, turnPointArray } from './actorFrame.mjs';
import { figureFor } from './actorFigure.mjs';
import { acidClips, creatureClips, fusedClips, humanoidClips, leaperClips, walkerClips } from './actorClips.mjs';

const clipEmitters = {
  humanoid: humanoidClips,
  acid: (figure, _template, row) => acidClips(figure, row),
  'fused-mass': fusedClips,
  quadruped: creatureClips,
  critter: creatureClips,
  insect: creatureClips,
  floater: creatureClips,
  dragon: creatureClips,
  leaper: leaperClips,
  walker: walkerClips,
};
export const SHADE_FACTORS = [0.72, 0.88, 1.04, 1.2];

// The box a flat xyz position array spans, as a glTF POSITION accessor states it.
export function pointBounds(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < positions.length; v += 3) for (let a = 0; a < 3; a++) {
    min[a] = Math.min(min[a], positions[v + a]);
    max[a] = Math.max(max[a], positions[v + a]);
  }
  return { min, max };
}

function actorGlb(row, realized, meshes) {
  const nv = [...meshes.values()].reduce((n, mesh) => n + mesh.colors.length, 0);
  const ni = [...meshes.values()].reduce((n, mesh) => n + mesh.indices.length, 0);
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  const col = new Float32Array(nv * 4);
  const bone = new Float32Array(nv * 2);
  const emission = new Float32Array(nv * 2);
  const cell = row.fused ? new Float32Array(nv * 2) : undefined;
  const cellIndex = turnCellIndex(realized.voxels.dims);
  const indices = new Uint32Array(ni);
  let vo = 0;
  let io = 0;
  for (const [owner, mesh] of meshes) {
    pos.set(turnPointArray(mesh.positions), vo * 3);
    nor.set(turnPointArray(mesh.normals), vo * 3);
    for (let v = 0; v < mesh.colors.length; v++) {
      const byte = mesh.colors[v];
      const material = realized.body.materials[materialOf(realized.voxels, byte)];
      const shade = SHADE_FACTORS[shadeOf(byte)];
      col.set([...material.color.map((x) => Math.min(1, x * shade)), material.emissive], (vo + v) * 4);
      bone.set([owner, mesh.neighbourBone[v]], (vo + v) * 2);
      emission.set(crowdEmission(material), (vo + v) * 2);
      if (cell) cell[(vo + v) * 2] = cellIndex(mesh.cellIndex[v]);
    }
    for (const index of mesh.indices) indices[io++] = index + vo;
    vo += mesh.colors.length;
  }
  const parts = [pos, nor, col, bone, emission, ...(cell ? [cell] : []), indices];
  const attributes = { POSITION: 0, NORMAL: 1, COLOR_0: 2, TEXCOORD_1: 3, TEXCOORD_2: 4, ...(cell ? { TEXCOORD_3: 5 } : {}) };
  const types = ['VEC3', 'VEC3', 'VEC4', 'VEC2', 'VEC2', ...(cell ? ['VEC2'] : []), 'SCALAR'];
  const { min, max } = pointBounds(pos);
  return writeGlb({
    asset: { version: '2.0', generator: 'skelly-assets tools/mobs.mjs' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: row.id, extras: { bones: realized.body.bones.map((bone) => bone.id) } }],
    meshes: [{ primitives: [{ attributes, indices: parts.length - 1, mode: 4 }] }],
    accessors: parts.map((part, i) => ({ bufferView: i, componentType: part === indices ? 5125 : 5126, count: part === indices ? ni : nv, type: types[i], ...(i === 0 ? { min, max } : {}) })),
  }, parts);
}

/**
 * The actor's files by role, `body`, `clips`, `genome` and `glb`, which the row's fields of those names place. Every
 * file is in the model frame (tools/actorFrame.mjs); positions stay unscaled and rotations local. The genome is every
 * value the generator drew, after the row narrowed its template, so a consumer comparing two releases can tell a
 * re-rolled figure from one the same draws built differently: a seed alone names neither, since a change to the draw
 * order or a builder changes the figure under the same seed.
 */
export function bakeActor(row, template, generated) {
  const emitClips = clipEmitters[template.bodyPlan];
  if (!emitClips) throw new Error(`unsupported actor body plan ${template.bodyPlan}`);
  for (const field of ['glb', 'body', 'clips', 'genome']) if (typeof row[field] !== 'string' || !row[field]) throw new Error(`pose row requires ${field}`);
  const model = row.model ?? row.template;
  const figure = figureFor(generated, template, row.scale);
  const body = fileBody(actorBody(figure, template, { type: row.type ?? row.id, model, seed: row.seed, scale: row.scale, lookAt: row.lookAt ?? LOOK_AT_PROFILES[model] }));
  const clips = fileClips(emitClips(figure, template, row));
  const fused = template.bodyPlan === 'fused-mass';
  const meshes = fused ? meshBones(generated.realized.voxels, body.bones.length, { perCell: true }) : generated.realized.meshes;
  return { body: JSON.stringify(body), clips: JSON.stringify(clips), genome: JSON.stringify(generated.genome), glb: actorGlb({ ...row, fused }, generated.realized, meshes) };
}
