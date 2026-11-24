// @ts-check
/** @import { Clips } from './actorFrame.mjs' */
/** @import { Figure } from './actorFigure.mjs' */
/** @import { MobRow } from './layout.mjs' */
/** @import { Realized } from './packages/mobgen/src/core/generate.ts' */
/** @import { BoneMesh } from './packages/mobgen/src/core/mesh.ts' */
/** @import { Genome, Template } from './packages/mobgen/src/core/template.ts' */
import { actorBody } from './actorBody.mjs';
import { acidClips, creatureClips, fusedClips, humanoidClips, leaperClips, walkerClips } from './actorClips.mjs';
import { figureFor } from './actorFigure.mjs';
import { fileBody, fileClips, turnCellIndex, turnPointArray } from './actorFrame.mjs';
import { writeGlb } from './glb.mjs';
import { meshBones } from './packages/mobgen/src/core/mesh.ts';
import { materialOf, shadeOf } from './packages/mobgen/src/core/voxelize.ts';
import { crowdEmission } from './packages/mobgen/src/mob/crowd.ts';
import { LOOK_AT_PROFILES } from './packages/mobgen/src/mob/lookAtProfiles.ts';

/** @type {Readonly<Record<string, (figure: Figure, template: Template, row: MobRow) => Clips>>} */
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

/** @param {number} index of a flat xyz triple's number */
const axisAt = (index) => (index % 3 === 0 ? 0 : index % 3 === 1 ? 1 : 2);

/**
 * The box a flat xyz position array spans, as a glTF POSITION accessor states it.
 * @param {Float32Array} positions
 */
export function pointBounds(positions) {
  /** @type {[number, number, number]} */
  const min = [Infinity, Infinity, Infinity];
  /** @type {[number, number, number]} */
  const max = [-Infinity, -Infinity, -Infinity];
  positions.forEach((value, index) => {
    const a = axisAt(index);
    min[a] = Math.min(min[a], value);
    max[a] = Math.max(max[a], value);
  });
  return { min, max };
}

/**
 * @template Item
 * @param {ArrayLike<Item>} list
 * @param {number} index
 * @param {string} what
 */
const itemAt = (list, index, what) => {
  const item = list[index];
  if (item === undefined) throw new Error(`actor mesh: no ${what} at ${index}`);
  return item;
};

/**
 * @param {{ id: string; fused: boolean }} row
 * @param {Pick<Realized, 'voxels' | 'body'>} realized
 * @param {ReadonlyMap<number, BoneMesh>} meshes
 */
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
    const { cellIndex: cells } = mesh;
    if (cell && !cells) throw new Error('a fused mass needs its mesh cut per cell');
    const base = vo;
    mesh.colors.forEach((byte, v) => {
      const name = materialOf(realized.voxels, byte);
      const material = realized.body.materials[name];
      if (!material) throw new Error(`actor mesh: the body has no material ${name}`);
      const shade = itemAt(SHADE_FACTORS, shadeOf(byte), 'shade');
      col.set([...material.color.map((x) => Math.min(1, x * shade)), material.emissive], (base + v) * 4);
      bone.set([owner, itemAt(mesh.neighbourBone, v, 'neighbour bone')], (base + v) * 2);
      emission.set(crowdEmission(material), (base + v) * 2);
      if (cell && cells) cell[(base + v) * 2] = cellIndex(itemAt(cells, v, 'cell'));
    });
    for (const index of mesh.indices) indices[io++] = index + vo;
    vo += mesh.colors.length;
  }
  const parts = [pos, nor, col, bone, emission, ...(cell ? [cell] : []), indices];
  const attributes = {
    POSITION: 0,
    NORMAL: 1,
    COLOR_0: 2,
    TEXCOORD_1: 3,
    TEXCOORD_2: 4,
    ...(cell ? { TEXCOORD_3: 5 } : {}),
  };
  const types = ['VEC3', 'VEC3', 'VEC4', 'VEC2', 'VEC2', ...(cell ? ['VEC2'] : []), 'SCALAR'];
  const { min, max } = pointBounds(pos);
  return writeGlb(
    {
      asset: { version: '2.0', generator: 'skelly-assets tools/mobs.mjs' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, name: row.id, extras: { bones: realized.body.bones.map((bone) => bone.id) } }],
      meshes: [{ primitives: [{ attributes, indices: parts.length - 1, mode: 4 }] }],
      accessors: parts.map((part, i) => ({
        bufferView: i,
        componentType: part === indices ? 5125 : 5126,
        count: part === indices ? ni : nv,
        type: types[i],
        ...(i === 0 ? { min, max } : {}),
      })),
    },
    parts,
  );
}

/**
 * The actor's files by role, `body`, `clips`, `genome` and `glb`, which the row's fields of those names place. Every
 * file is in the model frame (tools/actorFrame.mjs); positions stay unscaled and rotations local. The genome is every
 * value the generator drew, after the row narrowed its template, so a consumer comparing two releases can tell a
 * re-rolled figure from one the same draws built differently: a seed alone names neither, since a change to the draw
 * order or a builder changes the figure under the same seed.
 * @param {MobRow} row
 * @param {Template} template
 * @param {{ readonly realized: Realized; readonly genome: Genome }} generated
 */
export function bakeActor(row, template, generated) {
  const emitClips = clipEmitters[template.bodyPlan];
  if (!emitClips) throw new Error(`unsupported actor body plan ${template.bodyPlan}`);
  for (const field of /** @type {const} */ (['glb', 'body', 'clips', 'genome']))
    if (typeof row[field] !== 'string' || !row[field]) throw new Error(`pose row requires ${field}`);
  const model = row.model ?? row.template;
  const figure = figureFor(generated, template, row.scale);
  const body = fileBody(
    actorBody(figure, template, {
      type: row.type ?? row.id,
      model,
      seed: row.seed,
      scale: row.scale,
      lookAt: row.lookAt ?? LOOK_AT_PROFILES[model],
    }),
  );
  const clips = fileClips(emitClips(figure, template, row));
  const fused = template.bodyPlan === 'fused-mass';
  const meshes = fused
    ? meshBones(generated.realized.voxels, body.bones.length, { perCell: true })
    : generated.realized.meshes;
  return {
    body: JSON.stringify(body),
    clips: JSON.stringify(clips),
    genome: JSON.stringify(generated.genome),
    glb: actorGlb({ ...row, fused }, generated.realized, meshes),
  };
}
