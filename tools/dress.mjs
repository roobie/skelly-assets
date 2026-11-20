// @ts-check
// Dressing a wearable on a doll by the rule in models/dressing.libsonnet: the sites the showcase (site/build.mjs)
// composes into its worn view, which the review sheets draw too. A doll is a target of that rule, a record under the
// dressing's `dolls` by id; `dollDressing` gives the rule as one doll wears it, which every function here that takes a
// `dressing` takes. A site is { model, at, mirror?, turn? }: the model mirrored across its own x = 0 plane, then turned
// by the quaternion `turn`, then moved by `at`, as site/render.mjs places it. A worn piece's site adds the doll part
// copy it rides { part, side } and what of that copy it hides { covers, bodySite } (site/hiding.mjs). Footwear's site
// carries the lift its sole stands the figure on { soleLift }.
/** @import { Vec3 } from './packages/construct/src/foundation/math.ts' */
/** @import { GltfMesh, GltfNode } from './glb.mjs' */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { glbAccessor, glbItem, glbJson } from './glb.mjs';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { thingEntryFile } from './layout.mjs';
import { perAxis } from './packages/construct/src/foundation/math.ts';
import { facetTerms } from './taxonomy.mjs';

/** @typedef {[number, number, number, number]} Quaternion */
/** @typedef {{ min: Vec3; max: Vec3 }} Box */

/**
 * A place a wearable with no pieces sits by: at a bust anchor, or rested against a doll part.
 * @typedef {{ slot: string; anchor: string; part?: never; both?: never }} AnchorPlace
 * @typedef {{ slot: string; anchor?: never; part: string; against: Vec3; sink: number; both?: boolean }} RestPlace
 * @typedef {AnchorPlace | RestPlace} Place
 */

/**
 * A limb hung on the doll: `turn`, if the doll rests it turned off the way its model hangs (down -y), is `degrees`
 * about `axis` of the doll frame, as the reference (unmirrored) side takes it; the mirrored side takes its mirror image
 * (`mirroredTurn`), so a doll that rests its arms in a T-pose states one turn for both.
 * @typedef {{ name: string; model: string; anchor: string; turn?: { axis: Vec3; degrees: number } }} DollLimb
 */

/**
 * A doll's record, models/dolls/<id>/doll.libsonnet.
 * @typedef {object} DollRecord
 * @property {string} pack the pack its rig is released in
 * @property {string} rigPath where in that pack
 * @property {string} bust
 * @property {readonly DollLimb[]} limbs in the order their sites are numbered
 * @property {readonly [string, string]} sides
 * @property {string} mirrored
 * @property {Readonly<Record<string, string>>} boneSuffix
 * @property {any} rig the rig's content (tools/dollRig.mjs)
 * @property {Readonly<Record<string, readonly string[]>>} regions
 * @property {Readonly<Record<string, { part: string; slot: string }>>} slots
 * @property {Place[]} places
 */

/**
 * models/dressing.libsonnet.
 * @typedef {object} Dressing
 * @property {Readonly<Record<string, DollRecord>>} dolls
 * @property {string[]} layers
 * @property {string[]} lying
 * @property {string} piece
 */

/**
 * The dressing as one doll wears it: its shared fields and the doll's record, with the doll's `id`.
 * @typedef {Omit<Dressing, 'dolls'> & DollRecord & { id: string }} DollDressing
 */

/**
 * A model as dressing reads it; its tags are whatever its taxonomy holds (tools/taxonomy.mjs, facetTerms).
 * @typedef {object} DressModel
 * @property {string} id
 * @property {unknown} [tags]
 * @property {readonly string[] | undefined} [covers]
 * @property {number | undefined} [soleLift]
 */

/** @typedef {{ part: string; at: Vec3; box: Box }} ModelPart */
/** @typedef {{ parts: readonly ModelPart[]; anchors: Readonly<Record<string, Vec3>> }} FigureModel */
/** @typedef {{ model: string; at: Vec3; mirror?: boolean; turn?: Quaternion }} DollSite */
/** @typedef {{ part: string; side: string; site: number; at: Vec3; box: Box; mirror?: boolean; turn?: Quaternion }} PartCopy */
/** @typedef {ReturnType<typeof dollOf>} Doll */
/** @typedef {{ anchors: Readonly<Record<string, string>>; sided: readonly string[] }} DollParts */
/** @typedef {{ part: string; both?: boolean; side?: string; anchor?: string }} WornOn */

