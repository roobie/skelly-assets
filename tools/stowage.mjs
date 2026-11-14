// Stowage slots and the kit stowed in them: a locker part's slots must hold their kit apart and clear of the part's own
// fit-out, and a site's load-out must name items that a slot accepts and that fit it. A slot is a female port of mount
// `stowage` with `accepts` and an `envelope` in its frame; an item stows by its one male `stowage` port, its seat, whose
// `standard` is its word. The why is in docs/decisions/0016-stowage-slots.md.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { modelBox } from './dress.mjs';
import { glbJson } from './glb.mjs';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { outputPath } from './layout.mjs';
import { solid } from './pieceSolid.mjs';
import { sharedDepth } from './siteOverlap.mjs';

const repo = resolve(import.meta.dirname, '..');
export const STOWAGE = 'stowage';
const AXES = [0, 1, 2];
const EPSILON = 1e-6;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const plus = (a, b) => a.map((x, i) => x + b[i]);
const minus = (a, b) => a.map((x, i) => x - b[i]);
const times = (a, k) => a.map((x) => x * k);
const corners = ({ min, max }) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => AXES.map((a) => ((i >> a) & 1 ? max[a] : min[a])));
const boxOf = (points) => ({
  min: AXES.map((a) => Math.min(...points.map((p) => p[a]))),
  max: AXES.map((a) => Math.max(...points.map((p) => p[a]))),
});
const isAxis = (v) => Array.isArray(v) && v.length === 3 && v.filter((x) => Math.abs(x) > EPSILON).length === 1 && v.some((x) => Math.abs(Math.abs(x) - 1) < EPSILON);

// A port's frame: its origin, x along its normal, y along its up and z = normal × up.
const frameOf = ({ position, normal, up }) => ({ position, x: normal, y: up, z: cross(normal, up) });
// A point given in a frame, in the frame that holds it.
const outOf = (frame, [x, y, z]) => plus(frame.position, plus(times(frame.x, x), plus(times(frame.y, y), times(frame.z, z))));

// The box an item's bounds fill in the frame of the slot it is seated in: the seat meets the slot as ports mate, its
// normal against the slot's and its up along the slot's, so the seat's x and z come out reversed.
export function seatedBounds(seat, bounds) {
  const frame = frameOf(seat);
  return boxOf(corners(bounds).map((p) => {
    const d = minus(p, frame.position);
    return [-dot(d, frame.x), dot(d, frame.y), -dot(d, frame.z)];
  }));
}

// The item's pose in the frame its slot is given in: a row-major rotation and the translation that seats it.
export function stowedPose(slot, seat) {
  const s = frameOf(slot);
  const i = frameOf(seat);
  const into = [times(s.x, -1), s.y, times(s.z, -1)];
  // rotation = into · [i.x i.y i.z]ᵀ, taking each seat axis onto its partner in the slot.
  const rotation = AXES.flatMap((row) => AXES.map((col) => AXES.reduce((sum, k) => sum + into[k][row] * [i.x, i.y, i.z][k][col], 0)));
  const turned = AXES.map((row) => AXES.reduce((sum, col) => sum + rotation[row * 3 + col] * seat.position[col], 0));
  return { rotation, at: minus(s.position, turned) };
}

// A far-side twin's slot: its point reflected across the vehicle's centre plane, whose normal is `lateral`, and its axes
// turned half a turn about the vertical y, since a stowed item is a real thing and is never reflected.
export function farSlot(slot, lateral) {
  const reflect = (p) => p.map((x, a) => (a === lateral ? -x : x));
  const turn = ([x, y, z]) => [-x, y, -z];
  return { ...slot, position: reflect(slot.position), normal: turn(slot.normal), up: turn(slot.up) };
}

// ---- the slots of a part, in its source frame ----

// Every vehicle row with stowage slots: { id, partCount, ports, pieces }, its first part's slots and pieces in the vehicle
// frame (models/vehicles/frame.libsonnet). Only rows with slots are manifested, which keeps the evaluation cheap.
export function readSlotParts(root = repo) {
  return JSON.parse(evaluateJsonnet(`
  local rows = std.flattenArrays(std.objectValues(import 'models/vehicles/index.libsonnet'));
  {
    grain: (import 'models/voxel-grains.libsonnet').classes.vehicle.grain,
    parts: [
      {
        id: row.id,
        partCount: std.length(row.parts),
        ports: [port for port in row.parts[0].ports if port.mount == '${STOWAGE}'],
        pieces: std.parseJson(std.get(row.parts[0].params, 'pieces', '[]')),
      }
      for row in rows
      if std.length([port for part in row.parts for port in part.ports if port.mount == '${STOWAGE}']) > 0
    ],
  }`, root));
}

// A slot port as authored, in the shape the export writes it.
export const slotOf = ({ id, accepts, envelope, pos, normal, up }) => ({ id, accepts, envelope, frame: { position: pos, normal, up } });

// The envelope as a box in the frame the slot is given in; the slot's axes are the frame's, so it stays a box.
const envelopeBox = (slot) => boxOf(corners(slot.envelope).map((p) => outOf(frameOf(slot.frame), p)));

