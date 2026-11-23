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
 * about `axis` of the doll frame, as the side that is not `mirrored` takes it; the other side's turn is this side's
 * mirror image (`mirroredTurn`), so a doll that rests its arms in a T-pose states one turn for both. The axis is one of
 * the doll's, which is all a T-pose or an arm swung clear of the hips asks for; the angle is any.
 * @typedef {{ name: string; model: string; anchor: string; turn?: { axis: Vec3; degrees: number } }} DollLimb
 */

/**
 * A doll's record, models/dolls/<id>/doll.libsonnet.
 * @typedef {object} DollRecord
 * @property {string} pack the pack its rig is released in
 * @property {string} rigPath where in that pack
 * @property {string} bust
 * @property {Vec3} [bustAt] where the bust's origin stands in the doll frame, the doll frame's own origin if not given
 * @property {readonly DollLimb[]} limbs in the order their sites are numbered
 * @property {readonly [string, string]} sides
 * @property {string} mirrored
 * @property {Readonly<Record<string, string>>} boneSuffix
 * @property {any} rig the rig's content (tools/dollRig.mjs)
 * @property {Readonly<Record<string, readonly string[]>>} regions each region by the surfaces that make it: a whole
 * part, or `<part>#<piece>`, a piece the export keeps of a part cut into regions
 * @property {Readonly<Record<string, PieceSlot & { slot: string }>>} slots
 * @property {Place[]} places
 */

/**
 * The doll part a segment's pieces are drawn in and, where that part's frame is not the one the pieces were fitted in,
 * `origin`: where the fitted part's origin lies in this part's frame, so a piece fitted to the player's torso, whose
 * origin is the bust's, is drawn at the bust's on a doll whose chest part turns about its own joint.
 *
 * A piece's `covers` names the part it was fitted in as the player calls it, and the regions of the player's cut of it.
 * `as` is that name of the slot's part, which the doll's own part answers to, and `unhidden` the names of the player's
 * regions that the piece cannot hide on this doll, since the doll's region of that name lies on parts the piece is not
 * drawn in.
 * @typedef {{ part: SlotPart; origin?: Vec3; as?: string; unhidden?: readonly string[] }} PieceSlot
 */

/**
 * The doll part a slot's pieces are drawn in: one part with a copy on each side it is drawn on, or, where the doll has
 * the player's limb part as one part of its bust on each side, that part by side.
 * @typedef {string | Readonly<Record<string, string>>} SlotPart
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

/** @typedef {{ part: string; at: Vec3; box: Box; points: readonly Vec3[] }} ModelPart */
/** @typedef {{ parts: readonly ModelPart[]; anchors: Readonly<Record<string, Vec3>> }} FigureModel */
/** @typedef {{ model: string; at: Vec3; mirror?: boolean; turn?: Quaternion }} DollSite */
/**
 * @typedef {object} PartCopy
 * @property {string} part
 * @property {string} side
 * @property {number} site
 * @property {Vec3} at
 * @property {Box} box where the copy lies at rest in the doll frame, a bound on it
 * @property {readonly Vec3[]} points the part's vertices where the copy lies at rest in the doll frame
 * @property {boolean} [mirror]
 * @property {Quaternion} [turn]
 */
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
 * The turn by `b` then `a`.
 * @param {Quaternion} a
 * @param {Quaternion} b
 * @returns {Quaternion}
 */
const product = ([ax, ay, az, aw], [bx, by, bz, bw]) => [
  aw * bx + ax * bw + ay * bz - az * by,
  aw * by - ax * bz + ay * bw + az * bx,
  aw * bz + ax * by - ay * bx + az * bw,
  aw * bw - ax * bx - ay * by - az * bz,
];
/**
 * @param {Box} box
 * @param {Quaternion} turn
 */
const turned = (box, turn) => boxOf(corners(box).map((p) => rotate(turn, p)));

/**
 * The box `points` fill exactly in a frame that `turn` carries into the doll frame about `about`, so a part turned off
 * the doll's axes is met at its own faces rather than at the corners of its looser doll-frame box. A rig bone's
 * `bind.bound` is this box of its part copy (tools/dollRig.mjs), and a model rested on a turned part meets the same.
 * @param {readonly Vec3[]} points
 * @param {Quaternion} turn
 * @param {Vec3} about
 * @returns {{ box: Box; turn: Quaternion; about: Vec3 }}
 */