const repo = resolve(import.meta.dirname, '..');

/** @returns {Dressing} */
export const readDressing = (root = repo) => JSON.parse(evaluateJsonnet("import 'models/dressing.libsonnet'", root));

// The doll a game's player is drawn as. The showcase's worn view, the wields, the locomotion and the pose checks are
// all authored against that doll's rig and its bones' names, so they name it here, where they would otherwise each
// repeat it, rather than in content that has no second doll to tell apart.
export const PLAYER = 'player';

/**
 * The dressing as the doll `id` wears it.
 * @param {Dressing} dressing
 * @param {string} id
 * @returns {DollDressing}
 */
export function dollDressing({ dolls, ...shared }, id) {
  const record = dolls[id];
  if (!record) throw new Error(`the dressing has no doll ${id}; it has ${Object.keys(dolls).join(', ')}`);
  const clash = Object.keys(record).filter((key) => key in shared || key === 'id');
  if (clash.length > 0) throw new Error(`doll ${id}: ${clash.join(', ')} is also a shared field of the dressing`);
  return { ...shared, ...record, id };
}

/**
 * The dressing as each of its dolls wears it.
 * @param {Dressing} dressing
 */
export const dollDressings = (dressing) => Object.keys(dressing.dolls).map((id) => dollDressing(dressing, id));

// ---- boxes and transforms ----

/** @returns {Box} */
const empty = () => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
/** @param {readonly Box[]} boxes */
const union = (boxes) =>
  boxes.reduce(
    (into, { min, max }) => ({
      min: perAxis((a) => Math.min(into.min[a], min[a])),
      max: perAxis((a) => Math.max(into.max[a], max[a])),
    }),
    empty(),
  );
/** @param {Box} box */
const corners = ({ min, max }) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => perAxis((a) => ((i >> a) & 1 ? max[a] : min[a])));
/** @param {readonly Vec3[]} points */
const boxOf = (points) => union(points.map((p) => ({ min: p, max: p })));
/**
 * @param {Box} box
 * @param {Vec3} by
 * @returns {Box}
 */
const moved = (box, by) => ({ min: perAxis((a) => box.min[a] + by[a]), max: perAxis((a) => box.max[a] + by[a]) });
/**
 * @param {Vec3} p
 * @returns {Vec3}
 */
const mirrorX = ([x, y, z]) => [-x, y, z];
/**
 * @param {Box} box
 * @returns {Box}
 */
const mirrored = ({ min, max }) => ({ min: [-max[0], min[1], min[2]], max: [-min[0], max[1], max[2]] });
/**
 * @param {Vec3} a
 * @param {Vec3} b
 */
const sum = (a, b) => perAxis((i) => a[i] + b[i]);
/**
 * @param {Vec3} a
 * @param {Vec3} b
 */
const difference = (a, b) => perAxis((i) => a[i] - b[i]);
/** @param {Box} box */
const centre = ({ min, max }) => perAxis((a) => (min[a] + max[a]) / 2);

/**
 * @param {Quaternion} q
 * @param {Vec3} v
 */
const rotate = ([x, y, z, w], v) => {
  // v + 2w(q × v) + 2q × (q × v)
  /** @type {Vec3} */
  const q = [x, y, z];
  /**
   * @param {Vec3} a
   * @param {Vec3} b
   * @returns {Vec3}
   */
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const c = cross(q, v);
  const t = perAxis((a) => 2 * c[a]);
  return sum(
    sum(
      v,
      perAxis((a) => w * t[a]),
    ),
    cross(q, t),
  );
};
/**
 * @param {Box} box
 * @param {Quaternion} turn
 */
const turned = (box, turn) => boxOf(corners(box).map((p) => rotate(turn, p)));

