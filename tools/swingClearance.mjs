// Proves that the parts of a vehicle that open swing clear of the rest of it. Each site whose part has a motion sweeps
// from rest to its stop against every other site's pieces and the ground, and every such site opens at once for a final
// pose that catches doors meeting each other. Contact is judged relative to rest: a pair counts only when it sinks a
// quarter grain deeper than it already does closed, so the overlaps the seating fits and the allowances of
// tools/siteOverlap.mjs already judge are not found again, while a thin lid crossing a thin lip is. A part that rides
// another (`rides` on its site) moves with it, its own motion if it has one nested inside its carrier's. A rider that
// does not move is part of its carrier's body and is not tested against it; one that moves is a body of its own, swept
// against its carrier and against the other riders of that carrier, both moving on the one clock, because a panel that
// folds onto its carrier meets it only while it moves. What a stowing slide hides is not there to meet anything, so it
// is left out while it is hidden. A contact is allowed by the vehicle's own placements: `swingContact` for one that is
// intended and says why, `swingUnjudged` for one nobody has judged yet, which every run lists. Both are capped at the
// depth they were written for, a variant shares its parent's, and an entry that no longer applies fails. The reason for
// the rules and the cost strategy are in `docs/decisions/0016-swing-check.md`.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join, resolve } from 'node:path';
import { dot } from './packages/construct/src/foundation/math.ts';
import { FRONT_TURNS, toModelFrame } from './packages/thing-core/src/frame.ts';
import { centreOf, cornersOf, hingeSense, piecesBounds, pinAxis, shareStages, TOWARD } from './packages/thing-core/src/motion.ts';
import { shardUnits } from './generation.mjs';
import { codeFingerprint } from './packages/thing-export/src/cache.ts';
import { key } from './siteOverlap.mjs';
import { poseAt, shapeOf, stowPlanesOf, sweepBody, sweepOpenPose } from './swingSweep.mjs';
import { workerPool } from './workerPool.mjs';

const EPSILON = 1e-9;
const LOOSE = 1; // grains a cap may exceed the depth it was measured at
export const GROUND = 'ground';
const millimetres = (metres) => Math.round(metres * 1e3);

// The ground as a shape: a slab below y = 0, deep as far as any part reaches.
const ground = { id: GROUND, min: [-1e4, -1e3, -1e4], max: [1e4, 0, 1e4], distance: (p) => Math.max(-1e4 - p[0], p[0] - 1e4, -1e3 - p[1], p[1], -1e4 - p[2], p[2] - 1e4) };

// A direction of the model frame, in the vehicle's authored frame.
const fromModelFrame = (forward, [x, y, z]) => {
  const m = FRONT_TURNS[forward];
  return [0, 1, 2].map((j) => m[j] * x + m[3 + j] * y + m[6 + j] * z);
};

// A part's motion as authored, with its pins, resolved in the vehicle frame for the part at its own origin: the same
// derivation the build exports, so the swing proven is the swing played (docs/decisions/0015-motion-as-content.md). A
// stowing slide's plane is the leading face of the part's rest bounds, as the solids the check measures draw it.
export function resolveMotion({ stages, pieces }, forward, grain) {
  const bounds = piecesBounds(pieces);
  const centre = toModelFrame(forward, centreOf(bounds));
  const moves = stages.map((stage) => {
    if (stage.kind === 'slide') {
      const direction = fromModelFrame(forward, TOWARD[stage.toward]);
      const stow = stage.stow ? { stow: Math.max(...cornersOf(bounds).map((corner) => dot(corner, direction))) } : {};
      return { kind: 'slide', direction, travel: stage.travel, ...stow };
    }
    const pins = stage.pins.map((id) => pieces.find((piece) => piece.id === id));
    const axis = pinAxis(pins, grain);
    const sense = hingeSense({ from: toModelFrame(forward, axis.from), to: toModelFrame(forward, axis.to) }, centre, stage.toward, grain);
    return { kind: 'hinge', axis, angle: sense * stage.open };
  });
  return shareStages(moves, cornersOf(bounds));
}

// A motion for a part placed at a site: reflected across the centre plane for a far-side twin, as the part itself is,
// then carried to the site's position.
export function motionAtSite(motion, { at, mirror }) {
  const reflect = ([x, y, z]) => [x, y, 0 - z];
  const shift = (point) => [point[0] + at[0], point[1] + at[1], point[2] + at[2]];
  return motion.map((stage) => {
    if (stage.kind === 'slide') {
      const direction = mirror ? reflect(stage.direction) : stage.direction;
      return { ...stage, direction, ...(stage.stow === undefined ? {} : { stow: stage.stow + dot(at, direction) }) };
    }
    const [from, to] = [stage.axis.from, stage.axis.to].map((point) => shift(mirror ? reflect(point) : point));
    return { ...stage, axis: { from, to }, angle: mirror ? -stage.angle : stage.angle };
  });
}

