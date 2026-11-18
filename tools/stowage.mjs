// @ts-check
// Stowage slots and the kit stowed in them: a locker part's slots must hold their kit apart and clear of the part's own
// fit-out, and a site's load-out must name items that a slot accepts and that fit it. A slot is a female port of mount
// `stowage` with `accepts` and an `envelope` in its frame; an item stows by its one male `stowage` port, its seat, whose
// `standard` is its word. The why is in docs/decisions/0017-stowage-slots.md.
/** @import { Vec3 } from './packages/construct/src/foundation/math.ts' */
/** @import { Box } from './dress.mjs' */
/** @import { Placements, PlacementSite } from './placements.mjs' */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { modelBox } from './dress.mjs';
import { glbJson } from './glb.mjs';
import { outputPath, thingEntryFile } from './layout.mjs';
import { solid } from './pieceSolid.mjs';
import { sharedDepth } from './siteOverlap.mjs';

/** @typedef {{ position: Vec3; normal: Vec3; up: Vec3 }} PortFrame A port's origin, normal and up. */
/**
 * A stowage slot in the shape the export writes it.
 * @typedef {object} Slot
 * @property {string} id
 * @property {readonly string[] | undefined} [accepts]
 * @property {Box | undefined} [envelope]
 * @property {PortFrame} frame
 */
/**
 * A slot port as models/vehicles/slot-parts.json holds it.
 * @typedef {{ id: string; accepts?: readonly string[]; envelope?: Box; pos: Vec3; normal: Vec3; up: Vec3 }} SlotPort
 */
/** @typedef {{ id: string; kind: string } & Readonly<Record<string, unknown>>} FitOutPiece A piece of a part's fit-out. */
/** @typedef {{ id: string; partCount: number; ports: readonly SlotPort[]; pieces: readonly FitOutPiece[] }} SlotPart */
/**
 * What a built model says about stowage.
 * @typedef {object} Stowable
 * @property {Slot[]} slots
 * @property {{ standard: string | undefined; frame: PortFrame }[]} seats
 * @property {Box} bounds
 */
/** @typedef {ReturnType<typeof loadOutStowage>} LoadOutStowage */

const repo = resolve(import.meta.dirname, '..');
export const STOWAGE = 'stowage';
const AXES = /** @type {const} */ ([0, 1, 2]);
const EPSILON = 1e-6;

/**
 * @param {(axis: 0 | 1 | 2) => number} f
 * @returns {Vec3}
 */
const perAxis = (f) => [f(0), f(1), f(2)];
/** @param {(axis: 0 | 1 | 2) => number} f */
const sumAxes = (f) => AXES.reduce((/** @type {number} */ sum, axis) => sum + f(axis), 0);
/**
 * @param {Vec3} a
 * @param {Vec3} b
 */
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/**
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {Vec3}
 */
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/**
 * @param {Vec3} a
 * @param {Vec3} b
 */
const plus = (a, b) => perAxis((i) => a[i] + b[i]);
/**
 * @param {Vec3} a
 * @param {Vec3} b
 */
const minus = (a, b) => perAxis((i) => a[i] - b[i]);
/**
 * @param {Vec3} a
 * @param {number} k
 */
const times = (a, k) => perAxis((i) => a[i] * k);
/** @param {Box} box */
const corners = ({ min, max }) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => perAxis((a) => ((i >> a) & 1 ? max[a] : min[a])));
/**
 * @param {readonly Vec3[]} points
 * @returns {Box}
 */
const boxOf = (points) => ({
  min: perAxis((a) => Math.min(...points.map((p) => p[a]))),
  max: perAxis((a) => Math.max(...points.map((p) => p[a]))),
});
/** @param {unknown} v */
const isAxis = (v) =>
  Array.isArray(v) &&
  v.length === 3 &&
  v.filter((x) => Math.abs(x) > EPSILON).length === 1 &&
  v.some((x) => Math.abs(Math.abs(x) - 1) < EPSILON);

/**
 * A port's frame: its origin, x along its normal, y along its up and z = normal × up.
 * @param {PortFrame} frame
 */
