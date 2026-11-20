// A doll's rig from its record's rig content (models/dolls/<id>/rig.libsonnet) and the built doll (tools/dress.mjs,
// `dollOf`): a bone per doll part copy in mobgen's bone shape (id, parent, head, tail, frame, limits, parents first),
// with a `bind` naming the part copy it moves, the model that draws it and where it rests in the bone's node, so
// site/kinematics.mjs poses the doll as it would pose a mob. Also the doll's rest meshes per bone, which the clearance
// probe (site/clearance.mjs) compares in a pose, the check that a worn piece encloses what it hides, and the export of
// each doll's rig for a game.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { COINCIDENT, coveredSurface, posedSolid, runAlong, signedDepth } from '../site/clearance.mjs';
import { hides } from '../site/hiding.mjs';
import {
  add,
  dot,
  frameAbout,
  IDENTITY_M,
  mat3ToQuat,
  mulMM,
  mulMV,
  quatToMat3,
  scale,
  sub,
  transpose,
} from '../site/kinematics.mjs';
import { dollDressings, modelMeshes, readDoll, readDressing } from './dress.mjs';
import { r4, unitQuat } from './keyFrames.mjs';
import { outputPath } from './layout.mjs';

const repo = resolve(import.meta.dirname, '..');

const AXES = ['flex', 'twist', 'abduct'];
const corners = ({ min, max }) =>
  [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [0, 1, 2].map((a) => ((i >> a) & 1 ? max[a] : min[a])));
const mirrorRange = ([min, max]) => [-max, -min];

// Parents before children, in the content's order otherwise; a missing parent or a cycle is refused.
function parentsFirst(bones) {
  const byId = new Map(bones.map((bone) => [bone.id, bone]));
  const placed = new Set();
  const visiting = new Set();
  const out = [];
  const place = (bone) => {
    if (placed.has(bone.id)) return;
    if (visiting.has(bone.id)) throw new Error(`rig: bone ${bone.id} hangs from itself through its parents`);
    visiting.add(bone.id);
    if (bone.parent !== null) {
      const parent = byId.get(bone.parent);
      if (!parent) throw new Error(`rig: bone ${bone.id} hangs from ${bone.parent}, which the rig has not`);
      place(parent);
    }
    placed.add(bone.id);
    out.push(bone);
  };
  bones.forEach(place);
  return out;
}

function checkLimits(name, limits) {
  for (const axis of AXES) {
    const range = limits?.[axis];
    if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite) || range[0] > range[1]) {
      throw new Error(`rig: bone ${name} needs ${axis} limits [min, max] in degrees, min no more than max`);
    }
  }
}

// Whether a joint axis lies in the doll's mirror plane (x = 0) or runs along x; a copy mirrored across x turns the
// opposite way about an in-plane axis and the same way about x, so a limit range mirrors with the former and keeps
// with the latter. Any other axis has no mirrored twin on the same frame and is refused.
const inMirrorPlane = (axis, name) => {
  const [x, y, z] = axis;
  if (Math.abs(x) < 1e-9) return true;
  if (Math.hypot(y, z) < 1e-9) return false;
  throw new Error(
    `rig: bone ${name} has a joint axis ${axis.map((a) => a.toFixed(3)).join(',')} neither along x nor square to it, so its mirrored copy cannot share its limits`,
  );
};

// The rest rotation of a bone's node on a side, a quaternion [x, y, z, w] of the node's axes in the model's, which the
// bone's content states for every side or each (models/dolls/player/rig.libsonnet, `nodeRotation`).
function nodeRotationOf(name, { nodeRotation }, side) {
  const rotation = Array.isArray(nodeRotation) ? nodeRotation : nodeRotation?.[side];
  if (rotation?.length !== 4 || !rotation.every(Number.isFinite))
    throw new Error(`rig: bone ${name} needs a nodeRotation [x, y, z, w] for the ${side}`);
  return rotation;
}

// The bone a bone hangs from on a side: one named for every side, the sided one taking the side's suffix, or one per
// side, as a limb hangs from a paired bust part that is a bone of its own on each side (models/dolls/ual/rig.libsonnet).
function parentOf(name, { parent }, side, sided) {
  if (parent === null) return null;
  if (typeof parent === 'string') return sided(parent, side);
  if (typeof parent?.[side] !== 'string') throw new Error(`rig: bone ${name} hangs from no bone on the ${side}`);
  return parent[side];
}