// How far a body's motion opens, for a message: its degrees or millimetres when it is one stage, else null.
const extentOf = (layers) => {
  if (layers.length !== 1 || layers[0].length !== 1) return null;
  const [[stage]] = layers;
  return stage.kind === 'slide' ? { unit: 'mm', total: millimetres(stage.travel) } : { unit: '°', total: Math.round(Math.abs(stage.angle)) };
};

// One vehicle's sweep: for every moving site, how far it opens before it touches anything and each contact it makes, and
// the pairs of moving sites that touch with all of them open. It reads only its task, so a worker can run it and a
// cache can keep it. The task is { grain, forward, motions, sites }; a site is { id, part, at, mirror?, rides?, pieces }.
export function sweepVehicle({ grain, forward, motions, sites }) {
  const resolved = new Map();
  const motionOf = (site) => {
    if (!motions[site.part]) return null;
    if (!resolved.has(site.part)) resolved.set(site.part, resolveMotion(motions[site.part], forward, grain));
    return motionAtSite(resolved.get(site.part), site);
  };
  const byId = new Map(sites.map((site) => [site.id, site]));
  const own = new Map(sites.map((site) => [site.id, motionOf(site)]));
  // The chain of carriers a site rides, nearest first.
  const carriersOf = (site) => (site.rides ? [byId.get(site.rides), ...carriersOf(byId.get(site.rides))] : []);
  // The site whose own motion moves this one: itself, or the nearest carrier that has one.
  const anchorOf = (site) => [site, ...carriersOf(site)].find(({ id }) => own.get(id)) ?? null;
  const shapes = new Map(sites.map((site) => [site.id, site.pieces.map(shapeOf)]));
  const anchors = sites.filter((site) => own.get(site.id));
  const bodies = anchors.map((anchor) => {
    const carriers = carriersOf(anchor).filter(({ id }) => own.get(id));
    const members = sites.filter((site) => anchorOf(site) === anchor).map(({ id }) => id);
    return { site: anchor.id, layers: [...carriers].reverse().concat(anchor).map(({ id }) => own.get(id)), members, carriers: carriers.map(({ id }) => id) };
  });
  const step = grain / 4;
  const result = { sites: {}, open: [] };
  const bodyOf = new Map(bodies.flatMap((body) => body.members.map((id) => [id, body])));
  for (const body of bodies) {
    const members = new Set(body.members);
    const movers = body.members.flatMap((id) => shapes.get(id).map((shape) => ({ site: id, shape })));
    // What shares a carrier with this body moves with it on the one clock; what shares none stands at rest.
    const obstacles = [
      ...sites.filter(({ id }) => !members.has(id)).flatMap(({ id }) => {
        const layers = bodyOf.get(id)?.layers ?? [];
        return shapes.get(id).map((shape) => ({ site: id, shape, layers: layers[0] === body.layers[0] ? layers : [] }));
      }),
      { site: GROUND, shape: ground, layers: [] },
    ];
    const { clear, contacts } = sweepBody({ layers: body.layers, movers, obstacles, step, tolerance: step });
    result.sites[body.site] = { clear, extent: extentOf(body.layers), contacts: [...contacts].map(([other, contact]) => ({ other, ...contact })) };
  }
  const posed = bodies.map(({ site, layers, members, carriers }) => ({
    site, carriers, pose: poseAt(layers, 1), planes: stowPlanesOf(layers), shapes: members.flatMap((id) => shapes.get(id)), members,
  }));
  const related = (a, b) => a.carriers.includes(b.site) || b.carriers.includes(a.site);
  const open = sweepOpenPose({ bodies: posed, step, tolerance: step, key, related });
  result.open = [...open.values()];
  return result;
}

// What a swept vehicle's report is about: the moving sites of each vehicle with their parts' motions. Every site of a
// vehicle goes in, because a moving part meets them all.
export function sweepTasks({ grain, motions, vehicles }) {
  return Object.fromEntries(Object.entries(vehicles)
    .filter(([, { sites }]) => sites.some(({ part }) => motions[part]))
    .map(([vehicle, { forward, sites }]) => {
      const parts = new Set(sites.map(({ part }) => part));
      const used = Object.fromEntries(Object.entries(motions).filter(([part]) => parts.has(part)));
      return [vehicle, { grain, forward, motions: used, sites: sites.map(({ id, part, at, mirror, rides, pieces }) => ({ id, part, at, mirror, rides, pieces })) }];
    }));
}

