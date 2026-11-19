// @ts-check
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
/** @import { Vec3 } from './packages/construct/src/foundation/math.ts' */
/** @import { Forward } from './packages/thing-core/src/frame.ts' */
/** @import { Motion, StageMove } from './packages/motion/src/motion.ts' */
/** @import { ResultFolder } from './packages/thing-export/src/cache.ts' */
/** @import { Shard } from './generation.mjs' */
/** @import { Piece } from './pieceSolid.mjs' */
/** @import { PartMotion, SitePieces, SiteVehicle } from './siteOverlap.mjs' */
/** @import { OpenBody, OpenContact, Shape, SweepContact, SweepEntry } from './swingSweep.mjs' */
/** @import { WorkerPool } from './workerPool.mjs' */
import { createHash } from 'node:crypto';
import { availableParallelism } from 'node:os';
import { resolve } from 'node:path';
import { AUTHORED_LATERAL, motionAtSite, motionLayers, poseAt, stowPlanesOf } from '../site/motionPose.mjs';
import { shardUnits } from './generation.mjs';
import { column, dot, perAxis } from './packages/construct/src/foundation/math.ts';
import { shareStages } from './packages/motion/src/motion.ts';
import { FRONT_TURNS, toModelFrame } from './packages/thing-core/src/frame.ts';
import {
  centreOf,
  cornersOf,
  hingeSense,
  piecesBounds,
  pinAxis,
  shiftPiece,
  TOWARD,
} from './packages/thing-core/src/motion.ts';
import { codeFingerprint, resultFolder } from './packages/thing-export/src/cache.ts';
import { key } from './siteOverlap.mjs';
import { shapeOf, sweepBody, sweepOpenPose } from './swingSweep.mjs';
import { workerPool } from './workerPool.mjs';

/**
 * The change `adjustedMotion` tries on a part: its pins drawn `offset` further, its whole way scaled to `scale`.
 * @typedef {{ readonly offset?: Vec3; readonly scale?: number }} Adjust
 */
/**
 * A site as a sweep reads it.
 * @typedef {object} SweepSite
 * @property {string} id
 * @property {string} part
 * @property {Vec3} at
 * @property {boolean | undefined} [mirror]
 * @property {string | undefined} [rides]
 * @property {readonly Piece[]} pieces
 */
/**
 * One vehicle's sweep task. `adjust` maps a part id to the `adjustedMotion` change to try on it, for every site that
 * places it. With `only`, just that site's body is swept, with no all-open pose.
 * @typedef {object} SweepTask
 * @property {number} grain
 * @property {Forward} forward
 * @property {Readonly<Record<string, PartMotion>>} motions
 * @property {readonly SweepSite[]} sites
 * @property {Readonly<Record<string, Adjust>>} [adjust]
 * @property {string | undefined} [only]
 */
/** @typedef {{ unit: 'mm' | '°'; total: number } | null} Extent How far a body opens, for a message. */
/** @typedef {SweepContact & { other: string }} SiteContact A moving site's contact with the `other` site. */
/**
 * A moving site's sweep: the clock it opens to before it touches anything, and each contact it makes.
 * @typedef {{ clear: number; extent: Extent; contacts: SiteContact[] }} SiteSweep
 */
/** @typedef {{ sites: Record<string, SiteSweep>; open: OpenContact[] }} SweepResult One vehicle's sweep. */
/**
 * A pair of sites that touch in a vehicle's sweep, as its moving site opens (`sweep`) or with both open.
 * @typedef {(OpenContact & { sweep: false }) | (OpenContact & { at: number; extent: Extent; sweep: true })} FoundContact
 */
/**
 * What a moving site touches, judged against its pair's entry: `message` is the problem when no entry covers it.
 * @typedef {{ other: string; depth: number; at: number | undefined; allowed: boolean; message?: string }} Touch
 */
/** @typedef {{ clear: number; stop?: string }} SwingExport A moving site's swing for the placements output. */
/**
 * A moving site's swing with its status and all it touches.
 * @typedef {SwingExport & { part: string | undefined; status: 'clear' | 'judged' | 'fails'; contacts: Touch[] }} Verdict
 */
/** @typedef {{ vehicle: string; sites: readonly [string, string]; message: string }} EntryProblem */
/** @typedef {ReturnType<typeof swingReport>} SwingReport */

