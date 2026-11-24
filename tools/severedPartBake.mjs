// @ts-check
/** @import { SeveredPlan } from './severedParts.mjs' */
/** @import { Realized } from './packages/mobgen/src/core/generate.ts' */
/** @import { Vec3 } from './packages/mobgen/src/core/math.ts' */
/** @import { Template } from './packages/mobgen/src/core/template.ts' */
import { pointBounds, SHADE_FACTORS } from './actorBake.mjs';
import { turnPoint, turnPointArray } from './actorFrame.mjs';
import { writeGlb } from './glb.mjs';
import { AXES, perAxis } from './packages/construct/src/foundation/math.ts';
import { templatePartMassProperties } from './packages/mobgen/src/core/templateMass.ts';
import { materialOf, shadeOf } from './packages/mobgen/src/core/voxelize.ts';
import { CUT_FACE } from './packages/mobgen/src/mob/crowd.ts';
import { severedBoneSet } from './packages/mobgen/src/mob/dismember.ts';

// The key the sheet's materials draw a part's cut face by, the face the body it came from leaves open.
export const CUT_MATERIAL = 'cut';

/**
 * @template Item
 * @param {ArrayLike<Item>} list
 * @param {number} index
 * @param {string} what
 */
const itemAt = (list, index, what) => {
  const item = list[index];
  if (item === undefined) throw new Error(`severed part mesh: no ${what} at ${index}`);
  return item;
};

/**
 * @param {Vec3} colour
 * @param {number} byte
 * @returns {Vec3}
 */
const shaded = (colour, byte) => {
  const shade = itemAt(SHADE_FACTORS, shadeOf(byte), 'shade');
  return perAxis((a) => Math.min(1, colour[a] * shade));
};
/**
 * @param {Vec3} colour
 * @returns {Vec3}
 */
const toCut = (colour) => perAxis((a) => colour[a] + (CUT_FACE.color[a] - colour[a]) * CUT_FACE.mix);

/**
 * One part's GLB: the faces of the part's bone meshes that face out of it, one primitive per catalogue material the
 * plan draws its mobgen materials and its cut faces as, named by it so a consumer classes its wear as it does any drawn
 * model's. A face between two bones of the part lies inside it and is left out. Only a face on the cut bone's parent,
 * or on a bone already cut away below, is a cut: another bone the part merely touches, such as a hanging hand against a
 * thigh, leaves skin there. The colours stay in the vertices, as the actor's do, and the origin is the part's centre of
 * mass.
 * @param {string} id
 * @param {Pick<Realized, 'meshes' | 'voxels' | 'body'>} realized
 * @param {ReadonlySet<number>} subtree
 * @param {ReadonlySet<number>} stumps
 * @param {Vec3} centre
 * @param {Readonly<Record<string, string>>} materials
 */
