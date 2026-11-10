// Dressing a wearable on the doll, the default player avatar, by the rule in models/dressing.libsonnet: the sites the
// showcase (site/build.mjs) composes into its worn view, which the review sheets draw too. A site is
// { model, at, mirror?, turn? }: the model mirrored across its own x = 0 plane, then turned by the quaternion `turn`,
// then moved by `at`, as site/render.mjs places it.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { glbAccessor, glbJson } from './glb.mjs';

const repo = resolve(import.meta.dirname, '..');

export const readDressing = (root = repo) => JSON.parse(evaluateJsonnet("import 'models/dressing.libsonnet'", root));

// ---- boxes and transforms ----

const AXES = [0, 1, 2];
const empty = () => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
const union = (boxes) => boxes.reduce((into, { min, max }) => ({
  min: AXES.map((a) => Math.min(into.min[a], min[a])),
  max: AXES.map((a) => Math.max(into.max[a], max[a])),
}), empty());
const corners = ({ min, max }) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => AXES.map((a) => ((i >> a) & 1 ? max[a] : min[a])));
const boxOf = (points) => union(points.map((p) => ({ min: p, max: p })));
const moved = (box, by) => ({ min: box.min.map((x, a) => x + by[a]), max: box.max.map((x, a) => x + by[a]) });
const mirrorX = ([x, y, z]) => [-x, y, z];
const mirrored = ({ min, max }) => ({ min: [-max[0], min[1], min[2]], max: [-min[0], max[1], max[2]] });
const sum = (a, b) => a.map((x, i) => x + b[i]);
const difference = (a, b) => a.map((x, i) => x - b[i]);
const centre = ({ min, max }) => min.map((x, a) => (x + max[a]) / 2);

const rotate = ([x, y, z, w], v) => {
  // v + 2w(q × v) + 2q × (q × v)
  const q = [x, y, z];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const t = cross(q, v).map((c) => 2 * c);
  return sum(sum(v, t.map((c) => w * c)), cross(q, t));
};
const turned = (box, turn) => boxOf(corners(box).map((p) => rotate(turn, p)));

// A glTF node's transform as a function of a point in its own frame.
const nodeTransform = ({ translation = [0, 0, 0], rotation = [0, 0, 0, 1], scale = [1, 1, 1] }) =>
  (p) => sum(rotate(rotation, p.map((x, a) => x * scale[a])), translation);

// ---- reading a built model ----

// Each mesh node of a GLB's scene with the part it belongs to (the nearest node marking `extras.part`, as the export
// does), that part node's origin in the model frame, the node's box in the model frame, its mesh and the transform from
// the node's frame to the model frame.
function meshNodes(buffer, gltf = glbJson(buffer)) {
  const found = [];
  const walk = (index, toModel, part) => {
    const node = gltf.nodes[index];
    const local = nodeTransform(node);
    const here = (p) => toModel(local(p));
    const own = node.extras?.part === undefined ? part : { name: node.extras.part, at: here([0, 0, 0]), turned: Boolean(node.rotation) && node.rotation.some((x, i) => x !== (i === 3 ? 1 : 0)) };
    if (node.mesh !== undefined) {
      const box = union(gltf.meshes[node.mesh].primitives.map(({ attributes }) => {
        const { min, max } = gltf.accessors[attributes.POSITION];
        return boxOf(corners({ min, max }).map(here));
      }));
      found.push({ part: own, box, mesh: gltf.meshes[node.mesh], toModel: here });
    }
    for (const child of node.children ?? []) walk(child, here, own);
  };
  for (const index of gltf.scenes[gltf.scene ?? 0].nodes) walk(index, (p) => p, undefined);
  return found;
}

// A model's box in its own frame.
export const modelBox = (buffer) => union(meshNodes(buffer).map(({ box }) => box));

