// The doll's rig from models/poses/rig.libsonnet and the built doll (tools/dress.mjs, `dollOf`): a bone per doll part
// copy in mobgen's bone shape (id, parent, head, tail, frame, limits, parents first), with a `bind` naming the part copy
// it moves, so site/kinematics.mjs poses the doll as it would pose a mob. Also the doll's rest meshes per bone, which
// the clearance probe (site/clearance.mjs) compares in a pose.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { add, dot, frameAbout, scale, sub } from '../site/kinematics.mjs';
import { modelMeshes } from './dress.mjs';
import { evaluateJsonnet } from './jsonnet/index.mjs';

const repo = resolve(import.meta.dirname, '..');

export const readRigContent = (root = repo) => JSON.parse(evaluateJsonnet("import 'models/poses/rig.libsonnet'", root));

const SUFFIX = { right: 'R', left: 'L' };
const AXES = ['flex', 'twist', 'abduct'];
const corners = ({ min, max }) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [0, 1, 2].map((a) => ((i >> a) & 1 ? max[a] : min[a])));
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
  throw new Error(`rig: bone ${name} has a joint axis ${axis.map((a) => a.toFixed(3)).join(',')} neither along x nor square to it, so its mirrored copy cannot share its limits`);
};

// Each bone of the content, once per side when sided, bound to its part copy in the doll. A sided bone off the
// reference side mirrors the limits of its in-plane joint axes and its reach pole across x, and carries the `sense`
// each angle takes there, 1 or -1 per axis, so a pose written for the reference side is mirrored by multiplying.
export function dollRig(content, doll, dressing) {
  const { sides } = dressing.doll;
  if (!sides.includes(content.reference)) throw new Error(`rig: limits are written for the ${content.reference}, which the doll has no side of`);
  const sided = (id, side) => (content.bones[id]?.sided ? `${id}.${SUFFIX[side]}` : id);
  const bones = [];
  for (const [name, spec] of Object.entries(content.bones)) {
    checkLimits(name, spec.limits);
    for (const side of spec.sided ? sides : ['centre']) {
      const copy = doll.parts.get(spec.part)?.find((c) => c.side === side);
      if (!copy) throw new Error(`rig: the doll has no ${spec.part} on the ${side}`);
      const head = spec.pivot === 'origin' ? copy.at : doll.anchors[spec.pivot?.anchor];
      if (!head) throw new Error(`rig: no pivot for ${name}: ${JSON.stringify(spec.pivot)}`);
      const mirrored = spec.sided && side !== content.reference;
      const flexAxis = spec.flexAxis ?? [1, 0, 0];
      const axes = frameAbout([0, 0, 0], spec.along, flexAxis);
      const sense = ['x', 'y', 'z'].map((axis) => (mirrored && inMirrorPlane(axes[axis], name) ? -1 : 1));
      const limits = Object.fromEntries(AXES.map((axis, i) => [axis, sense[i] < 0 ? mirrorRange(spec.limits[axis]) : spec.limits[axis]]));
      bones.push({
        id: sided(name, side),
        parent: spec.parent === null ? null : sided(spec.parent, side),
        head,
        along: spec.along,
        flexAxis,
        limits,
        sense,
        bind: { model: spec.model, part: spec.part, side, site: copy.site, box: copy.box, mirror: Boolean(copy.mirror) },
        ...(spec.reach ? { pole: mirrored ? [-spec.reach.pole[0], spec.reach.pole[1], spec.reach.pole[2]] : spec.reach.pole } : {}),
        ...(spec.digit ? { digit: spec.digit } : {}),
        ...(spec.spread !== undefined ? { spread: spec.spread } : {}),
        ...(spec.absorbs ? { absorbs: spec.absorbs } : {}),
        ...(spec.pronates ? { pronates: true } : {}),
      });
    }
  }
  const ordered = parentsFirst(bones);
  const byId = new Map(ordered.map((bone) => [bone.id, bone]));
  const children = new Map(ordered.map((bone) => [bone.id, ordered.filter((other) => other.parent === bone.id)]));
  return {
    id: content.id,
    revision: content.revision,
    frame: 'model',
    root: content.root,
    clips: content.clips,
    clearance: content.clearance,
    presets: content.presets ?? {},
    bones: ordered.map(({ along, flexAxis, pole, ...bone }) => {
      // A bone with one child ends at that child's joint; otherwise it runs along its rest direction to its part's far face.
      const own = children.get(bone.id);
      const reach = Math.max(...corners(bone.bind.box).map((corner) => dot(sub(corner, bone.head), along)));
      const tail = own.length === 1 ? own[0].head : add(bone.head, scale(along, reach));
      const reaching = pole && { reach: { chain: [byId.get(bone.parent)?.parent, bone.parent], pole } };
      if (reaching && !reaching.reach.chain.every(Boolean)) throw new Error(`rig: ${bone.id} reaches by two-bone IK, so it needs a parent and a grandparent`);
      return { ...bone, tail, frame: frameAbout(bone.head, tail, flexAxis), ...reaching };
    }),
  };
}

// ---- rest meshes ----

const mirrorX = (positions) => positions.map((x, i) => (i % 3 === 0 ? -x : x));
const placed = (mesh, { at, mirror }) => {
  const flipped = mirror ? mirrorX(mesh.positions) : mesh.positions;
  return { positions: flipped.map((x, i) => x + at[i % 3]), indices: mesh.indices };
};
const wholeModel = (meshes) => {
  const positions = [], indices = [];
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
    return { bone: bone.id, mesh: placed(mesh, site) };
  });
  const pieces = sites.filter((site) => site.part !== undefined).map((site) => {
    const bone = rig.bones.find(({ bind }) => bind.part === site.part && bind.side === site.side);
    if (!bone) throw new Error(`rig: no bone moves the ${site.side} ${site.part} that ${site.model} is drawn in`);
    return { piece: site.model, bone: bone.id, mesh: placed(wholeModel(meshesOf(site.model)), site) };
  });
  return { body, pieces };
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