/**
 * The quaternion of a turn of `degrees` about `axis`.
 * @param {{ axis: Vec3; degrees: number }} turn
 * @returns {Quaternion}
 */
const turnOf = ({ axis, degrees }) => {
  const half = (degrees * Math.PI) / 360;
  const length = Math.hypot(...axis);
  const [x, y, z] = perAxis((a) => (Math.sin(half) * axis[a]) / length);
  return [x, y, z, Math.cos(half)];
};
/**
 * A turn as the mirror plane x = 0 sees it: the reflection M of a rotation R is M R M, which turns by the same angle
 * about the axis an axial vector takes across the plane, (x, -y, -z). A limb mirrored then turned by this lies where the
 * reference limb turned by R, mirrored, does.
 * @param {Quaternion} turn
 * @returns {Quaternion}
 */
const mirroredTurn = ([x, y, z, w]) => [x, -y, -z, w];

/**
 * A glTF node's transform as a function of a point in its own frame.
 * @param {GltfNode} node
 * @returns {(p: Vec3) => Vec3}
 */
const nodeTransform =
  ({ translation = [0, 0, 0], rotation = [0, 0, 0, 1], scale = [1, 1, 1] }) =>
  (p) =>
    sum(
      rotate(
        rotation,
        perAxis((a) => p[a] * scale[a]),
      ),
      translation,
    );

/**
 * The point of a flat xyz list that starts at `at`.
 * @param {readonly number[]} list
 * @param {number} at
 */
const pointAt = (list, at) =>
  perAxis((a) => {
    const x = list[at + a];
    if (x === undefined) throw new Error(`a point list of ${list.length} numbers has no point at ${at}`);
    return x;
  });

// ---- reading a built model ----

/**
 * @typedef {object} MeshNode
 * @property {{ name: string; at: Vec3; turned: boolean } | undefined} part
 * @property {Box} box
 * @property {GltfMesh} mesh
 * @property {(p: Vec3) => Vec3} toModel
 */

/**
 * Each mesh node of a GLB's scene with the part it belongs to (the nearest node marking `extras.part`, as the export
 * does), that part node's origin in the model frame, the node's box in the model frame, its mesh and the transform from
 * the node's frame to the model frame.
 * @param {Buffer} buffer
 */
function meshNodes(buffer, gltf = glbJson(buffer)) {
  /** @type {MeshNode[]} */
  const found = [];
  /**
   * @param {number} index
   * @param {(p: Vec3) => Vec3} toModel
   * @param {MeshNode['part']} part
   */
  const walk = (index, toModel, part) => {
    const node = glbItem(gltf.nodes, index, 'node');
    const local = nodeTransform(node);
    /** @param {Vec3} p */
    const here = (p) => toModel(local(p));
    const own =
      node.extras?.part === undefined
        ? part
        : {
            name: node.extras.part,
            at: here([0, 0, 0]),
            turned: node.rotation?.some((x, i) => x !== (i === 3 ? 1 : 0)) ?? false,
          };
    if (node.mesh !== undefined) {
      const mesh = glbItem(gltf.meshes, node.mesh, 'mesh');
      const box = union(
        mesh.primitives.map(({ attributes }) => {
          const { min, max } = glbItem(gltf.accessors, attributes.POSITION, 'accessor');
          if (!min || !max) throw new Error(`the GLB's position accessor ${attributes.POSITION} has no bounds`);
          return boxOf(corners({ min, max }).map(here));
        }),
      );
      found.push({ part: own, box, mesh, toModel: here });
    }
    for (const child of node.children ?? []) walk(child, here, own);
  };
  for (const index of glbItem(gltf.scenes, gltf.scene ?? 0, 'scene').nodes) walk(index, (p) => p, undefined);
  return found;
}

/**
 * A model's box in its own frame.
 * @param {Buffer} buffer
 */
export const modelBox = (buffer) => union(meshNodes(buffer).map(({ box }) => box));

/**
 * Each part of a model: its name, origin and box in the model frame. A doll part's frame is where a worn piece is
 * drawn, so a part turned off the model's axes is refused rather than drawn askew.
 * @param {Buffer} buffer
 */