// Each part of a model: its name, origin and box in the model frame. A doll part's frame is where a worn piece is
// drawn, so a part turned off the model's axes is refused rather than drawn askew.
export function modelParts(buffer) {
  const byName = new Map();
  for (const { part, box } of meshNodes(buffer)) {
    if (!part) continue;
    if (part.turned) throw new Error(`part ${part.name} is turned in its model; a doll part must keep the model's axes`);
    const seen = byName.get(part.name);
    byName.set(part.name, { part: part.name, at: part.at, box: seen ? union([seen.box, box]) : box });
  }
  return [...byName.values()];
}

const TRIANGLES = 4;

// Each part of a model as one triangle mesh in the model frame, { part, positions: xyz triples, indices }, so a check can
// test points against the part's surface.
export function modelMeshes(buffer) {
  const gltf = glbJson(buffer);
  const byName = new Map();
  for (const { part, mesh, toModel } of meshNodes(buffer, gltf)) {
    if (!part) continue;
    const into = byName.get(part.name) ?? { part: part.name, positions: [], indices: [] };
    byName.set(part.name, into);
    for (const { attributes, indices, mode = TRIANGLES } of mesh.primitives) {
      if (mode !== TRIANGLES) throw new Error(`part ${part.name} draws a primitive of mode ${mode}; only triangles are read`);
      const base = into.positions.length / 3;
      const positions = glbAccessor(buffer, gltf, attributes.POSITION);
      for (let i = 0; i < positions.length; i += 3) into.positions.push(...toModel(positions.slice(i, i + 3)));
      const order = indices === undefined ? Array.from({ length: positions.length / 3 }, (_, i) => i) : glbAccessor(buffer, gltf, indices);
      for (const index of order) into.indices.push(base + index);
    }
  }
  return [...byName.values()];
}

// ---- the doll ----

// The doll's sites, for each of its part names the copies of that part in the doll frame as
// { side, site, at, box, mirror }, in the order of the dressing's sides, where `site` indexes the doll site that draws
// the copy, and the bust's anchors, which are in the doll frame too. `figure` holds each doll model's `parts`
// (modelParts) and `anchors` (its things sidecar).
export function dollOf(dressing, figure) {
  const { bust, limbs, sides, mirrored: mirroredSide } = dressing.doll;
  const sites = [{ model: bust, at: [0, 0, 0] }];
  const parts = new Map();
  const add = (copy) => parts.set(copy.part, [...(parts.get(copy.part) ?? []), copy]);
  for (const { part, at, box } of figure[bust].parts) add({ part, side: 'centre', site: 0, at, box });
  for (const { model, anchor } of limbs) {
    const own = figure[model].anchors[anchor];
    for (const side of sides) {
      const hung = figure[bust].anchors[`${anchor}_${side}`];
      if (!hung || !own) throw new Error(`doll: no ${anchor} anchor to hang ${model} by on the ${side}`);
      const mirror = side === mirroredSide;
      const flip = mirror ? mirrorX : (p) => p;
      const site = sites.push({ model, at: difference(hung, flip(own)), ...(mirror ? { mirror } : {}) }) - 1;
      for (const { part, at, box } of figure[model].parts) {
        const local = moved(box, difference([0, 0, 0], own));
        add({ part, side, site, at: sum(hung, flip(difference(at, own))), box: moved(mirror ? mirrored(local) : local, hung), ...(mirror ? { mirror } : {}) });
      }
    }
  }
  return { sites, parts, anchors: figure[bust].anchors };
}

// ---- dressing ----

const tagsOf = (model, facet) => model.tags?.[facet] ?? [];
const isPieceOf = (id, model) => model.id === `${id}_worn` || (model.id.startsWith(`${id}_worn_`) && !model.id.slice(`${id}_worn_`.length).includes('_'));

// The worn pieces of the wearable `id`, each with the doll part whose frame it is drawn in: `<id>_worn` in the
// dressing's `piece` part, `<id>_worn_<segment>` in the segment's part. Pieces fitted over other clothing are left
// out, so the doll wears each item on its own.
export function wornPieces(id, models, dressing) {
  return models.filter((model) => tagsOf(model, 'fit').includes('worn') && isPieceOf(id, model)).map((model) => {
    if (model.id === `${id}_worn`) return { model: model.id, part: dressing.piece };
    const segment = model.id.slice(`${id}_worn_`.length);
    const slot = dressing.slots[segment];
    if (!slot) throw new Error(`${model.id}: worn segment ${segment} is not in the dressing's slots`);
    return { model: model.id, part: slot.part };
  });
}