const EPSILON = 1e-9;
const LOOSE = 1; // grains a cap may exceed the depth it was measured at
export const GROUND = 'ground';
/** @param {number} metres */
const millimetres = (metres) => Math.round(metres * 1e3);

/** @type {Shape} The ground: a slab below y = 0, deep as far as any part reaches. */
const ground = {
  id: GROUND,
  min: [-1e4, -1e3, -1e4],
  max: [1e4, 0, 1e4],
  distance: (p) => Math.max(-1e4 - p[0], p[0] - 1e4, -1e3 - p[1], p[1], -1e4 - p[2], p[2] - 1e4),
};

/**
 * A direction of the model frame, in the vehicle's authored frame.
 * @param {Forward} forward
 * @param {Vec3} direction
 */
const fromModelFrame = (forward, direction) => perAxis((j) => dot(column(FRONT_TURNS[forward], j), direction));

/**
 * A part's motion as authored, with its pins, resolved in the vehicle frame for the part at its own origin: the same
 * derivation the build exports, so the swing proven is the swing played (docs/decisions/0015-motion-as-content.md). A
 * stowing slide's plane is the leading face of the part's rest bounds, as the solids the check measures draw it.
 * @param {PartMotion} part
 * @param {Forward} forward
 * @param {number} grain
 * @returns {Motion}
 */
export function resolveMotion({ stages, stops, pieces }, forward, grain) {
  const bounds = piecesBounds(pieces);
  const centre = toModelFrame(forward, centreOf(bounds));
  const moves = stages.map((stage) => {
    if (stage.kind === 'slide') {
      const direction = fromModelFrame(forward, TOWARD[stage.toward]);
      const stow = stage.stow ? { stow: Math.max(...cornersOf(bounds).map((corner) => dot(corner, direction))) } : {};
      /** @type {StageMove} */
      const slide = { kind: 'slide', direction, travel: stage.travel, ...stow };
      return slide;
    }
    const pins = stage.pins.map((id) => {
      const pin = pieces.find((piece) => piece.id === id);
      if (pin === undefined) throw new Error(`hinge pin ${id} is no piece of its part`);
      return pin;
    });
    const axis = pinAxis(pins, grain);
    const sense = hingeSense(
      { from: toModelFrame(forward, axis.from), to: toModelFrame(forward, axis.to) },
      centre,
      stage.toward,
      grain,
    );
    /** @type {StageMove} */
    const hinge = { kind: 'hinge', axis, angle: sense * stage.open };
    return hinge;
  });
  return { stages: shareStages(moves, cornersOf(bounds)), stops };
}

/**
 * How far a body's motion opens, for a message: its degrees or millimetres when it is one stage, else null.
 * @param {readonly Motion[]} layers
 * @returns {Extent}
 */
const extentOf = (layers) => {
  const stage = layers.length === 1 && layers[0]?.stages.length === 1 ? layers[0].stages[0] : undefined;
  if (stage === undefined) return null;
  return stage.kind === 'slide'
    ? { unit: 'mm', total: millimetres(stage.travel) }
    : { unit: '°', total: Math.round(Math.abs(stage.angle)) };
};

/**
 * A part's motion as a proposed fix would give it (tools/swingPropose.mjs): its pins drawn `offset` further in the
 * part's own frame and the motion resolved again from them, so the sense is the one the build would derive, then its
 * whole way scaled to `scale` of the authored stop. A pin line that no longer carries the part clearly toward its hint
 * throws, as the build does.
 * @param {PartMotion} part
 * @param {Adjust} adjust
 * @param {Forward} forward
 * @param {number} grain
 * @returns {Motion}
 */
export function adjustedMotion(part, { offset, scale = 1 }, forward, grain) {
  const pins = new Set(part.stages.flatMap((stage) => (stage.kind === 'hinge' ? stage.pins : [])));
  const moved = offset
    ? { ...part, pieces: part.pieces.map((piece) => (pins.has(piece.id) ? shiftPiece(piece, offset) : piece)) }
    : part;
  const resolved = resolveMotion(moved, forward, grain);
  return {
    ...resolved,
    stages: resolved.stages.map((stage) =>
      stage.kind === 'slide' ? { ...stage, travel: stage.travel * scale } : { ...stage, angle: stage.angle * scale },
    ),
  };
}