export function modelParts(buffer) {
  /** @type {Map<string, ModelPart>} */
  const byName = new Map();
  for (const { part, box } of meshNodes(buffer)) {
    if (!part) continue;
    if (part.turned)
      throw new Error(`part ${part.name} is turned in its model; a doll part must keep the model's axes`);
    const seen = byName.get(part.name);
    byName.set(part.name, { part: part.name, at: part.at, box: seen ? union([seen.box, box]) : box });
  }
  return [...byName.values()];
}

const TRIANGLES = 4;

/**
 * Each part of a model as one triangle mesh in the model frame, { part, positions: xyz triples, indices }, so a check can
 * test points against the part's surface. `keep(part, piece, slot)` picks the primitives, by their part and the piece
 * and material slot the export marks them as, if any; every one by default.
 * @param {Buffer} buffer
 * @param {(part: string, piece: string | undefined, slot: string | undefined) => boolean} [keep]
 */
export function modelMeshes(buffer, keep = () => true) {
  const gltf = glbJson(buffer);
  /** @type {Map<string, { part: string; positions: number[]; indices: number[]; pieces: (string | undefined)[] }>} */
  const byName = new Map();
  for (const { part, mesh, toModel } of meshNodes(buffer, gltf)) {
    if (!part) continue;
    const into = byName.get(part.name) ?? { part: part.name, positions: [], indices: [], pieces: [] };
    byName.set(part.name, into);
    for (const { attributes, indices, mode = TRIANGLES, extras } of mesh.primitives) {
      if (!keep(part.name, extras?.piece, extras?.slot)) continue;
      if (mode !== TRIANGLES)
        throw new Error(`part ${part.name} draws a primitive of mode ${mode}; only triangles are read`);
      const base = into.positions.length / 3;
      const positions = glbAccessor(buffer, gltf, attributes.POSITION);
      for (let i = 0; i < positions.length; i += 3) into.positions.push(...toModel(pointAt(positions, i)));
      const order =
        indices === undefined
          ? Array.from({ length: positions.length / 3 }, (_, i) => i)
          : glbAccessor(buffer, gltf, indices);
      for (const index of order) into.indices.push(base + index);
      for (let t = 0; t < order.length / 3; t++) into.pieces.push(extras?.piece);
    }
  }
  return [...byName.values()].filter(({ indices }) => indices.length > 0);
}

// ---- the doll ----

/**
 * The doll's sites, for each of its part names the copies of that part in the doll frame as
 * { side, site, at, box, mirror, turn }, in the order of the dressing's sides, where `site` indexes the doll site that
 * draws the copy, and the bust's anchors, which are in the doll frame too. A limb's copies are placed as its site is:
 * the model mirrored, turned by the limb's turn (the mirrored side's being the mirror image of the reference side's),
 * then moved so its own anchor lies on the bust's. A copy's `at` is where its part's origin lands, its `box` the
 * doll-frame box enclosing the part (the turned corners', as large as the box was only for a turn off the axes).
 * `figure` holds each doll model's `parts` (modelParts) and `anchors` (its things sidecar).
 * @param {DollDressing} dressing
 * @param {Readonly<Record<string, FigureModel>>} figure
 */