function partGlb(id, realized, subtree, stumps, centre, materials) {
  /** @param {string} name */
  const drawnAs = (name) => {
    const drawn = Object.hasOwn(materials, name) ? materials[name] : undefined;
    if (drawn === undefined)
      throw new Error(`models/mobs.json severed: materials does not draw ${name}, a material of ${id}`);
    return drawn;
  };
  /** @typedef {{ positions: number[]; normals: number[]; colours: number[]; indices: number[]; seen: Map<string, number> }} Group */
  /** @type {Map<string, Group>} */
  const groups = new Map();
  for (const owner of subtree) {
    const mesh = realized.meshes.get(owner);
    if (mesh === undefined) continue;
    const positions = turnPointArray(mesh.positions);
    const normals = turnPointArray(mesh.normals);
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const first = itemAt(mesh.indices, t, 'index');
      const corners = [first, itemAt(mesh.indices, t + 1, 'index'), itemAt(mesh.indices, t + 2, 'index')];
      const neighbour = itemAt(mesh.neighbourBone, first, 'neighbour bone');
      if (subtree.has(neighbour)) continue;
      const cut = stumps.has(neighbour);
      const name = drawnAs(cut ? CUT_MATERIAL : materialOf(realized.voxels, itemAt(mesh.colors, first, 'colour')));
      let group = groups.get(name);
      if (!group) {
        group = { positions: [], normals: [], colours: [], indices: [], seen: new Map() };
        groups.set(name, group);
      }
      for (const corner of corners) {
        let vertex = group.seen.get(`${owner}:${corner}`);
        if (vertex === undefined) {
          vertex = group.colours.length / 3;
          group.seen.set(`${owner}:${corner}`, vertex);
          for (const a of AXES) {
            group.positions.push(itemAt(positions, corner * 3 + a, 'position') - centre[a]);
            group.normals.push(itemAt(normals, corner * 3 + a, 'normal'));
          }
          const byte = itemAt(mesh.colors, corner, 'colour');
          const material = materialOf(realized.voxels, byte);
          const drawn = realized.body.materials[material];
          if (!drawn) throw new Error(`severed part mesh: the body has no material ${material}`);
          const colour = shaded(drawn.color, byte);
          group.colours.push(...(cut ? toCut(colour) : colour));
        }
        group.indices.push(vertex);
      }
    }
  }
  const drawn = [...groups].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const names = drawn.map(([name]) => name);
  /** @type {ArrayBufferView[]} */
  const arrays = [];
  /** @type {object[]} */
  const accessors = [];
  const primitives = drawn.map(([, group], material) => {
    const first = arrays.length;
    const position = new Float32Array(group.positions);
    arrays.push(
      position,
      new Float32Array(group.normals),
      new Float32Array(group.colours),
      new Uint32Array(group.indices),
    );
    const count = group.colours.length / 3;
    accessors.push(
      { bufferView: first, componentType: 5126, count, type: 'VEC3', ...pointBounds(position) },
      { bufferView: first + 1, componentType: 5126, count, type: 'VEC3' },
      { bufferView: first + 2, componentType: 5126, count, type: 'VEC3' },
      { bufferView: first + 3, componentType: 5125, count: group.indices.length, type: 'SCALAR' },
    );
    return {
      attributes: { POSITION: first, NORMAL: first + 1, COLOR_0: first + 2 },
      indices: first + 3,
      material,
      mode: 4,
    };
  });
  return writeGlb(
    {
      asset: { version: '2.0', generator: 'skelly-assets tools/mobs.mjs' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, name: id }],
      meshes: [{ primitives }],
      materials: names.map((name) => ({
        name,
        pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 },
      })),
      accessors,
    },
    arrays,
  );
}

/**
 * A plan's files (tools/severedParts.mjs, severedPartPlan) from its source row's realized body and template: `cuts`,
 * each cut bone's parts by bone, each with the cut points below already gone and its model sidecar, and one GLB per
 * part under its id. A part is the cut bone with every bone below it, as a cut takes them (mobgen's dismember.ts,
 * severedBoneSet), less the bones already cut away, and weighs its template's share of the body mass for that bone
 * less the shares already gone (mobgen's templateMass.ts, templatePartMassProperties).
 * @param {Pick<SeveredPlan, 'parts' | 'materials'>} plan
 * @param {Template} template
 * @param {Pick<Realized, 'meshes' | 'voxels' | 'body'>} realized
 * @returns {{ cuts: string } & Record<string, string | Uint8Array>}
 */
export function bakeSeveredParts(plan, template, realized) {
  const { bones } = realized.body;
  const all = bones.map((_, index) => index);
  /** @param {ReadonlySet<string>} cut */
  const indicesOf = (cut) => bones.flatMap((bone, index) => (cut.has(bone.id) ? [index] : []));
  /** @type {Record<string, Uint8Array>} */
  const files = {};
  /** @type {Record<string, object[]>} */
  const cuts = {};
  for (const part of plan.parts) {
    const whole = indicesOf(severedBoneSet(bones, [part.bone]));
    const gone = part.without.map((below) => ({ part: below, boneIndices: indicesOf(severedBoneSet(bones, [below])) }));
    const goneBones = new Set(gone.flatMap(({ boneIndices }) => boneIndices));
    const subtree = whole.filter((index) => !goneBones.has(index));
    const mass = templatePartMassProperties({
      voxels: realized.voxels,
      partBoneIndices: whole,
      bodyBoneIndices: all,
      voxelSize: realized.voxels.size,
      template,
      part: part.bone,
      without: gone,
    });
    const cutBone = bones.find((bone) => bone.id === part.bone);
    if (!cutBone) throw new Error(`severed part ${part.id} is cut at ${part.bone}, a bone its body lacks`);
    const { parent } = cutBone;
    const stumps = new Set([
      bones.findIndex((bone) => bone.id === parent),
      ...part.without.map((below) => bones.findIndex((bone) => bone.id === below)),
    ]);
    files[part.id] = partGlb(part.id, realized, new Set(subtree), stumps, turnPoint(mass.center), plan.materials);
    const cutsHere = cuts[part.bone] ?? [];
    cuts[part.bone] = cutsHere;
    cutsHere.push({
      without: part.without,
      model: { id: part.id, file: part.path, parts: { [part.bone]: { massKg: mass.mass, centreOfMass: [0, 0, 0] } } },
    });
  }
  return { cuts: JSON.stringify(cuts), ...files };
}