/**
 * One vehicle's sweep: for every moving site, how far it opens before it touches anything and each contact it makes,
 * and the pairs of moving sites that touch with all of them open. It reads only its task, so a worker can run it and a
 * cache can keep it. With `only`, just that site's body is swept, with no all-open pose, which is what a search over
 * adjustments can afford.
 * @param {SweepTask} task
 * @returns {SweepResult}
 */
export function sweepVehicle({ grain, forward, motions, sites, adjust = {}, only }) {
  /** @type {Map<string, Motion>} */
  const resolved = new Map();
  /** @param {SweepSite} site */
  const motionOf = (site) => {
    const part = motions[site.part];
    if (!part) return null;
    let motion = resolved.get(site.part);
    if (motion === undefined) {
      motion = adjustedMotion(part, adjust[site.part] ?? {}, forward, grain);
      resolved.set(site.part, motion);
    }
    return motionAtSite(motion, site, AUTHORED_LATERAL);
  };
  const byId = new Map(sites.map((site) => [site.id, site]));
  const own = new Map(sites.map((site) => [site.id, motionOf(site)]));
  /**
   * The chain of carriers a site rides, nearest first.
   * @param {SweepSite} site
   * @returns {SweepSite[]}
   */
  const carriersOf = (site) => {
    if (!site.rides) return [];
    const carrier = byId.get(site.rides);
    if (carrier === undefined) throw new Error(`${site.id} rides ${site.rides}, which is no site with pieces`);
    return [carrier, ...carriersOf(carrier)];
  };
  /**
   * The site whose own motion moves this one: itself, or the nearest carrier that has one.
   * @param {SweepSite} site
   */
  const anchorOf = (site) => [site, ...carriersOf(site)].find(({ id }) => own.get(id)) ?? null;
  const shapes = new Map(sites.map((site) => [site.id, site.pieces.map(shapeOf)]));
  /** @param {string} id */
  const shapesOf = (id) => shapes.get(id) ?? [];
  const anchors = sites.filter((site) => own.get(site.id));
  const bodies = anchors.map((anchor) => {
    const carriers = carriersOf(anchor).filter(({ id }) => own.get(id));
    const members = sites.filter((site) => anchorOf(site) === anchor).map(({ id }) => id);
    return {
      site: anchor.id,
      layers: motionLayers(anchor, byId, ({ id }) => own.get(id)),
      members,
      carriers: carriers.map(({ id }) => id),
    };
  });
  const step = grain / 4;
  /** @type {SweepResult} */
  const result = { sites: {}, open: [] };
  const bodyOf = new Map(bodies.flatMap((body) => body.members.map((id) => [id, body])));
  for (const body of only === undefined ? bodies : bodies.filter(({ site }) => site === only)) {
    const members = new Set(body.members);
    const movers = body.members.flatMap((id) => shapesOf(id).map((shape) => ({ site: id, shape })));
    // What shares a carrier with this body moves with it on the one clock; what shares none stands at rest.
    /** @type {SweepEntry[]} */
    const obstacles = [
      ...sites
        .filter(({ id }) => !members.has(id))
        .flatMap(({ id }) => {
          const layers = bodyOf.get(id)?.layers ?? [];
          return shapesOf(id).map((shape) => ({ site: id, shape, layers: layers[0] === body.layers[0] ? layers : [] }));
        }),
      { site: GROUND, shape: ground, layers: [] },
    ];
    const { clear, contacts } = sweepBody({ layers: body.layers, movers, obstacles, step, tolerance: step });
    result.sites[body.site] = {
      clear,
      extent: extentOf(body.layers),
      contacts: [...contacts].map(([other, contact]) => ({ other, ...contact })),
    };
  }
  if (only !== undefined) return result;
  const posed = bodies.map(({ site, layers, members, carriers }) => ({
    site,
    carriers,
    pose: poseAt(
      layers,
      layers.map(() => 1),
    ),
    planes: stowPlanesOf(layers),
    shapes: members.flatMap(shapesOf),
    members,
  }));
  /** @type {(a: OpenBody & { carriers: readonly string[] }, b: OpenBody & { carriers: readonly string[] }) => boolean} */
  const related = (a, b) => a.carriers.includes(b.site) || b.carriers.includes(a.site);
  const open = sweepOpenPose({ bodies: posed, step, tolerance: step, key, related });
  result.open = [...open.values()];
  return result;
}