export function dollOf(dressing, figure) {
  const { bust, sides, mirrored: mirroredSide } = dressing;
  const { limbs } = dressing;
  /** @param {string} model */
  const figureOf = (model) => {
    const found = figure[model];
    if (!found) throw new Error(`doll: no parts and anchors of ${model}`);
    return found;
  };
  /** @type {DollSite[]} */
  const sites = [{ model: bust, at: [0, 0, 0] }];
  /** @type {Map<string, PartCopy[]>} */
  const parts = new Map();
  /** @param {PartCopy} copy */
  const add = (copy) => parts.set(copy.part, [...(parts.get(copy.part) ?? []), copy]);
  for (const { part, at, box } of figureOf(bust).parts) add({ part, side: 'centre', site: 0, at, box });
  for (const { model, anchor, turn: limbTurn } of limbs) {
    const own = figureOf(model).anchors[anchor];
    for (const side of sides) {
      const hung = figureOf(bust).anchors[`${anchor}_${side}`];
      if (!hung || !own) throw new Error(`doll: no ${anchor} anchor to hang ${model} by on the ${side}`);
      const mirror = side === mirroredSide;
      const reference = limbTurn && turnOf(limbTurn);
      const turn = mirror && reference ? mirroredTurn(reference) : reference;
      /** @type {(p: Vec3) => Vec3} a point of the limb's model frame, as the site puts it relative to the site's `at` */
      const place = (p) => {
        const flipped = mirror ? mirrorX(p) : p;
        return turn ? rotate(turn, flipped) : flipped;
      };
      const site =
        sites.push({
          model,
          at: difference(hung, place(own)),
          ...(mirror ? { mirror } : {}),
          ...(turn ? { turn } : {}),
        }) - 1;
      for (const { part, at, box } of figureOf(model).parts) {
        const local = moved(box, difference([0, 0, 0], own));
        const flipped = mirror ? mirrored(local) : local;
        add({
          part,
          side,
          site,
          at: sum(hung, place(difference(at, own))),
          box: moved(turn ? turned(flipped, turn) : flipped, hung),
          ...(mirror ? { mirror } : {}),
          ...(turn ? { turn } : {}),
        });
      }
    }
  }
  return { sites, parts, anchors: figureOf(bust).anchors };
}

// ---- dressing ----

/**
 * @param {DressModel} model
 * @param {string} facet
 */
const tagsOf = (model, facet) => facetTerms(model.tags, facet);

// A worn piece's garment and segment, read from its id, `<garment>_worn` or `<garment>_worn_<segment>`; nothing for a
// model that is no worn piece. Pieces fitted over other clothing are not worn pieces here, so the doll wears each item
// on its own.
const PIECE_ID = /^(.+)_worn(?:_([^_]+))?$/;
/** The garment a worn piece's id names, whether or not the model is tagged as one. @param {string} id */
export const wornGarment = (id) => PIECE_ID.exec(id)?.[1];
/**
 * @param {DressModel} model
 * @returns {{ garment: string; segment: string | undefined } | undefined}
 */
function pieceOf(model) {
  if (!tagsOf(model, 'fit').includes('worn')) return undefined;
  const match = PIECE_ID.exec(model.id);
  return match?.[1] === undefined ? undefined : { garment: match[1], segment: match[2] };
}

/**
 * The doll part whose frame a worn piece is drawn in: the dressing's `piece` part without a segment, else the segment's.
 * @param {string} id
 * @param {{ segment: string | undefined }} piece
 * @param {DollDressing} dressing
 */
function piecePart(id, { segment }, dressing) {
  if (segment === undefined) return dressing.piece;
  const slot = dressing.slots[segment];
  if (!slot) throw new Error(`${id}: worn segment ${segment} is not in the dressing's slots`);
  return slot.part;
}

/**
 * The worn pieces of the wearable `id`, each with the doll part whose frame it is drawn in and what it covers of that
 * part, as its model declares, with the sole lift a foot piece declares.
 * @param {string} id
 * @param {readonly DressModel[]} models
 * @param {DollDressing} dressing
 */
export function wornPieces(id, models, dressing) {
  return models.flatMap((model) => {
    const piece = pieceOf(model);
    if (piece?.garment !== id) return [];
    const declared = {
      ...(model.covers ? { covers: model.covers } : {}),
      ...(model.soleLift === undefined ? {} : { soleLift: model.soleLift }),
    };
    return [{ model: model.id, part: piecePart(model.id, piece, dressing), ...declared }];
  });
}

/**
 * What is wrong with the worn pieces' `covers`: each name must be the doll part the piece is drawn on, or one of the
 * regions the dressing cuts that part into, since a consumer hides by those names and no other.
 * @param {readonly DressModel[]} models
 * @param {DollDressing} dressing
 */