const frameOf = ({ position, normal, up }) => ({ position, x: normal, y: up, z: cross(normal, up) });
/**
 * A point given in a frame, in the frame that holds it.
 * @param {ReturnType<typeof frameOf>} frame
 * @param {Vec3} point
 */
const outOf = (frame, [x, y, z]) =>
  plus(frame.position, plus(times(frame.x, x), plus(times(frame.y, y), times(frame.z, z))));

/**
 * The box an item's bounds fill in the frame of the slot it is seated in: the seat meets the slot as ports mate, its
 * normal against the slot's and its up along the slot's, so the seat's x and z come out reversed.
 * @param {PortFrame} seat
 * @param {Box} bounds
 */
export function seatedBounds(seat, bounds) {
  const frame = frameOf(seat);
  return boxOf(
    corners(bounds).map((p) => {
      const d = minus(p, frame.position);
      return [-dot(d, frame.x), dot(d, frame.y), -dot(d, frame.z)];
    }),
  );
}

/**
 * The item's pose in the frame its slot is given in: a row-major rotation and the translation that seats it.
 * @param {PortFrame} slot
 * @param {PortFrame} seat
 */
export function stowedPose(slot, seat) {
  const s = frameOf(slot);
  const i = frameOf(seat);
  /** @type {readonly [Vec3, Vec3, Vec3]} */
  const into = [times(s.x, -1), s.y, times(s.z, -1)];
  /** @type {readonly [Vec3, Vec3, Vec3]} */
  const seatAxes = [i.x, i.y, i.z];
  // rotation = into · [i.x i.y i.z]ᵀ, taking each seat axis onto its partner in the slot.
  /** @param {0 | 1 | 2} row */
  const rowOf = (row) => perAxis((col) => sumAxes((k) => into[k][row] * seatAxes[k][col]));
  /** @type {readonly [Vec3, Vec3, Vec3]} */
  const matrix = [rowOf(0), rowOf(1), rowOf(2)];
  const turned = perAxis((row) => sumAxes((col) => matrix[row][col] * seat.position[col]));
  return { rotation: matrix.flat(), at: minus(s.position, turned) };
}

/**
 * A far-side twin's slot: its point reflected across the vehicle's centre plane, whose normal is `lateral`, and its axes
 * turned half a turn about the vertical y, since a stowed item is a real thing and is never reflected.
 * @template {PortFrame} T
 * @param {T} slot
 * @param {number} lateral
 */
export function farSlot(slot, lateral) {
  /** @param {Vec3} p */
  const reflect = (p) => perAxis((a) => (a === lateral ? -p[a] : p[a]));
  /**
   * @param {Vec3} v
   * @returns {Vec3}
   */
  const turn = ([x, y, z]) => [-x, y, -z];
  return { ...slot, position: reflect(slot.position), normal: turn(slot.normal), up: turn(slot.up) };
}

// ---- the slots of a part, in its source frame ----

// Every vehicle row with stowage slots: { id, partCount, ports, pieces }, its first part's slots and pieces in the vehicle
// frame (models/vehicles/frame.libsonnet). Read from its Jsonnet twin, which installJsonnetSources compiles only when a
// file it imports has changed, since evaluating every vehicle row is most of the report's cost.
const SLOT_PARTS = 'models/vehicles/slot-parts.json';
/** @returns {{ grain: number; parts: SlotPart[] }} */
export const readSlotParts = (root = repo) => JSON.parse(readFileSync(join(root, SLOT_PARTS), 'utf8'));

/**
 * A slot port as authored, in the shape the export writes it.
 * @param {SlotPort} port
 * @returns {Slot}
 */
export const slotOf = ({ id, accepts, envelope, pos, normal, up }) => ({
  id,
  accepts,
  envelope,
  frame: { position: pos, normal, up },
});

/**
 * The envelope as a box in the frame the slot is given in; the slot's axes are the frame's, so it stays a box.
 * @param {Box} envelope
 * @param {PortFrame} frame
 */
const envelopeBox = (envelope, frame) => boxOf(corners(envelope).map((p) => outOf(frameOf(frame), p)));