/**
 * Where a part copy's own model frame sits in its bone's node frame at rest, so a consumer seats a piece drawn in the
 * part's frame on the bone's node with this one constant: a point `q` of the part's model lands at
 * `rotation * (scale * q) + translation` in the node. The node frame is the one a game's joint node has and a clip
 * turns: origin at the bone's head, axes `nodeRotation`. It is not the bone's `frame`, the joint-limit frame the angles
 * of a pose are read in. `rotation` is the node's rest rotation inverted, a quaternion [x, y, z, w], so the offset is
 * general for a node turned off the model's axes. A rotation alone cannot mirror, so a mirrored copy's reflection is the
 * `scale` [-1, 1, 1], applied to the part's own coordinates before the rotation, as the copy is drawn mirrored in the
 * part's frame; an unmirrored copy's is [1, 1, 1]. A copy turned at its site (tools/dress.mjs, `turn`) is turned after
 * that reflection, so the rotation is the node's inverse after the turn. Values are rounded as a held seat's are.
 */
export function restOffset({ at, mirror, turn }, head, nodeRotation) {
  const back = transpose(quatToMat3(nodeRotation));
  const seat = turn ? mulMM(back, quatToMat3(turn)) : back;
  return {
    translation: r4(mulMV(back, sub(at, head))),
    rotation: unitQuat(r4(mat3ToQuat(seat))),
    scale: [mirror ? -1 : 1, 1, 1],
  };
}

// How far a doll measured off a skeleton may seat a part or turn a node from the skeleton's rest: its rounding. The
// derivation is exact, so a miss is a bug, which half a voxel would hide.
const SKELETON_TOLERANCE = 1e-4;

/**
 * Each bone's node at rest in the model frame, from a skeleton's local rotations (models/dolls/ual/skeleton.json), its
 * root's included: the skeleton's heads are in the frame its root turns upright.
 * @param {Readonly<Record<string, { parent: string | null; rotation: number[] }>>} skeleton
 */
function skeletonRotations(skeleton) {
  const world = new Map();
  const of = (name) => {
    if (!world.has(name)) {
      const { parent, rotation } = skeleton[name];
      const local = quatToMat3(rotation);
      world.set(name, parent === null ? local : mulMM(of(parent), local));
    }
    return world.get(name);
  };
  return of;
}

// A doll measured off a skeleton (its rig content's `skeleton`) seats each part copy's origin on its bone's head there,
// and rests each node turned as the skeleton's is, so a game playing the skeleton's clips moves the doll's parts with
// the joints they were measured from. Rotations are compared as matrices, which a quaternion's sign does not change.
export function checkSkeleton(bones, skeleton) {
  const rotationOf = skeletonRotations(skeleton);
  for (const { id, at, nodeRotation } of bones) {
    if (!skeleton[id]) throw new Error(`rig: bone ${id} is no bone of the skeleton it is measured off`);
    const miss = Math.hypot(...sub(at, skeleton[id].head));
    if (miss > SKELETON_TOLERANCE)
      throw new Error(`rig: ${id}'s part lies ${miss.toFixed(5)} m from the skeleton's head, ${skeleton[id].head}`);
    const want = rotationOf(id);
    const given = quatToMat3(nodeRotation);
    if (want.some((c, i) => Math.abs(c - given[i]) > SKELETON_TOLERANCE))
      throw new Error(`rig: ${id}'s node rests turned ${nodeRotation}, not ${mat3ToQuat(want)} as the skeleton's`);
  }
}

