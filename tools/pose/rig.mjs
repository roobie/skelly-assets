// The doll's rig from the built doll and models/poses/rig.libsonnet: a bone per doll part, in mobgen's bone shape
// (head, tail, frame, limits, parents first) with a `bind` naming the part copy it moves, so site/kinematics.mjs
// poses the doll as it would pose a mob and the showcase (site/pose.mjs) knows which site each bone carries.
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { frameAbout, add, dot, scale, sub } from '../../site/kinematics.mjs';

export const readRigContent = (root) => JSON.parse(evaluateJsonnet("import 'models/poses/rig.libsonnet'", root));

const SUFFIX = { right: 'R', left: 'L' };
const corners = ({ min, max }) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [0, 1, 2].map((a) => ((i >> a) & 1 ? max[a] : min[a])));

// Parents before children, in the content's order otherwise.
function parentsFirst(bones) {
  const byId = new Map(bones.map((bone) => [bone.id, bone]));
  const placed = new Set();
  const out = [];
  const place = (bone) => {
    if (placed.has(bone.id)) return;
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

// Each bone of the content, once per side when sided, bound to its part copy in the doll (tools/dress.mjs, `dollOf`).
export function dollRig(content, doll, dressing) {
  const { sides, mirrored } = dressing.doll;
  if (!sides.includes(content.reference)) throw new Error(`rig: limits are written for the ${content.reference}, which the doll has no side of`);
  const sided = (id, side) => (content.bones[id]?.sided ? `${id}.${SUFFIX[side]}` : id);
  const bones = [];
  for (const [name, spec] of Object.entries(content.bones)) {
    for (const side of spec.sided ? sides : ['centre']) {
      const copy = doll.parts.get(spec.part)?.find((c) => c.side === side);
      if (!copy) throw new Error(`rig: the doll has no ${spec.part} on the ${side}`);
      const head = spec.pivot === 'origin' ? copy.at : doll.anchors[spec.pivot.anchor];
      if (!head) throw new Error(`rig: no pivot for ${name}: ${JSON.stringify(spec.pivot)}`);
      const mirror = side === mirrored;
      const flip = (range) => (side === content.reference ? range : [-range[1], -range[0]]);
      bones.push({
        id: sided(name, side),
        parent: spec.parent === null ? null : sided(spec.parent, side),
        head,
        along: spec.along,
        flexAxis: spec.flexAxis ?? [1, 0, 0],
        limits: { flex: spec.limits.flex, twist: flip(spec.limits.twist), abduct: flip(spec.limits.abduct) },
        bind: { model: spec.model, part: spec.part, side, at: copy.at, box: copy.box, ...(mirror ? { mirror } : {}) },
      });
    }
  }
  const ordered = parentsFirst(bones);
  // A bone with one child ends at that child's joint; otherwise it runs along its rest direction to its part's far face.
  const children = new Map(ordered.map((bone) => [bone.id, ordered.filter((other) => other.parent === bone.id)]));
  return {
    frame: 'model',
    root: content.root,
    bones: ordered.map(({ along, flexAxis, ...bone }) => {
      const own = children.get(bone.id);
      const reach = Math.max(...corners(bone.bind.box).map((corner) => dot(sub(corner, bone.head), along)));
      const tail = own.length === 1 ? own[0].head : add(bone.head, scale(along, reach));
      return { ...bone, tail, frame: frameAbout(bone.head, tail, flexAxis) };
    }),
  };
}