const HERE = import.meta.dirname;
// The code a sweep runs, whole folders for the shared packages since naming their modules one by one would miss a new
// import. A cached sweep is only as good as the code and the runtime that made it.
const CHECKER_CODE = ['swingClearance.mjs', 'swingSweep.mjs', 'pieceSolid.mjs', 'packages/thing-core/src', 'packages/construct/src/foundation'];
const checkerHash = () => codeFingerprint(HERE, CHECKER_CODE);

const taskHash = (task, checker) => createHash('sha256').update(checker).update(JSON.stringify(task)).digest('hex').slice(0, 32);
const CACHE_FOLDER = 'swing';

// The sweeps of every vehicle with a moving part: from the cache folder when a vehicle's inputs and the checker are as
// they were, else swept on worker threads, one vehicle each, and kept. Vehicles with the same inputs share one sweep.
// `checker` is the fingerprint of the code that sweeps, which a test may change. With `shard`, only that shard of the
// distinct sweeps is made, so CI can spread a clean build's sweeps over runners like its models (tools/build.mjs,
// fillCacheShard). With `prune`, entries no vehicle uses any more go, as a full build is the only run that knows them all.
export async function swingResults(data, { cache, workers = availableParallelism(), prune = false, shard, checker = checkerHash() } = {}) {
  const tasks = sweepTasks(data);
  const folder = cache === undefined ? undefined : join(resolve(cache), CACHE_FOLDER);
  if (folder) mkdirSync(folder, { recursive: true });
  const byHash = new Map();
  for (const [vehicle, task] of Object.entries(tasks)) {
    const hash = taskHash(task, checker);
    byHash.set(hash, { task, vehicles: [...(byHash.get(hash)?.vehicles ?? []), vehicle] });
  }
  const fileOf = (hash) => join(folder, `${hash}.json`);
  const swept = new Map();
  const missing = [];
  const mine = shard === undefined ? [...byHash] : shardUnits([...byHash], shard);
  for (const [hash, { task }] of mine) {
    if (folder && existsSync(fileOf(hash))) swept.set(hash, JSON.parse(readFileSync(fileOf(hash), 'utf8')));
    else missing.push([hash, task]);
  }
  if (missing.length > 0) {
    const pool = workerPool(import.meta.url, 'sweepVehicle', Math.min(workers, missing.length));
    try {
      await Promise.all(missing.map(async ([hash, task]) => {
        const result = await pool.run(task);
        swept.set(hash, result);
        if (folder) writeFileSync(fileOf(hash), JSON.stringify(result));
      }));
    } finally {
      await pool.close();
    }
  }
  if (folder && prune) {
    for (const name of readdirSync(folder)) if (!byHash.has(name.replace(/\.json$/, ''))) rmSync(join(folder, name));
  }
  const results = {};
  for (const [hash, { vehicles }] of byHash) if (swept.has(hash)) for (const vehicle of vehicles) results[vehicle] = swept.get(hash);
  return { results, reused: mine.length - missing.length, swept: missing.length };
}

// Every pair of sites that touch in a vehicle's sweep, as Map(pair key -> { sites, depth, pieces, at?, extent?, sweep }):
// the deepest the pair reaches whether one opens against the other or both are open, `at` the clock it first touches
// as one opens, and `sweep` whether that is the case.
export function foundContacts(result) {
  const found = new Map();
  for (const [site, { contacts, extent }] of Object.entries(result.sites)) {
    for (const contact of contacts) {
      const pair = key(site, contact.other);
      const seen = found.get(pair);
      if (!seen || contact.depth > seen.depth) {
        found.set(pair, { sites: [site, contact.other], depth: contact.depth, pieces: contact.pieces, at: Math.min(contact.at, seen?.at ?? 1), extent, sweep: true });
      }
    }
  }
  for (const touch of result.open) {
    const pair = key(...touch.sites);
    const seen = found.get(pair);
    if (!seen) found.set(pair, { ...touch, sweep: false });
    else if (touch.depth > seen.depth) found.set(pair, { ...seen, depth: touch.depth, pieces: touch.pieces });
  }
  return found;
}