// Each bone of the content, once per side when sided, bound to its part copy in the doll. A bone's `along` and
// `flexAxis` are written in its part's own frame, which the copy's mirror and site turn carry into the doll's, so a
// limb rested off the way its model hangs has the same content on each side. `along` is a direction in the part, so a
// mirrored copy's is mirrored; `flexAxis` is an axis of rotation, which a mirror does not flip across x, so it is
// kept and turned alone, and the `sense` below tells the two sides' angles apart. A sided bone off the reference side
// mirrors the limits of its in-plane joint axes and its reach pole across x, and carries the `sense` each angle takes
// there, 1 or -1 per axis, so a pose written for the reference side is mirrored by multiplying. Whether an axis is in
// the mirror plane is asked of the axis as written in the part, since the two sides' turns are mirror images: the same
// axis, turned by each side's own turn, lands on mirror images of each other.
export function dollRig(doll, dressing) {
  const { sides, rig: content, boneSuffix } = dressing;
  if (!sides.includes(content.reference))
    throw new Error(`rig: limits are written for the ${content.reference}, which the doll has no side of`);
  const sided = (id, side) => (content.bones[id]?.sided ? `${id}${boneSuffix[side]}` : id);
  const bones = [];
  for (const [name, spec] of Object.entries(content.bones)) {
    checkLimits(name, spec.limits);
    for (const side of spec.sided ? sides : ['centre']) {
      const copy = doll.parts.get(spec.part)?.find((c) => c.side === side);
      if (!copy) throw new Error(`rig: the doll has no ${spec.part} on the ${side}`);
      const head = spec.pivot === 'origin' ? copy.at : doll.anchors[spec.pivot?.anchor];
      if (!head) throw new Error(`rig: no pivot for ${name}: ${JSON.stringify(spec.pivot)}`);
      const mirrored = spec.sided && side !== content.reference;
      const flexInPart = spec.flexAxis ?? [1, 0, 0];
      const axes = frameAbout([0, 0, 0], spec.along, flexInPart);
      const turning = copy.turn && quatToMat3(copy.turn);
      const intoDoll = (axis) => (turning ? mulMV(turning, axis) : axis);
      const along = intoDoll(copy.mirror ? [-spec.along[0], spec.along[1], spec.along[2]] : spec.along);
      const flexAxis = intoDoll(flexInPart);
      const sense = ['x', 'y', 'z'].map((axis) => (mirrored && inMirrorPlane(axes[axis], name) ? -1 : 1));
      const limits = Object.fromEntries(
        AXES.map((axis, i) => [axis, sense[i] < 0 ? mirrorRange(spec.limits[axis]) : spec.limits[axis]]),
      );
      bones.push({
        id: sided(name, side),
        parent: parentOf(name, spec, side, sided),
        head,
        along,
        flexAxis,
        limits,
        sense,
        nodeRotation: nodeRotationOf(name, spec, side),
        bind: {
          model: doll.sites[copy.site].model,
          part: spec.part,
          side,
          site: copy.site,
          box: copy.box,
          mirror: Boolean(copy.mirror),
          ...(copy.turn ? { turn: copy.turn } : {}),
        },
        at: copy.at,
        ...(spec.reach
          ? { pole: mirrored ? [-spec.reach.pole[0], spec.reach.pole[1], spec.reach.pole[2]] : spec.reach.pole }
          : {}),
        ...(spec.digit ? { digit: spec.digit } : {}),
        ...(spec.spread !== undefined ? { spread: spec.spread } : {}),
        ...(spec.absorbs ? { absorbs: spec.absorbs } : {}),
        ...(spec.pronates ? { pronates: true } : {}),
        ...(spec.grip !== undefined ? { grip: spec.grip } : {}),
        ...(spec.gripSlant !== undefined ? { gripSlant: spec.gripSlant } : {}),
      });
    }
  }
  const ordered = parentsFirst(bones);
  if (content.skeleton) checkSkeleton(ordered, content.skeleton);
  const byId = new Map(ordered.map((bone) => [bone.id, bone]));
  const children = new Map(ordered.map((bone) => [bone.id, ordered.filter((other) => other.parent === bone.id)]));
  return {
    id: content.id,
    revision: content.revision,
    frame: 'model',
    root: content.root,
    clips: content.clips,
    eye: content.eye,
    presets: content.presets ?? {},
    bones: ordered.map(({ along, flexAxis, pole, at, nodeRotation, ...bone }) => {
      // A bone with one child ends at that child's joint; otherwise it runs along its rest direction to its part's far face.
      const own = children.get(bone.id);
      const reach = Math.max(...corners(bone.bind.box).map((corner) => dot(sub(corner, bone.head), along)));
      const tail = own.length === 1 ? own[0].head : add(bone.head, scale(along, reach));
      const reaching = pole && { reach: { chain: [byId.get(bone.parent)?.parent, bone.parent], pole } };
      if (reaching && !reaching.reach.chain.every(Boolean))
        throw new Error(`rig: ${bone.id} reaches by two-bone IK, so it needs a parent and a grandparent`);
      const frame = frameAbout(bone.head, tail, flexAxis);
      const rest = restOffset({ at, mirror: bone.bind.mirror, turn: bone.bind.turn }, bone.head, nodeRotation);
      return { ...bone, node: { rotation: nodeRotation }, bind: { ...bone.bind, rest }, tail, frame, ...reaching };
    }),
  };
}

// ---- rest meshes ----