export const exactBound = (points, turn, about) => {
  /** @type {Quaternion} */
  const back = [-turn[0], -turn[1], -turn[2], turn[3]];
  return { box: boxOf(points.map((p) => sum(rotate(back, difference(p, about)), about))), turn, about };
};

/**
 * The quaternion of a limb's turn: some degrees about one of the doll's axes, either way along it.
 * @param {string} model the limb's model, named in what is refused
 * @param {{ axis: Vec3; degrees: number }} turn
 * @returns {Quaternion}
 */
const turnOf = (model, { axis, degrees }) => {
  const along = axis.filter((c) => c !== 0);
  if (axis.length !== 3 || !axis.every(Number.isFinite) || along.length !== 1 || Math.abs(along[0] ?? 0) !== 1)
    throw new Error(`doll: ${model}'s turn axis ${JSON.stringify(axis)} is not a doll axis, [±1, 0, 0] or alike`);
  if (!Number.isFinite(degrees)) throw new Error(`doll: ${model}'s turn of ${degrees} degrees is no angle`);
  const half = (degrees * Math.PI) / 360;
  const [x, y, z] = perAxis((a) => Math.sin(half) * axis[a]);
  return [x, y, z, Math.cos(half)];
};
/**
 * A turn as the mirror plane x = 0 sees it: the reflection M of a rotation R is M R M, which turns by the same angle
 * about the axis an axial vector takes across the plane, (x, -y, -z). A limb mirrored then turned by this lies where
 * the unmirrored limb turned by R, mirrored, does.
 * @param {Quaternion} turn
 * @returns {Quaternion}
 */
const mirroredTurn = ([x, y, z, w]) => [x, -y, -z, w];

/**
 * Where a point of a part's own frame lies in the doll frame on one copy of the part, mirrored and turned as the copy is.
 * @param {Pick<PartCopy, 'at' | 'mirror' | 'turn'>} copy
 * @param {Vec3} p
 * @returns {Vec3}
 */
const inCopy = ({ at, mirror, turn }, p) => {
  const flipped = mirror ? mirrorX(p) : p;
  return sum(at, turn ? rotate(turn, flipped) : flipped);
};

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
 * Each part of a model: its name, origin, box and vertices in the model frame. A doll part's frame is where a worn
 * piece is drawn, so a part turned off the model's axes is refused rather than drawn askew. The vertices bound the part
 * in a frame off the model's axes, where its box would be a loose bound.
 * @param {Buffer} buffer
 */