// Whether a model is worn: a loose model, not itself a piece, that names a body slot or has worn pieces.
export const isWearable = (model, models) => tagsOf(model, 'fit').length === 0 && (tagsOf(model, 'slot').length > 0 || models.some((other) => tagsOf(other, 'fit').includes('worn') && isPieceOf(model.id, other)));

// The quarter turn about x that stands a model lying on its back, head end at -z, up with its front at +z.
const STAND = [Math.SQRT1_2, 0, 0, Math.SQRT1_2];

// Where a wearable with no pieces sits by the dressing's `places`: the move that rests its box against the region of
// doll part copies along `against`, sunk into it by `sink` of its own depth there, and centred on the region across.
function rest(box, region, { against, sink }) {
  return AXES.map((a) => {
    const depth = box.max[a] - box.min[a];
    if (against[a] > 0) return region.max[a] - box.min[a] - sink * depth;
    if (against[a] < 0) return region.min[a] - box.max[a] + sink * depth;
    return centre(region)[a] - centre(box)[a];
  });
}

// The sites that show `model` worn on the doll: the doll's own, then each worn piece in every copy of its part, or,
// for a wearable with no pieces, the loose model placed by its first slot in the dressing's `places`: its origin at
// the place's bust anchor, or its box rested against the place's part. `boxOf` gives a loose model's box in its own
// frame.
export function wornSites(model, { dressing, doll, models, boxOf: boxOfModel }) {
  const { sites, parts, anchors } = doll;
  const copiesOf = (part) => {
    const copies = parts.get(part);
    if (!copies) throw new Error(`${model.id}: the doll has no part ${part}`);
    return copies;
  };
  const pieces = wornPieces(model.id, models, dressing);
  if (pieces.length > 0) {
    // A piece's site names the doll part copy it is drawn in, so a poser moves the piece with that part.
    return [...sites, ...pieces.flatMap(({ model: piece, part }) => copiesOf(part).map(({ side, at, mirror }) => ({ model: piece, part, side, at, ...(mirror ? { mirror } : {}) })))];
  }
  const slots = tagsOf(model, 'slot');
  const place = dressing.places.find(({ slot }) => slots.includes(slot));
  if (!place) throw new Error(`${model.id}: none of its slots ${slots.join(' ')} has a place on the doll`);
  if (place.anchor) {
    const at = anchors[place.anchor];
    if (!at) throw new Error(`${model.id}: the doll has no anchor ${place.anchor} to place it at`);
    return [...sites, { model: model.id, at }];
  }
  const copies = copiesOf(place.part);
  const region = union((place.both ? copies : copies.slice(0, 1)).map(({ box }) => box));
  const lying = tagsOf(model, 'state').some((state) => dressing.lying.includes(state));
  const box = lying ? turned(boxOfModel(model.id), STAND) : boxOfModel(model.id);
  return [...sites, { model: model.id, at: rest(box, region, place), ...(lying ? { turn: STAND } : {}) }];
}

// The doll as the built tree holds it: each doll model's parts from its GLB and anchors from its things sidecar.
export function readDoll(built, manifest, dressing) {
  const names = [dressing.doll.bust, ...dressing.doll.limbs.map(({ model }) => model)];
  return dollOf(dressing, Object.fromEntries(names.map((id) => {
    const entry = manifest.models.find((model) => model.id === id && model.path.endsWith('.glb'));
    if (!entry) throw new Error(`doll: the built tree holds no ${id}`);
    const { anchors } = JSON.parse(readFileSync(join(built, entry.pack, 'things', `${id}.model.json`), 'utf8'));
    return [id, { parts: modelParts(readFileSync(join(built, entry.pack, entry.path))), anchors }];
  })));
}