const STILL = { r: IDENTITY_M, t: [0, 0, 0] };
const mirrorX = (positions) => positions.map((x, i) => (i % 3 === 0 ? -x : x));
const turnedBy = (turn, positions) => {
  const r = quatToMat3(turn);
  const out = [];
  for (let i = 0; i < positions.length; i += 3) out.push(...mulMV(r, positions.slice(i, i + 3)));
  return out;
};
// A mesh in its model frame placed as a site places it: mirrored, then turned, then moved.
const placed = (mesh, { at, mirror, turn }) => {
  const flipped = mirror ? mirrorX(mesh.positions) : mesh.positions;
  const turned = turn ? turnedBy(turn, flipped) : flipped;
  return { positions: turned.map((x, i) => x + at[i % 3]), indices: mesh.indices, pieces: mesh.pieces };
};
const wholeModel = (meshes) => {
  const positions = [],
    indices = [];
  for (const mesh of meshes) {
    const base = positions.length / 3;
    positions.push(...mesh.positions);
    indices.push(...mesh.indices.map((i) => base + i));
  }
  return { positions, indices };
};

/**
 * The doll's meshes at rest in the doll frame, as the clearance probe takes them: `body`, each bone's part copy, and
 * `pieces`, each worn piece site (tools/dress.mjs, `wornSites`) with the bone of the part copy it is drawn in. `meshesOf`
 * gives a model's part meshes (tools/dress.mjs, `modelMeshes`). A site no bone carries, such as a wearable placed whole,
 * has no part to ride and is left out.
 */
export function restMeshes(rig, sites, meshesOf) {
  const body = rig.bones.map((bone) => {
    const site = sites[bone.bind.site];
    const mesh = meshesOf(site.model).find(({ part }) => part === bone.bind.part);
    if (!mesh) throw new Error(`rig: ${site.model} has no part ${bone.bind.part} for ${bone.id}`);
    return { bone: bone.id, part: bone.bind.part, mesh: placed(mesh, site) };
  });
  const pieces = sites
    .filter((site) => site.part !== undefined)
    .map((site) => ({
      piece: site.model,
      bone: boneOf(rig, site).id,
      covers: site.covers,
      mesh: placed(wholeModel(meshesOf(site.model)), site),
    }));
  return { body, pieces };
}

const boneOf = (rig, { model, part, side }) => {
  const bone = rig.bones.find(({ bind }) => bind.part === part && bind.side === side);
  if (!bone) throw new Error(`rig: no bone moves the ${side} ${part} that ${model} is drawn in`);
  return bone;
};

/**
 * What a wearable's worn pieces would open to view by hiding it: for each piece site of `sites` (tools/dress.mjs,
 * `wornSites`) and each name it covers (site/hiding.mjs), { piece, side, name, open, at } when `open` of the named
 * surface's samples, the first at `at`, are not wholly covered at rest by the wearable's pieces drawn on the same doll
 * part copy, or { piece, side, name, open: 'nothing' } when the name hides nothing of the copy. Only the pieces riding
 * that copy count, since only they move with it in every pose. `meshesOf(id, keep?)` gives a model's part meshes
 * (tools/dress.mjs, `modelMeshes`) of the primitives `keep(part, piece)` picks.
 */
export function coverGaps(rig, sites, meshesOf) {
  return declaredSurfaces(rig, sites, meshesOf).flatMap(({ declaration, samples }) => {
    if (!samples) return [{ ...declaration, open: 'nothing' }];
    const open = samples.filter(({ whole }) => !whole);
    return open.length === 0 ? [] : [{ ...declaration, open: open.length, at: open[0].point }];
  });
}

/**
 * How near each declaration of `sites` comes to failing `coverGaps`: { piece, side, name, samples, open, beneath,
 * margin, at, end, endAt }. A sample of the named surface lies `depth` beneath the riding pieces: how far it could move
 * out along its face's normal and stay enclosed, so a body change that swells that skin by more, or a shell change that
 * draws in by more, opens it; zero where it lies flush, and negative, by how far it stands proud of every piece, where
 * it passes only because a piece runs beneath it (site/clearance.mjs, `coverage`), as a yoke beneath a deltoid.
 * `margin` and `at` are the least depth among the samples facing across the bone and where it is; `end` and `endAt`
 * the same along the bone, where a piece cut as its part ends meets the part's end face flush, so a longer part opens
 * it. `beneath` counts the samples that pass beneath alone, `open` those that fail. A declaration that names nothing of
 * its copy has samples 0.
 */