export function coversProblems(models, dressing) {
  return models.flatMap(({ id, covers }) => {
    if (!covers) return [];
    const worn = /_worn(?:_([^_]+))?$/.exec(id);
    if (!worn) return [`${id} declares what it covers but is no worn piece`];
    const part = worn[1] === undefined ? dressing.piece : dressing.slots[worn[1]]?.part;
    if (!part) return [`${id}: worn segment ${worn[1]} is not in the dressing's slots`];
    const names = [part, ...(dressing.regions[part] ?? [])];
    return covers
      .filter((name) => !names.includes(name))
      .map((name) => `${id} covers ${name}, which is neither its part nor a region of it: ${names.join(', ')}`);
  });
}

/**
 * The items any of whose worn pieces declares what it covers, by the pieces' ids, whether or not the tree holds the item
 * itself: a set of worn shells with no ground model is still dressed to check what it declares.
 * @param {readonly DressModel[]} models
 */
export const coveringItems = (models) => [
  ...new Set(
    models.flatMap((model) => {
      const item =
        model.covers && tagsOf(model, 'fit').includes('worn')
          ? /^(.+)_worn(?:_[^_]+)?$/.exec(model.id)?.[1]
          : undefined;
      return item ? [item] : [];
    }),
  ),
];

/**
 * Whether a model is worn: a loose model, not itself a piece, that names a body slot or has worn pieces.
 * @param {DressModel} model
 * @param {readonly DressModel[]} models
 */
export const isWearable = (model, models) =>
  tagsOf(model, 'fit').length === 0 &&
  (tagsOf(model, 'slot').length > 0 || models.some((other) => pieceOf(other)?.garment === model.id));

/**
 * The wearables drawn as worn pieces, by the pieces' ids, whether or not the models hold the wearable itself.
 * @param {readonly DressModel[]} models
 */
export const fittedGarments = (models) => [...new Set(models.flatMap((model) => pieceOf(model)?.garment ?? []))];

/**
 * The garments among `garments` whose pieces were fitted to the doll of `dressing`. A garment's pieces are fitted to
 * one doll, which the checks run on that doll alone for: a piece's shape is only meant for the doll it was drawn
 * against. Every piece is the player's until they are told apart by the doll their id names (`_worn_<doll>`), and then
 * only `fittedDoll` changes.
 * @param {DollDressing} dressing
 * @param {readonly string[]} garments
 */
export const dollGarments = (dressing, garments) => garments.filter((garment) => fittedDoll(garment) === dressing.id);

/** The doll a garment's pieces were fitted to. @param {string} _garment */
const fittedDoll = (_garment) => PLAYER;

/**
 * The place a wearable with no pieces sits by: the first of the dressing's `places` that names one of its slots.
 * @param {DressModel} model
 * @param {DollDressing} dressing
 */
export function placeOf(model, dressing) {
  const slots = tagsOf(model, 'slot');
  const place = dressing.places.find(({ slot }) => slots.includes(slot));
  if (!place) throw new Error(`${model.id}: none of its slots ${slots.join(' ')} has a place on the doll`);
  return place;
}

/**
 * The `<item>_worn` twin of a piece fitted over other clothing, a fit among the dressing's `layers`, read from its id
 * `<item>_worn_<layer>`; nothing for any other model.
 * @param {DressModel} model
 * @param {DollDressing} dressing
 */
function layerTwinOf(model, dressing) {
  if (!tagsOf(model, 'fit').some((fit) => dressing.layers.includes(fit))) return undefined;
  const match = PIECE_ID.exec(model.id);
  if (match?.[2] === undefined)
    throw new Error(`${model.id}: a piece fitted over other clothing is named <item>_worn_<layer>`);
  return `${match[1]}_worn`;
}

/**
 * Each model's `wornOn` by id, the doll part it sits on (tools/manifest.mjs, `buildManifest`): a worn piece's is the
 * part whose frame it is drawn in, and a piece fitted over other clothing has its worn twin's; a wearable with no
 * pieces has its place's part with the copy it sits on (placedOn), from `dollParts` (readDollParts). A wearable with
 * pieces has none: its pieces are what sit on the doll.
 * @param {readonly DressModel[]} models
 * @param {DollDressing} dressing
 * @param {DollParts} dollParts
 */