/**
 * Why a part's slots cannot hold kit apart and clear of its fit-out, as messages. The part is given in the vehicle
 * frame, `length` being the axis along the vehicle. An envelope may touch another or a piece but not reach into it,
 * since kit filling it would then stand in the other's; pieces are sampled `grain` apart for their depth.
 * @param {{ id: string; slots: readonly Slot[]; pieces: readonly FitOutPiece[] }} part
 * @param {number} grain
 * @param {0 | 1 | 2} [length]
 */
export function slotProblems({ id, slots, pieces }, grain, length = 0) {
  /** @type {string[]} */
  const problems = [];
  const seen = new Set();
  /** @type {{ id: string; box: Box }[]} */
  const sound = [];
  for (const slot of slots) {
    const where = `${id}.${slot.id}`;
    if (seen.has(slot.id)) problems.push(`${where}: two slots of one id`);
    seen.add(slot.id);
    if (!Array.isArray(slot.accepts) || slot.accepts.length === 0) problems.push(`${where}: accepts no word`);
    const { normal, up } = slot.frame;
    if (!isAxis(normal) || !isAxis(up) || Math.abs(dot(normal, up)) > EPSILON) {
      problems.push(`${where}: its normal and up are not two different axes of the vehicle`);
      continue;
    }
    const { envelope } = slot;
    if (!envelope || !AXES.every((a) => envelope.min[a] < envelope.max[a])) {
      problems.push(`${where}: has no envelope`);
      continue;
    }
    const box = envelopeBox(envelope, slot.frame);
    const origin = slot.frame.position[length];
    if (Math.abs(box.max[length] - origin - (origin - box.min[length])) > EPSILON) {
      problems.push(
        `${where}: its envelope is not centred on it along the vehicle, so its far twin's would not be its reflection`,
      );
    }
    sound.push({ id: slot.id, box });
  }
  for (const [i, first] of sound.entries()) {
    for (const second of sound.slice(i + 1)) {
      const [a, b] = [first.box, second.box];
      if (AXES.every((k) => Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]) > EPSILON)) {
        problems.push(`${id}: the envelopes of ${first.id} and ${second.id} overlap`);
      }
    }
  }
  for (const { id: slot, box } of sound) {
    const envelope = solid({ kind: 'box', ...box });
    for (const piece of pieces) {
      const depth = 2 * sharedDepth(envelope, solid(piece), EPSILON, grain / 2);
      if (depth > 2 * EPSILON)
        problems.push(`${id}.${slot}: its envelope reaches ${Math.round(depth * 1e3)} mm into ${piece.id}`);
    }
  }
  return problems;
}

/**
 * A row's slot problems (readSlotParts). Slots are checked against one part's fit-out, so a row of several parts
 * cannot hold them.
 * @param {SlotPart} part
 * @param {number} grain
 */
export function slotRowProblems({ id, partCount, ports, pieces }, grain) {
  if (partCount !== 1) return [`${id}: has stowage slots but is built of ${partCount} parts, not one`];
  return slotProblems({ id, slots: ports.map(slotOf), pieces }, grain);
}

// Every stowage part's slot problems, from source.
export function stowageReport(root = repo) {
  const { grain, parts } = readSlotParts(root);
  return parts.flatMap((part) => slotRowProblems(part, grain));
}

// ---- load-outs, against the built models ----

/**
 * What the built models say about stowage, for the ids asked: model id -> { slots, seats, bounds }, slots and seats in
 * the model frame as the GLB's port nodes give them, bounds the model's box.
 * @param {string} out
 * @param {readonly { id: string; pack: string; path: string }[]} models
 * @param {readonly string[]} ids
 */