export function modelParts(buffer) {
  const gltf = glbJson(buffer);
  /** @type {Map<string, ModelPart>} */
  const byName = new Map();
  for (const { part, box, mesh, toModel } of meshNodes(buffer, gltf)) {
    if (!part) continue;
    if (part.turned)
      throw new Error(`part ${part.name} is turned in its model; a doll part must keep the model's axes`);
    const points = mesh.primitives.flatMap(({ attributes }) => {
      const positions = glbAccessor(buffer, gltf, attributes.POSITION);
      return Array.from({ length: positions.length / 3 }, (_, i) => toModel(pointAt(positions, 3 * i)));
    });
    const seen = byName.get(part.name);
    byName.set(
      part.name,
      seen
        ? { ...seen, box: union([seen.box, box]), points: [...seen.points, ...points] }
        : { part: part.name, at: part.at, box, points },
    );
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
 * The doll's sites, for each of its part names the copies of that part in the doll frame as { side, site, at, box,
 * points, mirror, turn }, in the order of the dressing's sides, where `site` indexes the doll site that draws the copy,
 * and the bust's anchors, which are in the doll frame too. The bust stands at `bustAt`, so a doll may keep the frame
 * its skeleton is measured in, with the floor at y = 0. A limb's copies are placed as its site is: the model mirrored,
 * turned by the limb's turn (the mirrored side's being the mirror image of the other's), then moved so its own anchor
 * lies on the bust's. A copy's `at` is where its part's origin lands, its `box` the doll-frame box of the part. `figure` holds each doll model's `parts` (modelParts) and `anchors` (its things sidecar).
 * @param {DollDressing} dressing
 * @param {Readonly<Record<string, FigureModel>>} figure
 */
export function dollOf(dressing, figure) {
  const { bust, bustAt = [0, 0, 0], sides, mirrored: mirroredSide } = dressing;
  const { limbs } = dressing;
  /** @param {string} model */
  const figureOf = (model) => {
    const found = figure[model];
    if (!found) throw new Error(`doll: no parts and anchors of ${model}`);
    return found;
  };
  /** @type {DollSite[]} */
  const sites = [{ model: bust, at: bustAt }];
  /** @type {Map<string, PartCopy[]>} */
  const parts = new Map();
  /** @param {PartCopy} copy */
  const add = (copy) => parts.set(copy.part, [...(parts.get(copy.part) ?? []), copy]);
  for (const { part, at, box, points } of figureOf(bust).parts) {
    add({
      part,
      side: 'centre',
      site: 0,
      at: sum(bustAt, at),
      box: moved(box, bustAt),
      points: points.map((p) => sum(bustAt, p)),
    });
  }
  const anchors = Object.fromEntries(
    Object.entries(figureOf(bust).anchors).map(([name, at]) => [name, sum(bustAt, at)]),
  );
  for (const { model, anchor, turn: limbTurn } of limbs) {
    const own = figureOf(model).anchors[anchor];
    const unmirroredTurn = limbTurn && turnOf(model, limbTurn);
    for (const side of sides) {
      const hung = anchors[`${anchor}_${side}`];
      if (!hung || !own) throw new Error(`doll: no ${anchor} anchor to hang ${model} by on the ${side}`);
      const mirror = side === mirroredSide;
      const turn = mirror && unmirroredTurn ? mirroredTurn(unmirroredTurn) : unmirroredTurn;
      /** @type {(p: Vec3) => Vec3} a point of the limb's model frame, relative to where the site puts its origin */
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
      for (const { part, at, box, points } of figureOf(model).parts) {
        const local = moved(box, difference([0, 0, 0], own));
        const flipped = mirror ? mirrored(local) : local;
        add({
          part,
          side,
          site,
          at: sum(hung, place(difference(at, own))),
          box: moved(turn ? turned(flipped, turn) : flipped, hung),
          points: points.map((p) => sum(hung, place(difference(p, own)))),
          ...(mirror ? { mirror } : {}),
          ...(turn ? { turn } : {}),
        });
      }
    }
  }
  return { sites, parts, anchors };
}

// ---- dressing ----

/**
 * @param {DressModel} model
 * @param {string} facet
 */
const tagsOf = (model, facet) => facetTerms(model.tags, facet);

// A worn piece's garment and segment, read from its id, `<garment>_worn` or `<garment>_worn_<segment>`; nothing for a
// model that is no worn piece. A segment is one word, or a digit bone's word and number, as `index_01`. Pieces fitted
// over other clothing are not worn pieces here, so the doll wears each item on its own.
const PIECE_ID = /^(.+)_worn(?:_([^_]+(?:_\d+)?))?$/;
/**
 * A worn piece's id taken apart, whether or not the model is tagged as one.
 * @param {string} id
 * @returns {{ garment: string; segment: string | undefined } | undefined}
 */
export const wornPiece = (id) => {
  const match = PIECE_ID.exec(id);
  return match?.[1] === undefined ? undefined : { garment: match[1], segment: match[2] };
};
/** The garment a worn piece's id names, whether or not the model is tagged as one. @param {string} id */
export const wornGarment = (id) => wornPiece(id)?.garment;
/**
 * @param {DressModel} model
 * @returns {{ garment: string; segment: string | undefined } | undefined}
 */
const pieceOf = (model) => (tagsOf(model, 'fit').includes('worn') ? wornPiece(model.id) : undefined);

/**
 * The doll part whose frame a worn piece is drawn in, with the fitted part's origin in it if it has one: the slot of the
 * segment its id names, or of the dressing's `piece` without one.
 * @param {string} id
 * @param {{ segment: string | undefined }} piece
 * @param {DollDressing} dressing
 * @returns {PieceSlot}
 */
function pieceSlot(id, { segment }, dressing) {
  const named = segment ?? dressing.piece;
  const slot = dressing.slots[named];
  if (!slot) throw new Error(`${id}: worn segment ${named} is not in the dressing's slots`);
  const { part, origin, as, unhidden } = slot;
  return {
    part,
    ...(origin ? { origin } : {}),
    ...(as === undefined ? {} : { as }),
    ...(unhidden ? { unhidden } : {}),
  };
}

/**
 * The names a piece's `covers` gives on the doll, for the copy of `part` it is drawn in: the player's name for the
 * piece's part is the doll's own part, a region the doll cannot hide from the piece is no name at all, and a region the
 * doll holds as several whole parts, `part` among them, is the part, the only one of them the piece is drawn on.
 * @param {PieceSlot} slot
 * @param {string} part
 * @param {readonly string[]} covers
 * @param {DollDressing} dressing
 */
const coversOn = ({ as, unhidden }, part, covers, dressing) => [
  ...new Set(
    covers
      .filter((name) => !unhidden?.includes(name))
      .map((name) => (name === as || heldAmongParts(dressing, name, part) ? part : name)),
  ),
];

/**
 * Whether the doll's region `name` holds `part` whole beside other whole parts.
 * @param {DollDressing} dressing
 * @param {string} name
 * @param {string} part
 */
function heldAmongParts(dressing, name, part) {
  const wholes = (dressing.regions[name] ?? []).filter((surface) => surfacePart(surface) === surface);
  return wholes.includes(part) && wholes.length > 1;
}

/**
 * Why a slot's part is no single doll part, for a reader that names one, as a manifest's `wornOn` does.
 * @param {string} id
 * @param {SlotPart} part
 */
const notOnePart = (id, part) =>
  typeof part === 'string'
    ? undefined
    : `${id} is drawn in a part on each side, ${Object.values(part).join(' and ')}, not in one part`;

/**
 * The one doll part a piece is drawn in, for a reader that cannot take a problem list.
 * @param {string} id
 * @param {SlotPart} part
 * @returns {string}
 */
function onePart(id, part) {
  if (typeof part !== 'string') throw new Error(/** @type {string} */ (notOnePart(id, part)));
  return part;
}

/**
 * The worn pieces of the wearable `id`, each with the doll part whose frame it is drawn in (and the fitted part's
 * origin in it) and what it covers of that part, as its model declares, with the sole lift a foot piece declares.
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
    return [{ model: model.id, ...pieceSlot(model.id, piece, dressing), ...declared }];
  });
}

/** The doll part a region's surface lies on. @param {string} surface */
const surfacePart = (surface) => surface.split('#')[0];

/**
 * The doll parts besides `part` that a piece drawn on it and declaring `covers` leaves bare: those a region held beside
 * `part`, whether `part` is a piece of it or whole in it, holds whole when the declaration hides none of that region, as
 * a tank top covering the trunk leaves the clavicles bare with the rest of the shoulders. A part the region holds only
 * as a piece is not named, since the rest probe takes a piece to cover none of a named part's skin
 * (site/clearance.mjs, `coverage`).
 * @param {DollDressing} dressing
 * @param {string} part
 * @param {readonly string[]} covers
 */
const leftBare = (dressing, part, covers) => [
  ...new Set(
    Object.entries(dressing.regions).flatMap(([name, surfaces]) => {
      const holdsPart = surfaces.some((surface) => surfacePart(surface) === part);
      if (!holdsPart || covers.includes(part) || covers.includes(name)) return [];
      return surfaces.filter((surface) => surfacePart(surface) === surface && surface !== part);
    }),
  ),
];

/**
 * What is wrong with the worn pieces' `covers`: each name must be the doll part the piece is drawn on, or one of the
 * doll's regions drawn as a piece of that part, since a consumer hides by those names and no other: it hides the
 * primitives of a part that a name marks, and a region that holds the whole part marks none, so a shell over it names
 * the part.
 * @param {readonly DressModel[]} models
 * @param {DollDressing} dressing
 */
export function coversProblems(models, dressing) {
  return models.flatMap(({ id, covers }) => {
    if (!covers) return [];
    const worn = wornPiece(id);
    if (!worn) return [`${id} declares what it covers but is no worn piece`];
    const slot = pieceSlot(id, worn, dressing);
    const parts = typeof slot.part === 'string' ? [slot.part] : Object.values(slot.part);
    return parts.flatMap((part) => coversProblemsOn(id, part, coversOn(slot, part, covers, dressing), dressing));
  });
}

/**
 * What is wrong with the names a piece drawn in the doll part `part` covers there.
 * @param {string} id
 * @param {string} part
 * @param {readonly string[]} covers
 * @param {DollDressing} dressing
 */
function coversProblemsOn(id, part, covers, dressing) {
  const regions = Object.entries(dressing.regions).filter(([, surfaces]) =>
    surfaces.some((surface) => surface !== part && surfacePart(surface) === part),
  );
  const names = [part, ...regions.map(([region]) => region)];
  return covers
    .filter((name) => !names.includes(name))
    .map((name) =>
      dressing.regions[name]?.includes(part)
        ? `${id} covers ${name}, which holds its part ${part} whole, so names no piece of it: name ${part}`
        : `${id} covers ${name}, which is neither its part nor a region drawn on it: ${names.join(', ')}`,
    );
}

/**
 * The items any of whose worn pieces declares what it covers, by the pieces' ids, whether or not the tree holds the item
 * itself: a set of worn shells with no ground model is still dressed to check what it declares.
 * @param {readonly DressModel[]} models
 */
export const coveringItems = (models) => [
  ...new Set(
    models.flatMap((model) => {
      const item = model.covers ? pieceOf(model)?.garment : undefined;
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
  const piece = wornPiece(model.id);
  if (piece?.segment === undefined)
    throw new Error(`${model.id}: a piece fitted over other clothing is named <item>_worn_<layer>`);
  return `${piece.garment}_worn`;
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
    if (piece) wornOn.set(model.id, { part: onePart(model.id, pieceSlot(model.id, piece, dressing).part) });
    else if (twinId !== undefined) {
      const twin = byId.get(twinId);
      const twinPiece = twin && pieceOf(twin);
      if (!twin || !twinPiece)
        throw new Error(`${model.id}: fitted over other clothing, it has no worn twin ${twinId}`);
      wornOn.set(model.id, { part: onePart(twin.id, pieceSlot(twin.id, twinPiece, dressing).part) });
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

/** @typedef {ReturnType<typeof wornPieces>[number] & { copies: readonly PartCopy[] }} DrawnPiece */

/**
 * The copies of the doll part a slot's piece is drawn in, or nothing when the doll lacks it. A part given by side is a
 * part of the bust on each, and its mirrored side's is drawn mirrored, as a limb's mirrored copy is, since the piece is
 * built for the side that is not.
 * @param {SlotPart} part
 * @param {Doll} doll
 * @param {DollDressing} dressing
 * @returns {readonly PartCopy[] | undefined}
 */
function slotCopies(part, { parts }, { sides, mirrored }) {
  if (typeof part === 'string') return parts.get(part);
  const copies = sides.map((side) => {
    const copy = parts.get(part[side] ?? '')?.find((own) => own.side === 'centre');
    return copy && side === mirrored ? { ...copy, mirror: !copy.mirror } : copy;
  });
  return copies.every((copy) => copy !== undefined) ? copies : undefined;
}

/**
 * How `model` is worn on `doll`, or why it cannot be: a worn piece is drawn in each copy of a doll part its body must
 * hold, and a wearable with no pieces is placed by its anchor, which the doll's bust must have, or rested against its
 * place's part, on one copy if the doll rests that part turned, so that it is never stood on the doll as a prop beside
 * parts it has no place on.
 * @param {DressModel} model
 * @param {object} options
 * @param {DollDressing} options.dressing
 * @param {Doll} options.doll
 * @param {readonly DressModel[]} options.models
 * @returns {{ refusal: string } | { pieces: readonly DrawnPiece[] } | { anchored: Vec3; place: AnchorPlace } | { rested: readonly PartCopy[]; place: RestPlace }}
 */
function wornPlan(model, { dressing, doll, models }) {
  const pieces = wornPieces(model.id, models, dressing);
  if (pieces.length > 0) {
    /** @type {DrawnPiece[]} */
    const drawn = [];
    const missing = new Set();
    for (const piece of pieces) {
      const copies = slotCopies(piece.part, doll, dressing);
      if (copies) drawn.push({ ...piece, copies });
      else missing.add(typeof piece.part === 'string' ? piece.part : Object.values(piece.part).join(' or '));
    }
    return missing.size > 0
      ? { refusal: `the doll has no part ${[...missing].join(', ')}, which its pieces are drawn in` }
      : { pieces: drawn };
  }
  const place = placeOf(model, dressing);
  if (place.anchor !== undefined) {
    const at = doll.anchors[place.anchor];
    return at ? { anchored: at, place } : { refusal: `the doll has no anchor ${place.anchor} to place it at` };
  }
  const copies = doll.parts.get(place.part);
  if (!copies) return { refusal: `the doll has no part ${place.part} for its place` };
  const rested = place.both ? copies : copies.slice(0, 1);
  return rested.length > 1 && rested.some(({ turn }) => turn)
    ? {
        refusal: `placed loose across both copies of the ${place.part}, which the doll rests turned apart, so one model cannot follow both`,
      }
    : { rested, place };
}

/**
 * Why `model` cannot be shown worn on `doll`, or nothing when it can.
 * @param {DressModel} model
 * @param {Parameters<typeof wornPlan>[1]} options
 * @returns {string | undefined}
 */
export function wornRefusal(model, options) {
  const plan = wornPlan(model, options);
  return 'refusal' in plan ? plan.refusal : undefined;
}

/**
 * The sites that show `model` worn on the doll: the doll's own, then each worn piece in every copy of its part, or,
 * for a wearable with no pieces, the loose model placed by its first slot in the dressing's `places`: its own anchor of
 * the place's name at the bust anchor (its origin if it has none), or its box rested against the place's part and
 * turned with it.
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
  const plan = wornPlan(model, { dressing, doll, models });
  if ('refusal' in plan) throw new Error(`${model.id}: ${plan.refusal}`);
  const { sites } = doll;
  if ('pieces' in plan) {
    // A piece's site names the doll part copy it is drawn in, so a poser moves the piece with that part, and a piece
    // that covers some of that copy names the doll site drawing it, which a drawer hides it in (site/hiding.mjs), and
    // the parts across its joints it leaves bare.
    return [
      ...sites,
      ...plan.pieces.flatMap(({ model: piece, origin, covers, soleLift, copies, ...slot }) =>
        copies.map((copy) => {
          const { part, side, mirror, turn, site } = copy;
          const own = covers && coversOn(slot, part, covers, dressing);
          const bare = own ? leftBare(dressing, part, own) : [];
          return {
            model: piece,
            part,
            side,
            at: origin ? inCopy(copy, origin) : copy.at,
            ...(mirror ? { mirror } : {}),
            ...(turn ? { turn } : {}),
            ...(own ? { covers: own, bodySite: site } : {}),
            ...(bare.length > 0 ? { bare } : {}),
            ...(soleLift === undefined ? {} : { soleLift }),
          };
        }),
      ),
    ];
  }
  if ('anchored' in plan) {
    const { anchored, place } = plan;
    return [...sites, { model: model.id, at: difference(anchored, anchorsOf(model.id)[place.anchor] ?? [0, 0, 0]) }];
  }
  const { rested, place } = plan;
  // A turned copy is rested against in its exact bound, the frame its bone's `bind.bound` gives it, and the model then
  // swung with it, so the model meets the part's own faces, as a worn piece does, rather than the looser box of the
  // turned part.
  const [first] = rested;
  const bound = rested.length === 1 && first?.turn ? exactBound(first.points, first.turn, first.at) : undefined;
  const region = bound ? bound.box : union(rested.map(({ box }) => box));
  const lying = tagsOf(model, 'state').some((state) => dressing.lying.includes(state));
  const box = lying ? turned(boxOfModel(model.id), STAND) : boxOfModel(model.id);
  // Footwear's sole lies under the bare foot, so the figure stands on it (site/poseFile.mjs, `soleLift`).
  const hung = difference(rest(box, region, place), [0, model.soleLift ?? 0, 0]);
  const own = lying ? STAND : undefined;
  const at = bound ? sum(rotate(bound.turn, difference(hung, bound.about)), bound.about) : hung;
  const turn = bound ? (own ? product(bound.turn, own) : bound.turn) : own;
  return [
    ...sites,
    {
      model: model.id,
      at,
      ...(turn ? { turn } : {}),
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