export function wornOnParts(models, dressing, dollParts) {
  const byId = new Map(models.map((model) => [model.id, model]));
  const garments = new Set(models.map((model) => pieceOf(model)?.garment).filter(Boolean));
  /** @param {DressModel} model */
  const placed = (model) =>
    tagsOf(model, 'fit').length === 0 && tagsOf(model, 'slot').length > 0 && !garments.has(model.id);
  /** @type {Map<string, WornOn>} */
  const wornOn = new Map();
  for (const model of models) {
    const twinId = layerTwinOf(model, dressing);
    const piece = pieceOf(model);
    if (piece) wornOn.set(model.id, { part: piecePart(model.id, piece, dressing) });
    else if (twinId !== undefined) {
      const twin = byId.get(twinId);
      const twinPiece = twin && pieceOf(twin);
      if (!twin || !twinPiece)
        throw new Error(`${model.id}: fitted over other clothing, it has no worn twin ${twinId}`);
      wornOn.set(model.id, { part: piecePart(twin.id, twinPiece, dressing) });
    } else if (placed(model)) wornOn.set(model.id, placedOn(model, dressing, dollParts));
  }
  return wornOn;
}

/**
 * A placed wearable sits on its place's part, or for an anchor place on the part the anchor lies on, and on the copy of
 * the doll's first side when the part is a limb's and the place does not span both copies, as `wornSites` places it.
 * @param {DressModel} model
 * @param {DollDressing} dressing
 * @param {DollParts} dollParts
 * @returns {WornOn}
 */
function placedOn(model, dressing, { anchors, sided }) {
  const place = placeOf(model, dressing);
  const part = place.anchor === undefined ? place.part : anchors[place.anchor];
  if (!part) throw new Error(`${model.id}: the doll's bust has no anchor ${place.anchor} on a part`);
  const copy = place.both ? { both: true } : sided.includes(part) ? { side: dressing.sides[0] } : {};
  return { part, ...copy, ...(place.anchor === undefined ? {} : { anchor: place.anchor }) };
}

/**
 * What a manifest's `wornOn` needs of the doll's catalogue rows, since the built sidecars keep only points: the part
 * each bust anchor lies on, `anchors`, and the parts of the limbs, `sided`, which the doll has a copy of on each side.
 * Import only after installJsonnetSources, as the catalogue reads the compiled rows.
 * @param {DollDressing} dressing
 * @returns {Promise<DollParts>}
 */
export async function readDollParts(dressing) {
  const { readItems } = await import('./packages/thing-authoring-tool/src/cli/content.ts');
  const [bust, ...limbs] = readItems(dollModels(dressing));
  return {
    anchors: Object.fromEntries(Object.entries(bust?.anchors ?? {}).map(([name, { part }]) => [name, part])),
    sided: limbs.flatMap(({ parts }) => parts.map(({ id }) => id)),
  };
}

// The quarter turn about x that stands a model lying on its back, head end at -z, up with its front at +z.
/** @type {Quaternion} */
const STAND = [Math.SQRT1_2, 0, 0, Math.SQRT1_2];

/**
 * Where a wearable with no pieces sits by the dressing's `places`: the move that rests its box against the region of
 * doll part copies along `against`, sunk into it by `sink` of its own depth there, and centred on the region across.
 * @param {Box} box
 * @param {Box} region
 * @param {RestPlace} place
 */
function rest(box, region, { against, sink }) {
  return perAxis((a) => {
    const depth = box.max[a] - box.min[a];
    if (against[a] > 0) return region.max[a] - box.min[a] - sink * depth;
    if (against[a] < 0) return region.min[a] - box.max[a] + sink * depth;
    return centre(region)[a] - centre(box)[a];
  });
}

/**
 * The sites that show `model` worn on the doll: the doll's own, then each worn piece in every copy of its part, or,
 * for a wearable with no pieces, the loose model placed by its first slot in the dressing's `places`: its own anchor of
 * the place's name at the bust anchor (its origin if it has none), or its box rested against the place's part.
 * `boxOf` gives a loose model's box and `anchorsOf` its anchors, both in its own frame.
 * @param {DressModel} model
 * @param {object} options
 * @param {DollDressing} options.dressing
 * @param {Doll} options.doll
 * @param {readonly DressModel[]} options.models
 * @param {(id: string) => Box} options.boxOf
 * @param {(id: string) => Readonly<Record<string, Vec3>>} options.anchorsOf
 */
