import { materialOf, shadeOf } from './packages/mobgen/src/core/voxelize.ts';
import { templatePartMassProperties } from './packages/mobgen/src/core/templateMass.ts';
import { CUT_FACE } from './packages/mobgen/src/mob/crowd.ts';
import { severedBoneSet } from './packages/mobgen/src/mob/dismember.ts';
import { pointBounds, SHADE_FACTORS } from './actorBake.mjs';
import { turnPoint, turnPointArray } from './actorFrame.mjs';
import { writeGlb } from './glb.mjs';

// The key the sheet's materials draw a part's cut face by, the face the body it came from leaves open.
export const CUT_MATERIAL = 'cut';

const shaded = (colour, byte) => colour.map((x) => Math.min(1, x * SHADE_FACTORS[shadeOf(byte)]));
const toCut = (colour) => colour.map((x, a) => x + (CUT_FACE.color[a] - x) * CUT_FACE.mix);

/**
 * One part's GLB: the faces of the cut subtree's bone meshes that face out of it, one primitive per catalogue material
 * the plan draws its mobgen materials and its cut face as, named by it so a consumer classes its wear as it does any
 * drawn model's. A face between two bones of
 * the subtree lies inside the part and is left out. Only a face on the cut bone's parent is the cut: another bone the
 * part merely touches, such as a hanging hand against a thigh, leaves skin there. The colours stay in the vertices, as
 * the actor's do, and the origin is the part's centre of mass.
 */
function partGlb(id, realized, subtree, parent, centre, materials) {
  const drawnAs = (name) => {
    if (!Object.hasOwn(materials, name)) throw new Error(`models/mobs.json severed: materials does not draw ${name}, a material of ${id}`);
    return materials[name];
  };
  const groups = new Map();
  for (const owner of subtree) {
    const mesh = realized.meshes.get(owner);
    if (mesh === undefined) continue;
    const positions = turnPointArray(mesh.positions);
    const normals = turnPointArray(mesh.normals);
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const corners = [mesh.indices[t], mesh.indices[t + 1], mesh.indices[t + 2]];
      const neighbour = mesh.neighbourBone[corners[0]];
      if (subtree.has(neighbour)) continue;
      const cut = neighbour === parent;
      const name = drawnAs(cut ? CUT_MATERIAL : materialOf(realized.voxels, mesh.colors[corners[0]]));
      if (!groups.has(name)) groups.set(name, { positions: [], normals: [], colours: [], indices: [], seen: new Map() });
      const group = groups.get(name);
      for (const corner of corners) {
        if (!group.seen.has(`${owner}:${corner}`)) {
          group.seen.set(`${owner}:${corner}`, group.colours.length / 3);
          for (let a = 0; a < 3; a++) {
            group.positions.push(positions[corner * 3 + a] - centre[a]);
            group.normals.push(normals[corner * 3 + a]);
          }
          const byte = mesh.colors[corner];
          const colour = shaded(realized.body.materials[materialOf(realized.voxels, byte)].color, byte);
          group.colours.push(...(cut ? toCut(colour) : colour));
        }
        group.indices.push(group.seen.get(`${owner}:${corner}`));
      }
    }
  }
  const names = [...groups.keys()].sort();
  const arrays = [];
  const accessors = [];
  const primitives = names.map((name, material) => {
    const group = groups.get(name);
    const first = arrays.length;
    const position = new Float32Array(group.positions);
    arrays.push(position, new Float32Array(group.normals), new Float32Array(group.colours), new Uint32Array(group.indices));
    const count = group.colours.length / 3;
    accessors.push(
      { bufferView: first, componentType: 5126, count, type: 'VEC3', ...pointBounds(position) },
      { bufferView: first + 1, componentType: 5126, count, type: 'VEC3' },
      { bufferView: first + 2, componentType: 5126, count, type: 'VEC3' },
      { bufferView: first + 3, componentType: 5125, count: group.indices.length, type: 'SCALAR' },
    );
    return { attributes: { POSITION: first, NORMAL: first + 1, COLOR_0: first + 2 }, indices: first + 3, material, mode: 4 };
  });
  return writeGlb({
    asset: { version: '2.0', generator: 'skelly-assets tools/mobs.mjs' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: id }],
    meshes: [{ primitives }],
    materials: names.map((name) => ({ name, pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 } })),
    accessors,
  }, arrays);
}

/**
 * A plan's files (tools/severedParts.mjs, severedPartPlan) from its source row's realized body and template: `cuts`,
 * each cut bone's model sidecar by bone, and one GLB per part under its id. A part is the cut bone with every bone
 * below it, as a cut takes them (mobgen's dismember.ts, severedBoneSet), and weighs its template's share of the body
 * mass for that bone (mobgen's templateMass.ts, templatePartMassProperties).
 */
export function bakeSeveredParts(plan, template, realized) {
  const { bones } = realized.body;
  const all = bones.map((_, index) => index);
  const files = {};
  const cuts = {};
  for (const part of plan.parts) {
    const cut = severedBoneSet(bones, [part.bone]);
    const subtree = all.filter((index) => cut.has(bones[index].id));
    const mass = templatePartMassProperties({ voxels: realized.voxels, partBoneIndices: subtree, bodyBoneIndices: all, voxelSize: realized.voxels.size, template, part: part.bone });
    const { parent: parentId } = bones.find((bone) => bone.id === part.bone);
    const parent = bones.findIndex((bone) => bone.id === parentId);
    files[part.id] = partGlb(part.id, realized, new Set(subtree), parent, turnPoint(mass.center), plan.materials);
    cuts[part.bone] = { id: part.id, file: part.path, parts: { [part.bone]: { massKg: mass.mass, centreOfMass: [0, 0, 0] } } };
  }
  return { cuts: JSON.stringify(cuts), ...files };
}