// Why a part's slots cannot hold kit apart and clear of its fit-out, as messages. The part is given in the vehicle
// frame, `length` being the axis along the vehicle. An envelope may touch another or a piece but not reach into it,
// since kit filling it would then stand in the other's; pieces are sampled `grain` apart for their depth.
export function slotProblems({ id, slots, pieces }, grain, length = 0) {
  const problems = [];
  const seen = new Set();
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
    if (!slot.envelope || !AXES.every((a) => slot.envelope.min[a] < slot.envelope.max[a])) {
      problems.push(`${where}: has no envelope`);
      continue;
    }
    const box = envelopeBox(slot);
    const origin = slot.frame.position[length];
    if (Math.abs(box.max[length] - origin - (origin - box.min[length])) > EPSILON) {
      problems.push(`${where}: its envelope is not centred on it along the vehicle, so its far twin's would not be its reflection`);
    }
    sound.push({ id: slot.id, box });
  }
  for (let i = 0; i < sound.length; i++) {
    for (let j = i + 1; j < sound.length; j++) {
      const [a, b] = [sound[i].box, sound[j].box];
      if (AXES.every((k) => Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]) > EPSILON)) {
        problems.push(`${id}: the envelopes of ${sound[i].id} and ${sound[j].id} overlap`);
      }
    }
  }
  for (const { id: slot, box } of sound) {
    const envelope = solid({ kind: 'box', ...box });
    for (const piece of pieces) {
      const depth = 2 * sharedDepth(envelope, solid(piece), EPSILON, grain / 2);
      if (depth > 2 * EPSILON) problems.push(`${id}.${slot}: its envelope reaches ${Math.round(depth * 1e3)} mm into ${piece.id}`);
    }
  }
  return problems;
}

// A row's slot problems (readSlotParts). Slots are checked against one part's fit-out, so a row of several parts
// cannot hold them.
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

// What the built models say about stowage, for the ids asked: model id -> { slots, seats, bounds }, slots and seats in
// the model frame as the GLB's port nodes give them, bounds the model's box.
export function readStowage(out, models, ids) {
  const byId = new Map(models.map((model) => [model.id, model]));
  return new Map([...new Set(ids)].filter((id) => byId.has(id)).map((id) => {
    const { pack, path } = byId.get(id);
    const buffer = readFileSync(join(out, outputPath(pack, path)));
    const ports = glbJson(buffer).nodes.map((node) => node.extras?.port).filter((port) => port?.mount === STOWAGE);
    return [id, {
      slots: ports.filter(({ gender }) => gender === 'female').map(({ id: portId, accepts, envelope, frame }) => ({ id: portId.split('.').at(-1), accepts, envelope, frame })),
      seats: ports.filter(({ gender }) => gender === 'male').map(({ standard, frame }) => ({ standard, frame })),
      bounds: modelBox(buffer),
    }];
  }));
}

// The stowage the placements need, for tools/placements.mjs, placementProblems, read from the built tree: `items`, the
// parts and items the load-outs name; `moving`, the parts that `behind` names a site of and that carry a motion, so
// open to show what they hide.
export function loadOutStowage(out, models, placements) {
  const vehicles = Object.values(placements).map(({ sites }) => sites ?? []);
  const ids = vehicles.flat().filter((site) => site?.stowed !== undefined).flatMap((site) => [site.part, ...Object.values(site.stowed ?? {})]);
  const closures = vehicles.flatMap((sites) => sites.filter((site) => site?.behind !== undefined)
    .map((site) => sites.find((other) => other?.id === site.behind)?.part).filter((part) => part !== undefined));
  const packOf = new Map(models.map((model) => [model.id, model.pack]));
  const moving = new Set([...new Set(closures)].filter((id) => {
    const sidecar = join(out, packOf.get(id) ?? '', 'things', `${id}.model.json`);
    return packOf.has(id) && existsSync(sidecar) && JSON.parse(readFileSync(sidecar, 'utf8')).motion?.length > 0;
  }));
  return { items: readStowage(out, models, ids), moving };
}

// Why a site's load-out cannot be stowed, as messages: every slot it names is one of the part's, and every item is a
// built model with one seat whose word the slot accepts and whose bounds, seated, stay inside the envelope. Packs are
// checked with the site's other models (tools/placements.mjs, siteProblems).
export function loadOutProblems(where, site, stowage) {
  const { stowed } = site;
  if (stowed === null || typeof stowed !== 'object' || Array.isArray(stowed)) return [`${where}: stowed is not slot -> item`];
  const slots = new Map((stowage.get(site.part)?.slots ?? []).map((slot) => [slot.id, slot]));
  return Object.entries(stowed).flatMap(([slotId, item]) => {
    const at = `${where}.${slotId}`;
    const slot = slots.get(slotId);
    if (!slot) return [`${at}: ${site.part} has no stowage slot ${slotId}`];
    const stowable = stowage.get(item);
    // An item that is not built is reported with the site's other models.
    if (!stowable) return [];
    if (!Array.isArray(slot.accepts) || !slot.envelope?.min || !slot.envelope?.max) return [`${at}: the slot has no accepts or envelope`];
    if (stowable.seats.length !== 1) return [`${at}: ${item} has ${stowable.seats.length} stowage seats, not one`];
    const [seat] = stowable.seats;
    if (!slot.accepts.includes(seat.standard)) return [`${at}: ${item} stows as ${seat.standard}, which the slot does not accept (${slot.accepts.join(' ')})`];
    const filled = seatedBounds(seat.frame, stowable.bounds);
    const over = AXES.filter((a) => filled.min[a] < slot.envelope.min[a] - EPSILON || filled.max[a] > slot.envelope.max[a] + EPSILON);
    return over.length === 0 ? [] : [`${at}: ${item} does not fit the slot's envelope along its ${over.map((a) => 'xyz'[a]).join(', ')}`];
  });
}