export function readStowage(out, models, ids) {
  const byId = new Map(models.map((model) => [model.id, model]));
  return new Map(
    [...new Set(ids)].flatMap((id) => {
      const model = byId.get(id);
      if (!model) return [];
      const buffer = readFileSync(join(out, outputPath(model.pack, model.path)));
      const ports = glbJson(buffer).nodes.flatMap((node) => {
        const port = node.extras?.port;
        return port?.mount === STOWAGE ? [port] : [];
      });
      /** @type {Stowable} */
      const stowable = {
        slots: ports
          .filter(({ gender }) => gender === 'female')
          .map(({ id: portId, accepts, envelope, frame }) => ({
            id: portId.slice(portId.lastIndexOf('.') + 1),
            accepts,
            envelope,
            frame,
          })),
        seats: ports.filter(({ gender }) => gender === 'male').map(({ standard, frame }) => ({ standard, frame })),
        bounds: modelBox(buffer),
      };
      return [/** @type {const} */ ([id, stowable])];
    }),
  );
}

/**
 * The stowage the placements need, for tools/placements.mjs, placementProblems, read from the built tree: `items`, the
 * parts and items the load-outs name; `moving`, the parts that `behind` names a site of and that carry a motion, so
 * open to show what they hide.
 * @param {string} out
 * @param {readonly { id: string; pack: string; path: string }[]} models
 * @param {Placements} placements
 */
export function loadOutStowage(out, models, placements) {
  const vehicles = Object.values(placements).map(({ sites }) => sites ?? []);
  const ids = vehicles
    .flat()
    .filter((site) => site?.stowed !== undefined)
    .flatMap((site) => [site.part, ...Object.values(site.stowed ?? {})]);
  const closures = vehicles.flatMap((sites) =>
    sites.flatMap((site) => {
      if (site?.behind === undefined) return [];
      const part = sites.find((other) => other?.id === site.behind)?.part;
      return part === undefined ? [] : [part];
    }),
  );
  const packOf = new Map(models.map((model) => [model.id, model.pack]));
  const moving = new Set(
    [...new Set(closures)].filter((id) => {
      const pack = packOf.get(id);
      if (pack === undefined) return false;
      const sidecar = join(out, thingEntryFile(pack, id));
      return existsSync(sidecar) && JSON.parse(readFileSync(sidecar, 'utf8')).motion?.length > 0;
    }),
  );
  return { items: readStowage(out, models, ids), moving };
}

/**
 * Why a site's load-out cannot be stowed, as messages: every slot it names is one of the part's, and every item is a
 * built model with one seat whose word the slot accepts and whose bounds, seated, stay inside the envelope. Packs are
 * checked with the site's other models (tools/placements.mjs, siteProblems).
 * @param {string} where
 * @param {PlacementSite} site
 * @param {ReadonlyMap<string, Stowable>} stowage
 * @returns {string[]}
 */
export function loadOutProblems(where, site, stowage) {
  const { stowed } = site;
  if (stowed === null || typeof stowed !== 'object' || Array.isArray(stowed))
    return [`${where}: stowed is not slot -> item`];
  const slots = new Map((stowage.get(site.part)?.slots ?? []).map((slot) => [slot.id, slot]));
  return Object.entries(stowed).flatMap(([slotId, item]) => {
    const at = `${where}.${slotId}`;
    const slot = slots.get(slotId);
    if (!slot) return [`${at}: ${site.part} has no stowage slot ${slotId}`];
    const stowable = stowage.get(item);
    // An item that is not built is reported with the site's other models.
    if (!stowable) return [];
    const { accepts, envelope } = slot;
    if (!Array.isArray(accepts) || !envelope?.min || !envelope?.max)
      return [`${at}: the slot has no accepts or envelope`];
    const [seat, ...others] = stowable.seats;
    if (!seat || others.length > 0) return [`${at}: ${item} has ${stowable.seats.length} stowage seats, not one`];
    if (seat.standard === undefined || !accepts.includes(seat.standard))
      return [`${at}: ${item} stows as ${seat.standard}, which the slot does not accept (${accepts.join(' ')})`];
    const filled = seatedBounds(seat.frame, stowable.bounds);
    const over = AXES.filter(
      (a) => filled.min[a] < envelope.min[a] - EPSILON || filled.max[a] > envelope.max[a] + EPSILON,
    );
    return over.length === 0
      ? []
      : [`${at}: ${item} does not fit the slot's envelope along its ${over.map((a) => 'xyz'[a]).join(', ')}`];
  });
}