/**
 * What a swept vehicle's report is about: the moving sites of each vehicle with their parts' motions. Every site of a
 * vehicle goes in, because a moving part meets them all.
 * @param {Pick<SitePieces, 'grain' | 'motions' | 'vehicles'>} pieces
 * @returns {Record<string, SweepTask>}
 */
export function sweepTasks({ grain, motions, vehicles }) {
  return Object.fromEntries(
    Object.entries(vehicles)
      .filter(([, { sites }]) => sites.some(({ part }) => motions[part]))
      .map(([vehicle, { forward, sites }]) => {
        const parts = new Set(sites.map(({ part }) => part));
        const used = Object.fromEntries(Object.entries(motions).filter(([part]) => parts.has(part)));
        return [
          vehicle,
          {
            grain,
            forward,
            motions: used,
            sites: sites.map(({ id, part, at, mirror, rides, pieces }) => ({ id, part, at, mirror, rides, pieces })),
          },
        ];
      }),
  );
}

const HERE = import.meta.dirname;
// The code a sweep runs, whole folders for the shared packages since naming their modules one by one would miss a new
// import. A cached sweep is only as good as the code and the runtime that made it.
const CHECKER_CODE = [
  'swingClearance.mjs',
  'swingSweep.mjs',
  'pieceSolid.mjs',
  '../site/motionPose.mjs',
  'packages/thing-core/src',
  'packages/construct/src/foundation',
];
const checkerHash = () => codeFingerprint(HERE, CHECKER_CODE);

/**
 * @param {SweepTask} task
 * @param {string} checker
 */
const taskHash = (task, checker) =>
  createHash('sha256').update(checker).update(JSON.stringify(task)).digest('hex').slice(0, 32);
const CACHE_FOLDER = 'swing';

// The sweeps of every vehicle with a moving part: from the cache folder when a vehicle's inputs and the checker are as
// they were, else swept on worker threads, one vehicle each, and kept. Vehicles with the same inputs share one sweep.
// `checker` is the fingerprint of the code that sweeps, which a test may change. With `shard`, only that shard of the
// distinct sweeps is made, so CI can spread a clean build's sweeps over runners like its models (tools/build.mjs,
// fillCacheShard). With `prune`, entries no vehicle uses any more go, as a full build is the only run that knows them all.
/**
 * @param {Pick<SitePieces, 'grain' | 'motions' | 'vehicles'>} data
 * @param {{
 *   cache?: string | undefined;
 *   workers?: number;
 *   prune?: boolean;
 *   shard?: Shard | undefined;
 *   checker?: string;
 * }} [options]
 */
export async function swingResults(
  data,
  { cache, workers = availableParallelism(), prune = false, shard, checker = checkerHash() } = {},
) {
  const tasks = sweepTasks(data);
  /** @type {ResultFolder<SweepResult> | undefined} */
  const folder = cache === undefined ? undefined : resultFolder(resolve(cache), CACHE_FOLDER);
  /** @type {Map<string, { task: SweepTask; vehicles: string[] }>} */
  const byHash = new Map();
  for (const [vehicle, task] of Object.entries(tasks)) {
    const hash = taskHash(task, checker);
    byHash.set(hash, { task, vehicles: [...(byHash.get(hash)?.vehicles ?? []), vehicle] });
  }
  /** @type {Map<string, SweepResult>} */
  const swept = new Map();
  /** @type {[string, SweepTask][]} */
  const missing = [];
  const mine = shard === undefined ? [...byHash] : shardUnits([...byHash], shard);
  for (const [hash, { task }] of mine) {
    const stored = folder?.get(hash);
    if (stored === undefined) missing.push([hash, task]);
    else swept.set(hash, stored);
  }
  if (missing.length > 0) {
    /** @type {WorkerPool<typeof sweepVehicle>} */
    const pool = workerPool(import.meta.url, 'sweepVehicle', Math.min(workers, missing.length));
    try {
      await Promise.all(
        missing.map(async ([hash, task]) => {
          const result = await pool.run(task);
          swept.set(hash, result);
          folder?.put(hash, result);
        }),
      );
    } finally {
      await pool.close();
    }
  }
  if (prune) folder?.prune(new Set(byHash.keys()));
  /** @type {Record<string, SweepResult>} */
  const results = {};
  for (const [hash, { vehicles }] of byHash) {
    const result = swept.get(hash);
    if (result !== undefined) for (const vehicle of vehicles) results[vehicle] = result;
  }
  return { results, reused: mine.length - missing.length, swept: missing.length };
}