export function wornSites(model, { dressing, doll, models, boxOf: boxOfModel, anchorsOf }) {
  const { sites, parts, anchors } = doll;
  /** @param {string} part */
  const copiesOf = (part) => {
    const copies = parts.get(part);
    if (!copies) throw new Error(`${model.id}: the doll has no part ${part}`);
    return copies;
  };
  const pieces = wornPieces(model.id, models, dressing);
  if (pieces.length > 0) {
    // A piece's site names the doll part copy it is drawn in, so a poser moves the piece with that part, and a piece
    // that covers some of that copy names the doll site drawing it, which a drawer hides it in (site/hiding.mjs).
    return [
      ...sites,
      ...pieces.flatMap(({ model: piece, part, covers, soleLift }) =>
        copiesOf(part).map(({ side, at, mirror, turn, site }) => ({
          model: piece,
          part,
          side,
          at,
          ...(mirror ? { mirror } : {}),
          ...(turn ? { turn } : {}),
          ...(covers ? { covers, bodySite: site } : {}),
          ...(soleLift === undefined ? {} : { soleLift }),
        })),
      ),
    ];
  }
  const place = placeOf(model, dressing);
  if (place.anchor !== undefined) {
    const at = anchors[place.anchor];
    if (!at) throw new Error(`${model.id}: the doll has no anchor ${place.anchor} to place it at`);
    return [...sites, { model: model.id, at: difference(at, anchorsOf(model.id)[place.anchor] ?? [0, 0, 0]) }];
  }
  const copies = copiesOf(place.part);
  const region = union((place.both ? copies : copies.slice(0, 1)).map(({ box }) => box));
  const lying = tagsOf(model, 'state').some((state) => dressing.lying.includes(state));
  const box = lying ? turned(boxOfModel(model.id), STAND) : boxOfModel(model.id);
  // Footwear's sole lies under the bare foot, so the figure stands on it (site/poseFile.mjs, `soleLift`).
  const at = difference(rest(box, region, place), [0, model.soleLift ?? 0, 0]);
  return [
    ...sites,
    {
      model: model.id,
      at,
      ...(lying ? { turn: STAND } : {}),
      ...(model.soleLift === undefined ? {} : { soleLift: model.soleLift }),
    },
  ];
}

/**
 * The models the doll is made of: its bust and each limb's.
 * @param {DollDressing} dressing
 */
export const dollModels = (dressing) => [dressing.bust, ...dressing.limbs.map(({ model }) => model)];

/**
 * The doll from `filesOf(id)`, each doll model's `{ glb, entry }`: its parts from its GLB and anchors from its things
 * sidecar, as a built tree holds them or a build generates them.
 * @param {DollDressing} dressing
 * @param {(id: string) => { glb: Buffer; entry: { anchors?: Readonly<Record<string, Vec3>> } }} filesOf
 */
export const dollFrom = (dressing, filesOf) =>
  dollOf(
    dressing,
    Object.fromEntries(
      dollModels(dressing).map((id) => {
        const { glb, entry } = filesOf(id);
        return [id, { parts: modelParts(glb), anchors: entry.anchors ?? {} }];
      }),
    ),
  );

/**
 * The doll as the built tree holds it.
 * @param {string} built
 * @param {{ models: readonly { id: string; pack: string; path: string }[] }} manifest
 * @param {DollDressing} dressing
 */
export function readDoll(built, manifest, dressing) {
  return dollFrom(dressing, (id) => {
    const model = manifest.models.find((entry) => entry.id === id && entry.path.endsWith('.glb'));
    if (!model) throw new Error(`doll: the built tree holds no ${id}`);
    return {
      glb: readFileSync(join(built, model.pack, model.path)),
      entry: JSON.parse(readFileSync(join(built, thingEntryFile(model.pack, id)), 'utf8')),
    };
  });
}