export function coverMargins(rig, sites, meshesOf) {
  return declaredSurfaces(rig, sites, meshesOf).map(({ declaration, samples, pieces, bone }) => {
    if (!samples)
      return {
        ...declaration,
        samples: 0,
        open: 0,
        beneath: 0,
        margin: -Infinity,
        at: null,
        end: -Infinity,
        endAt: null,
      };
    const solids = pieces.map(({ mesh }) => posedSolid(mesh, STILL));
    const depth = (point, normal) =>
      Math.max(
        ...solids.map((solid) => {
          const inside = -signedDepth(solid, point);
          return inside > COINCIDENT ? runAlong(solid, point, normal) : inside;
        }),
      );
    const axis = sub(bone.tail, bone.head);
    const least = { across: { depth: Infinity, at: null }, along: { depth: Infinity, at: null } };
    let beneath = 0;
    for (const { point, normal, whole } of samples) {
      const d = depth(point, normal);
      if (whole && d < -COINCIDENT) beneath++;
      // Across or along the bone as the probe tells them apart (site/clearance.mjs, `coverage`).
      const facing = Math.abs(dot(normal, axis)) >= Math.SQRT1_2 * Math.hypot(...axis) ? least.along : least.across;
      if (d < facing.depth) Object.assign(facing, { depth: d, at: point });
    }
    return {
      ...declaration,
      samples: samples.length,
      open: samples.filter(({ whole }) => !whole).length,
      beneath,
      margin: least.across.depth,
      at: least.across.at,
      end: least.along.depth,
      endAt: least.along.at,
    };
  });
}

// Each declaration of `sites`' worn pieces, { declaration: { piece, side, name }, samples, pieces, bone }: the samples of the
// doll surface it names on its part copy, with whether each is wholly covered (site/clearance.mjs, `coveredSurface`), or
// none when the name hides nothing of the copy, and the pieces riding that copy, which alone count since only they move
// with it in every pose, and the bone that moves the copy.
function declaredSurfaces(rig, sites, meshesOf) {
  const riding = (site) => sites.filter((other) => other.part === site.part && other.side === site.side);
  return sites
    .filter(({ covers }) => covers)
    .flatMap((site) => {
      const bone = boneOf(rig, site);
      const doll = sites[site.bodySite];
      const pieces = riding(site).map((other) => ({
        piece: other.model,
        bone: bone.id,
        covers: other.covers,
        mesh: placed(wholeModel(meshesOf(other.model)), other),
      }));
      return site.covers.map((name) => {
        const [hidden] = meshesOf(doll.model, (part, piece) => part === site.part && hides([name], part, piece));
        const declaration = { piece: site.model, side: site.side, name };
        if (!hidden) return { declaration, samples: null, pieces, bone };
        const [{ samples }] = coveredSurface(
          rig,
          { body: [{ bone: bone.id, part: site.part, mesh: placed(hidden, doll) }], pieces },
          { whole: true },
        );
        return { declaration, samples, pieces, bone };
      });
    });
}

// What the rig holds for authoring poses, not for playing clips: the pose page's clips, the eye a look aims, the hand
// presets a pose file names.
const AUTHORING = new Set(['clips', 'eye', 'presets']);

/**
 * Writes each doll's rig into the built tree `out`, whose models `manifest` lists, for a game to pose it by: the rig a
 * clip's frames turn, with each part's site on it, at its record's path under its pack. Returns the files written,
 * under their packs, and the manifest's `dolls` entries (tools/manifest.mjs).
 * @param {string} out
 * @param {Parameters<typeof readDoll>[1]} manifest
 */
export function exportDollRigs(out, manifest, root = repo) {
  const written = dollDressings(readDressing(root)).map((dressing) => {
    const doll = readDoll(out, manifest, dressing);
    const posing = Object.entries(dollRig(doll, dressing)).filter(([key]) => !AUTHORING.has(key));
    const models = {
      bust: dressing.bust,
      ...Object.fromEntries(dressing.limbs.map(({ name, model }) => [name, model])),
    };
    return {
      file: outputPath(dressing.pack, dressing.rigPath),
      content: { ...Object.fromEntries(posing), doll: doll.sites },
      entry: { id: dressing.id, pack: dressing.pack, rig: dressing.rigPath, models },
    };
  });
  for (const { file, content } of written) {
    mkdirSync(dirname(join(out, file)), { recursive: true });
    writeFileSync(join(out, file), `${JSON.stringify(content)}\n`);
  }
  return { files: written.map(({ file }) => file), dolls: written.map(({ entry }) => entry) };
}

// A built tree's part meshes by model id, read once each.
export function treeMeshes(built, manifest) {
  const cache = new Map();
  return (id) => {
    if (!cache.has(id)) {
      const entry = manifest.models.find((model) => model.id === id && model.path.endsWith('.glb'));
      if (!entry) throw new Error(`the built tree holds no ${id}`);
      cache.set(id, modelMeshes(readFileSync(join(built, entry.pack, entry.path))));
    }
    return cache.get(id);
  };
}