/**
 * Every pair of sites that touch in a vehicle's sweep, by pair key: the deepest the pair reaches whether one opens
 * against the other or both are open, `at` the clock at which the first of its sites, the one whose sweep reaches
 * deepest, touches the other, and `sweep` whether that is the case.
 * @param {SweepResult} result
 * @returns {Map<string, FoundContact>}
 */
export function foundContacts(result) {
  /** @type {Map<string, FoundContact>} */
  const found = new Map();
  for (const [site, { contacts, extent }] of Object.entries(result.sites)) {
    for (const contact of contacts) {
      const pair = key(site, contact.other);
      const seen = found.get(pair);
      if (!seen || contact.depth > seen.depth) {
        found.set(pair, {
          sites: [site, contact.other],
          depth: contact.depth,
          pieces: contact.pieces,
          at: contact.at,
          extent,
          sweep: true,
        });
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

/**
 * The first contact a sweep found, or null.
 * @param {{ contacts: readonly SiteContact[] }} sweep
 */
const firstContact = ({ contacts }) => {
  /** @type {SiteContact | null} */
  let first = null;
  for (const contact of contacts) if (first === null || contact.at < first.at) first = contact;
  return first;
};

/**
 * What a vehicle with no moving part is swept as: nothing moves and nothing touches, so the entries and riders it lists
 * are still held to that.
 * @type {SweepResult}
 */
const NO_SWEEP = { sites: {}, open: [] };

/**
 * The report on every vehicle's swings, from the sweeps `swingResults` returned. A problem is a contact that no
 * `swingContact` or `swingUnjudged` entry covers to its depth, and an entry that is stale: nothing touches there any
 * more, or it is listed twice or capped far above what it measures. A note is a contact marked `swingUnjudged`, said
 * again on every run. `exports` is each moving site's swing, the part of its stop it opens before the first contact
 * and what it touches there, for the placements output. `verdicts` is the same per moving site with its `status`
 * (`clear`, `judged` when every contact is allowed, `fails`) and all it touches, each with the problem message when no
 * entry covers it, for a tool that shows them (the vehicle authoring tool). `entryProblems` is the part of `problems`
 * that is an entry gone stale or capped far above its contact, with its vehicle and the entry's sites, for a tool that
 * moves a motion and so wears entries out.
 * @param {Pick<SitePieces, 'grain' | 'vehicles'>} pieces
 * @param {Readonly<Record<string, SweepResult>>} results
 */
export function swingReport({ grain, vehicles }, results) {
  /** @type {string[]} */
  const problems = [];
  /** @type {EntryProblem[]} */
  const entryProblems = [];
  /** @type {string[]} */
  const notes = [];
  /** @type {Record<string, Record<string, SwingExport>>} */
  const exports = {};
  /** @type {Record<string, Record<string, Verdict>>} */
  const verdicts = {};
  for (const [vehicle, { parent, sites, swingContacts, swingUnjudged }] of Object.entries(vehicles)) {
    const result = results[vehicle] ?? NO_SWEEP;
    const partOf = new Map(sites.map(({ id, part }) => [id, part]));
    partOf.set(GROUND, 'the ground');
    /** @type {Map<string, string>} */
    const carrierOf = new Map(sites.flatMap(({ id, rides }) => (rides ? [[id, rides]] : [])));
    for (const [rider, carrier] of carrierOf) {
      let moves = false;
      /** @type {string | undefined} */
      let at = rider;
      while (at !== undefined) {
        moves ||= Boolean(result.sites[at]);
        at = carrierOf.get(at);
      }
      if (!moves) problems.push(`${vehicle}: ${rider} rides ${carrier}, and neither is a part that moves`);
    }
    const found = foundContacts(result);
    /** @type {SiteVehicle | undefined} */
    const family = parent === null ? undefined : vehicles[parent];
    const inherited = [...(family?.swingContacts ?? []), ...(family?.swingUnjudged ?? [])];
    const entries = [...swingContacts, ...swingUnjudged];
    const allowed = new Map([...inherited, ...entries].map((entry) => [key(...entry.sites), entry]));
    const inheritedPairs = new Set(inherited.map((entry) => key(...entry.sites)));
    /**
     * A contact as the problem it is when no entry covers it to its depth, else undefined.
     * @param {FoundContact} contact
     * @param {number} cap
     */
    const problemOf = (contact, cap) => {
      if (contact.depth <= cap + EPSILON) return undefined;
      const [a, b] = contact.sites;
      const limit = cap > 0 ? `, more than the ${millimetres(cap)} mm allowed` : '';
      const depth = `${millimetres(contact.depth)} mm (${contact.pieces[0]} in ${contact.pieces[1]})`;
      if (!contact.sweep)
        return `${vehicle}: ${partOf.get(a)} at ${a} and ${partOf.get(b)} at ${b} meet with both open by ${depth}${limit}`;
      const opened = contact.extent
        ? `${Math.round(contact.at * contact.extent.total)}${contact.extent.unit} of ${contact.extent.total}${contact.extent.unit}`
        : `${Math.round(contact.at * 100)}% of its way`;
      return `${vehicle}: ${partOf.get(a)} at ${a} swings into ${partOf.get(b)} at ${b} from ${opened}, reaching ${depth} by its stop${limit}`;
    };
    /** @param {readonly [string, string]} sites */
    const capOf = (sites) => allowed.get(key(...sites))?.depth ?? 0;
    for (const contact of found.values()) {
      const message = problemOf(contact, capOf(contact.sites));
      if (message) problems.push(message);
    }
    // What each moving site touches, from its own sweep and from the all-open pose, each judged against its pair's entry.
    /** @type {Map<string, Touch[]>} */
    const touches = new Map();
    /** @param {FoundContact} contact */
    const touched = (contact) => {
      const [site, other] = contact.sites;
      const message = problemOf(contact, capOf(contact.sites));
      touches.set(site, [
        ...(touches.get(site) ?? []),
        {
          other,
          depth: Math.round(contact.depth * 1e4) / 1e4,
          at: contact.sweep ? contact.at : undefined,
          allowed: message === undefined,
          ...(message ? { message } : {}),
        },
      ]);
    };
    for (const [site, { contacts, extent }] of Object.entries(result.sites)) {
      for (const { other, ...contact } of contacts) touched({ ...contact, sites: [site, other], extent, sweep: true });
    }
    for (const touch of result.open) {
      const [a, b] = touch.sites;
      touched({ ...touch, sweep: false });
      touched({ ...touch, sites: [b, a], sweep: false });
    }
    /** @type {Set<string>} */
    const seen = new Set();
    for (const entry of entries) {
      const pair = key(...entry.sites);
      const [a, b] = entry.sites;
      const where = `${vehicle}: allowed swing contact of ${a} and ${b}`;
      const contact = found.get(pair);
      /** @param {string} message */
      const worn = (message) => {
        problems.push(message);
        entryProblems.push({ vehicle, sites: entry.sites, message });
      };
      if (seen.has(pair) || inheritedPairs.has(pair)) problems.push(`${where} is listed twice`);
      else if (!contact) worn(`${where} is stale: nothing touches there any more`);
      else if (entry.depth - contact.depth > LOOSE * grain) {
        const [capped, measures] = [entry.depth, contact.depth].map(millimetres);
        worn(`${where} is capped at ${capped} mm, far above the ${measures} mm it measures`);
      }
      seen.add(pair);
      if (contact && swingUnjudged.includes(entry)) {
        notes.push(
          `${vehicle}: ${partOf.get(a)} at ${a} and ${partOf.get(b)} at ${b} touch by ${millimetres(contact.depth)} mm as they open and are not judged: ${entry.note}`,
        );
      }
    }
    if (!results[vehicle]) continue;
    /** @type {[string, SwingExport][]} */
    const moving = Object.entries(result.sites).map(([site, { clear, contacts }]) => {
      const first = firstContact({ contacts });
      return [site, { clear: Math.round(clear * 1e4) / 1e4, ...(first ? { stop: first.other } : {}) }];
    });
    exports[vehicle] = Object.fromEntries(moving);
    verdicts[vehicle] = Object.fromEntries(
      moving.map(([site, swing]) => {
        const contacts = touches.get(site) ?? [];
        const status = contacts.some(({ allowed }) => !allowed) ? 'fails' : contacts.length > 0 ? 'judged' : 'clear';
        return [site, { part: partOf.get(site), ...swing, status, contacts }];
      }),
    );
  }
  return { problems, entryProblems, notes, exports, verdicts };
}