// The first contact a sweep found, as [other site, contact], or null.
const firstContact = ({ contacts }) => contacts.reduce((first, contact) => (first === null || contact.at < first.at ? contact : first), null);

// What a vehicle with no moving part is swept as: nothing moves and nothing touches, so the entries and riders it lists
// are still held to that.
const NO_SWEEP = { sites: {}, open: [] };

// The report on every vehicle's swings, as { problems, notes, exports }, from the sweeps `swingResults` returned. A
// problem is a contact that no `swingContact` or `swingUnjudged` entry covers to its depth, and an entry that is stale:
// nothing touches there any more, or it is listed twice or capped far above what it measures. A note is a contact
// marked `swingUnjudged`, said again on every run. `exports` is each moving site's `{ clear, stop? }`, the part of its
// stop it opens before the first contact and what it touches there, for the placements output.
export function swingReport({ grain, vehicles }, results) {
  const problems = [];
  const notes = [];
  const exports = {};
  for (const [vehicle, { parent, sites, swingContacts, swingUnjudged }] of Object.entries(vehicles)) {
    const result = results[vehicle] ?? NO_SWEEP;
    const partOf = new Map(sites.map(({ id, part }) => [id, part]));
    partOf.set(GROUND, 'the ground');
    const carrierOf = new Map(sites.filter((site) => site.rides).map(({ id, rides }) => [id, rides]));
    for (const [rider, carrier] of carrierOf) {
      let moves = false;
      for (let at = rider; at !== undefined; at = carrierOf.get(at)) moves ||= Boolean(result.sites[at]);
      if (!moves) problems.push(`${vehicle}: ${rider} rides ${carrier}, and neither is a part that moves`);
    }
    const found = foundContacts(result);
    const inherited = [...(vehicles[parent]?.swingContacts ?? []), ...(vehicles[parent]?.swingUnjudged ?? [])];
    const entries = [...swingContacts, ...swingUnjudged];
    const allowed = new Map([...inherited, ...entries].map((entry) => [key(...entry.sites), entry]));
    const inheritedPairs = new Set(inherited.map((entry) => key(...entry.sites)));
    for (const [pair, contact] of found) {
      const cap = allowed.get(pair)?.depth ?? 0;
      if (contact.depth <= cap + EPSILON) continue;
      const [a, b] = contact.sites;
      const limit = cap > 0 ? `, more than the ${millimetres(cap)} mm allowed` : '';
      const depth = `${millimetres(contact.depth)} mm (${contact.pieces[0]} in ${contact.pieces[1]})`;
      if (contact.sweep) {
        const opened = contact.extent ? `${Math.round(contact.at * contact.extent.total)}${contact.extent.unit} of ${contact.extent.total}${contact.extent.unit}` : `${Math.round(contact.at * 100)}% of its way`;
        problems.push(`${vehicle}: ${partOf.get(a)} at ${a} swings into ${partOf.get(b)} at ${b} from ${opened}, reaching ${depth} by its stop${limit}`);
      } else {
        problems.push(`${vehicle}: ${partOf.get(a)} at ${a} and ${partOf.get(b)} at ${b} meet with both open by ${depth}${limit}`);
      }
    }
    const seen = new Set();
    for (const entry of entries) {
      const pair = key(...entry.sites);
      const [a, b] = entry.sites;
      const where = `${vehicle}: allowed swing contact of ${a} and ${b}`;
      const contact = found.get(pair);
      if (seen.has(pair) || inheritedPairs.has(pair)) problems.push(`${where} is listed twice`);
      else if (!contact) problems.push(`${where} is stale: nothing touches there any more`);
      else if (entry.depth - contact.depth > LOOSE * grain) {
        const [capped, measures] = [entry.depth, contact.depth].map(millimetres);
        problems.push(`${where} is capped at ${capped} mm, far above the ${measures} mm it measures`);
      }
      seen.add(pair);
      if (contact && swingUnjudged.includes(entry)) {
        notes.push(`${vehicle}: ${partOf.get(a)} at ${a} and ${partOf.get(b)} at ${b} touch by ${millimetres(contact.depth)} mm as they open and are not judged: ${entry.note}`);
      }
    }
    if (!results[vehicle]) continue;
    const moving = Object.entries(result.sites).map(([site, { clear, contacts }]) => {
      const first = firstContact({ contacts });
      return [site, { clear: Math.round(clear * 1e4) / 1e4, ...(first ? { stop: first.other } : {}) }];
    });
    exports[vehicle] = Object.fromEntries(moving);
  }
  return { problems, notes, exports };
}
