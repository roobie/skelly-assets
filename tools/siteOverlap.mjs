// @ts-check
// Finds parts placed at different sites of one vehicle that occupy the same space. A part is authored as pieces in its
// vehicle's frame; a site moves them by its position, and a far-side twin first reflects them across the centre plane
// (models/vehicles/kit.libsonnet, `far` and `moved`), exactly as the showcase and the game place the part. Two pieces
// overlap when they sink into each other more than the finer of their parts' voxel grains, so faces that touch or sink
// that grain into each other are contact, not overlap. Parts that one site composes are out of scope: a site's pieces may overlap each other
// freely. An overlap is allowed by a fit between the two parts' roles (`models/vehicles/seating.libsonnet`), which
// holds for every vehicle, or by the vehicle's own placements file (`models/vehicles/site.libsonnet`): `overlap` for one that is
// correct and says why, `unjudged` for one nobody has judged yet, which the report lists on every run. A family's
// unjudged overlaps may instead be listed in `models/vehicles/unjudged-overlaps.libsonnet`, even over a pair the
// vehicle allows to a lesser depth. All are capped at the depth they were written for, and a variant shares its
// parent's. An entry that no longer applies is reported, so the lists cannot rot. The reason for the rule is in
// `docs/decisions/0014-site-overlap.md`.
/** @import { AxisIndex, Vec3 } from './packages/construct/src/foundation/math.ts' */
/** @import { ToolItem } from './packages/thing-authoring-tool/src/catalogue.ts' */
/** @import { Forward } from './packages/thing-core/src/frame.ts' */
/** @import { ResultFolder } from './packages/thing-export/src/cache.ts' */
/** @import { Shard } from './generation.mjs' */
/** @import { Piece, Solid } from './pieceSolid.mjs' */
/** @import { PlacementSite } from './placements.mjs' */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { shardUnits } from './generation.mjs';
import { AXES, perAxis } from './packages/construct/src/foundation/math.ts';
import { codeFingerprint, resultFolder } from './packages/thing-export/src/cache.ts';
import { solid } from './pieceSolid.mjs';

/**
 * A site that names a part of the vehicle rows, with the part's pieces placed in the vehicle frame and the grain the
 * part is drawn on. A site whose part is a roster model has no pieces to compare, so it is left out.
 * @typedef {PlacementSite & { readonly grain?: number | undefined; readonly pieces: readonly Piece[] }} PiecedSite
 */
/**
 * An overlap or swing contact a vehicle lists, with the text that says why it is correct (`why`) or what is open
 * (`note`).
 * @typedef {{ readonly sites: readonly [string, string]; readonly depth: number; readonly why?: string; readonly note?: string }} ListedEntry
 */
/** @typedef {{ readonly pairs: readonly (readonly [string, string, number])[]; readonly why: string }} Fit */
/** @typedef {NonNullable<ToolItem['motion']>['stages'][number]} AuthoredStage */
/**
 * @typedef {{
 *   readonly stages: readonly AuthoredStage[];
 *   readonly stops: NonNullable<ToolItem['motion']>['stops'];
 *   readonly pieces: readonly Piece[];
 * }} PartMotion
 */
/**
 * A vehicle's drawn sites and the overlaps and swing contacts it allows and has not judged; `ledger` is its rows of
 * its family's unjudged list.
 * @typedef {object} SiteVehicle
 * @property {string | null} parent
 * @property {Forward} forward
 * @property {readonly PiecedSite[]} sites
 * @property {readonly ListedEntry[]} overlaps
 * @property {readonly ListedEntry[]} unjudged
 * @property {readonly ListedEntry[] | undefined} [ledger]
 * @property {readonly ListedEntry[]} swingContacts
 * @property {readonly ListedEntry[]} swingUnjudged
 */
/**
 * Every vehicle's drawn sites, the fits by role and every drawn site's id. `motions` gives each part that moves its
 * authored stages and its pieces as drawn, before any site moves them, which tools/swingClearance.mjs turns into the
 * motion at each site.
 * @typedef {object} SitePieces
 * @property {number} grain
 * @property {readonly Fit[]} fits
 * @property {readonly string[]} roles
 * @property {Readonly<Record<string, PartMotion>>} motions
 * @property {Readonly<Record<string, SiteVehicle>>} vehicles
 */
/** @typedef {Pick<PiecedSite, 'id' | 'part' | 'grain' | 'pieces'>} OverlapSite What `siteOverlaps` reads of a site. */
/**
 * The deepest overlap of two sites' pieces.
 * @typedef {object} SiteOverlap
 * @property {readonly [string, string]} sites
 * @property {readonly [string, string]} parts
 * @property {readonly [string, string]} pieces
 * @property {number} depth
 */

const repo = resolve(import.meta.dirname, '..');

// Read from its Jsonnet twin, which installJsonnetSources compiles only when a file it imports has changed, since
// evaluating every vehicle costs most of a warm build.
const SITE_PIECES = 'models/vehicles/site-pieces.json';
/** @returns {SitePieces} */
export const readSitePieces = (root = repo) => JSON.parse(readFileSync(join(root, SITE_PIECES), 'utf8'));

/**
 * @param {string} a
 * @param {string} b
 */
export const key = (a, b) => [a, b].sort().join('\n');

/**
 * The deepest point two solids share, as how far inside both it lies (m), or 0 when they share no more than `inside`:
 * a point must lie `inside` deep in both, and the solids are sampled every `step` m through the box they share.
 * @param {Solid} p
 * @param {Solid} q
 * @param {number} inside
 * @param {number} step
 */
export function sharedDepth(p, q, inside, step) {
  const lo = perAxis((i) => Math.max(p.min[i], q.min[i]) + inside);
  const hi = perAxis((i) => Math.min(p.max[i], q.max[i]) - inside);
  if (AXES.some((i) => lo[i] > hi[i])) return 0;
  /** @param {AxisIndex} i */
  const samples = (i) => Math.ceil((hi[i] - lo[i]) / step) + 1;
  /** @type {(i: AxisIndex, n: number) => number} */
  const at = (i, n) => (samples(i) === 1 ? lo[i] : lo[i] + ((hi[i] - lo[i]) * n) / (samples(i) - 1));
  let deepest = 0;
  for (let x = 0; x < samples(0); x++) {
    for (let y = 0; y < samples(1); y++) {
      for (let z = 0; z < samples(2); z++) {
        /** @type {Vec3} */
        const point = [at(0, x), at(1, y), at(2, z)];
        deepest = Math.max(deepest, -Math.max(p.distance(point), q.distance(point)));
      }
    }
  }
  return deepest > inside ? deepest : 0;
}

const REFINE = 12; // halvings that place a boundary between two march steps

/**
 * The spans (m along `axis`) where a solid lies on the line through `point` parallel to `axis`, as [enter, leave]
 * pairs, read only from `from` to `to`. The march steps by the solid's distance, which never oversteps a boundary, and
 * at least `least`.
 * @param {Solid} solid
 * @param {Vec3} point
 * @param {AxisIndex} axis
 * @param {readonly [number, number]} range
 * @param {number} least
 * @returns {[number, number][]}
 */
function spans({ box, min, max, distance }, point, axis, [from, to], least) {
  const [start, end] = [Math.max(min[axis], from), Math.min(max[axis], to)];
  if (box) {
    const through = AXES.every((i) => i === axis || (min[i] <= point[i] && point[i] <= max[i]));
    return through && start < end ? [[start, end]] : [];
  }
  /** @param {number} t */
  const on = (t) => perAxis((i) => (i === axis ? t : point[i]));
  /** @param {number} t */
  const inside = (t) => distance(on(t)) < 0;
  /** @type {(outer: number, inner: number) => number} */
  const boundary = (outer, inner) => {
    let [a, b] = [outer, inner];
    for (let i = 0; i < REFINE; i++) {
      const mid = (a + b) / 2;
      if (inside(mid) === inside(b)) b = mid;
      else a = mid;
    }
    return b;
  };
  /** @type {[number, number][]} */
  const found = [];
  let [t, previous, within, enter] = [start, start, false, 0];
  while (t <= end) {
    const d = distance(on(t));
    if (d < 0 !== within) {
      if (within) found.push([enter, boundary(t, previous)]);
      else enter = boundary(previous, t);
      within = !within;
    }
    [previous, t] = [t, t + Math.max(Math.abs(d), least)];
  }
  if (within) found.push([enter, end]);
  return found;
}

/**
 * How far (m) q must move along `axis`, one way or the other, to share no point with p, or null when no line sampled
 * every `step` m through the boxes' shared face finds them sharing one. A shift is barred while, on some line, a span
 * of q moved by it meets a span of p, so a piece passing right through a panel must move clear of the whole panel. A
 * move of `beyond` or more is not told apart from `beyond`, so the spans are read only where a shorter move reaches.
 * @param {Solid} p
 * @param {Solid} q
 * @param {AxisIndex} axis
 * @param {number} step
 * @param {number} beyond
 */
function shiftClear(p, q, axis, step, beyond) {
  /** @type {readonly [AxisIndex, AxisIndex]} */
  const [first, second] = axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1];
  /** @param {AxisIndex} i */
  const lineAt = (i) => {
    const [lo, hi] = [Math.max(p.min[i], q.min[i]), Math.min(p.max[i], q.max[i])];
    const n = Math.max(1, Math.ceil((hi - lo) / step));
    return Array.from({ length: n }, (_, k) => lo + ((k + 0.5) * (hi - lo)) / n);
  };
  const [firstLines, secondLines] = [lineAt(first), lineAt(second)];
  /** @type {[number, number][]} */
  const barred = [];
  for (const u of firstLines) {
    for (const v of secondLines) {
      const point = perAxis((i) => (i === first ? u : i === second ? v : 0));
      const onQ = spans(q, point, axis, [p.min[axis] - beyond, p.max[axis] + beyond], step / 2);
      if (onQ.length === 0) continue;
      const onP = spans(p, point, axis, [q.min[axis] - beyond, q.max[axis] + beyond], step / 2);
      for (const [a0, a1] of onP) for (const [b0, b1] of onQ) barred.push([a0 - b1, a1 - b0]);
    }
  }
  /** @param {[number, number][]} shifts */
  const clear = (shifts) => {
    let reach = 0;
    for (const [lo, hi] of shifts.sort((a, b) => a[0] - b[0])) {
      if (lo >= reach) break;
      reach = Math.max(reach, hi);
    }
    return reach;
  };
  const forward = clear(barred.filter(([, hi]) => hi > 0));
  if (forward === 0) return null;
  return Math.min(beyond, forward, clear(barred.filter(([lo]) => lo < 0).map(([lo, hi]) => [-hi, -lo])));
}

/**
 * How deep (m) two solids sink into each other, as the shortest move along an axis that parts them, or 0 when they
 * part with a move of `grain` or less. A piece through a thin panel thus reads as deep as it passes, not as thin as
 * the panel. Moves are sampled on lines every `step` m.
 * @param {Solid} p
 * @param {Solid} q
 * @param {number} grain
 * @param {number} step
 */
export function penetration(p, q, grain, step) {
  // A move that parts the boxes parts the solids, so no axis needs a longer one, and boxes that part with a grain's
  // move hold no deeper overlap. The axis whose boxes part soonest is read first, as the likeliest shortest.
  /** @param {AxisIndex} i */
  const boxesPart = (i) => Math.min(p.max[i] - q.min[i], q.max[i] - p.min[i]);
  const axes = [...AXES].sort((a, b) => boxesPart(a) - boxesPart(b));
  const soonest = Math.min(...AXES.map(boxesPart));
  if (soonest <= grain) return 0;
  let [depth, sharing] = [soonest, false];
  for (const axis of axes) {
    const move = shiftClear(p, q, axis, step, Math.min(depth, boxesPart(axis)));
    if (move === null) continue;
    [depth, sharing] = [Math.min(depth, move), true];
    if (depth <= grain) return 0;
  }
  return sharing ? depth : 0;
}

/**
 * Every pair of sites of one vehicle whose pieces overlap by more than the finer of their parts' grains, depth being
 * the penetration (m) of the deepest piece pair found. A site's part is drawn on its `grain`, or on the vehicle's
 * `grain` when it names none, and moves are sampled every vehicle grain. Pieces are swept along x so only those whose
 * boxes meet are compared.
 * @param {readonly OverlapSite[]} sites
 * @param {number} grain
 * @returns {SiteOverlap[]}
 */
export function siteOverlaps(sites, grain) {
  const pieces = sites
    .flatMap((site, owner) =>
      site.pieces.map((piece) => ({ owner, site, id: piece.id, grain: site.grain ?? grain, ...solid(piece) })),
    )
    .sort((a, b) => a.min[0] - b.min[0]);
  /** @type {Map<string, { sites: readonly [OverlapSite, OverlapSite]; pieces: readonly [string, string]; depth: number }>} */
  const found = new Map();
  for (const [i, first] of pieces.entries()) {
    for (let j = i + 1; j < pieces.length; j++) {
      const second = pieces[j];
      if (second === undefined || !(second.min[0] < first.max[0])) break;
      if (first.owner === second.owner) continue;
      const [p, q] = first.owner < second.owner ? [first, second] : [second, first];
      const depth = penetration(p, q, Math.min(p.grain, q.grain), grain);
      const pair = key(String(p.owner), String(q.owner));
      if (depth > (found.get(pair)?.depth ?? 0)) {
        found.set(pair, { sites: [p.site, q.site], pieces: [p.id, q.id], depth });
      }
    }
  }
  return [...found.values()].map(({ sites: [a, b], pieces: ids, depth }) => ({
    sites: [a.id, b.id],
    parts: [a.part, b.part],
    pieces: ids,
    depth,
  }));
}

const HERE = import.meta.dirname;
// The code a measure runs. A cached measure is only as good as the code and the runtime that made it.
const MEASURE_CODE = ['siteOverlap.mjs', 'pieceSolid.mjs'];
const measureHash = () => codeFingerprint(HERE, MEASURE_CODE);
const CACHE_FOLDER = 'overlap';

/**
 * What `siteOverlaps` reads of a vehicle, so its key changes with nothing else the placements say.
 * @param {readonly OverlapSite[]} sites
 * @param {number} grain
 */
const measureTask = (sites, grain) => ({
  grain,
  sites: sites.map(({ id, part, grain: own, pieces }) => ({ id, part, grain: own, pieces })),
});
/**
 * @param {unknown} task
 * @param {string} measure
 */
const taskHash = (task, measure) =>
  createHash('sha256').update(measure).update(JSON.stringify(task)).digest('hex').slice(0, 32);

// Every vehicle's `siteOverlaps`, by vehicle: from the cache folder when its sites and the measure are as they were,
// else measured and kept, since measuring every vehicle is most of a warm build's report. Vehicles with the same sites
// share one measure. `measure` is the fingerprint of the code that measures, which a test may change. With `shard`,
// only that shard of the distinct measures is made, so CI can spread a clean build's measures over runners like its
// models (tools/build.mjs, fillCacheShard). With `prune`, entries no vehicle uses any more go, as only a run over every
// vehicle knows them all.
/**
 * @param {Pick<SitePieces, 'grain' | 'vehicles'>} pieces
 * @param {{
 *   cache?: string | undefined;
 *   prune?: boolean;
 *   shard?: Shard | undefined;
 *   measure?: string;
 * }} [options]
 */
export function overlapResults({ grain, vehicles }, { cache, prune = false, shard, measure = measureHash() } = {}) {
  /** @type {ResultFolder<SiteOverlap[]> | undefined} */
  const folder = cache === undefined ? undefined : resultFolder(resolve(cache), CACHE_FOLDER);
  /** @type {Map<string, { sites: readonly PiecedSite[]; vehicles: string[] }>} */
  const byHash = new Map();
  for (const [vehicle, { sites }] of Object.entries(vehicles)) {
    const hash = taskHash(measureTask(sites, grain), measure);
    byHash.set(hash, { sites, vehicles: [...(byHash.get(hash)?.vehicles ?? []), vehicle] });
  }
  const mine = shard === undefined ? [...byHash] : shardUnits([...byHash], shard);
  let reused = 0;
  /** @type {Record<string, readonly SiteOverlap[]>} */
  const results = {};
  for (const [hash, { sites, vehicles: sharing }] of mine) {
    let overlaps = folder?.get(hash);
    if (overlaps === undefined) {
      overlaps = siteOverlaps(sites, grain);
      folder?.put(hash, overlaps);
    } else reused++;
    for (const vehicle of sharing) results[vehicle] = overlaps;
  }
  if (prune) folder?.prune(new Set(byHash.keys()));
  return { results, reused, measured: mine.length - reused };
}

/**
 * A site's role: its id without the side it is on and its number, so every vehicle's wheels share one fit.
 * @param {string} siteId
 */
export const roleOf = (siteId) => siteId.replace(/_(near|far)(?=_|$)/g, '').replace(/_\d+(?=_|$)/g, '');

const FIT_KEYS = ['pairs', 'why'];
const EPSILON = 1e-9;
const LOOSE = 1; // grains a cap may exceed the depth it was measured at

/**
 * Why the fits cannot be trusted, as messages: a malformed fit or pair, a role no drawn site has, and a pair of roles
 * that is listed twice, whose depths would then disagree.
 * @param {readonly unknown[]} fits
 * @param {readonly string[]} roles
 */
export function seatingProblems(fits, roles) {
  const known = new Set(roles.map(roleOf));
  /** @type {Map<string, number>} */
  const listed = new Map();
  return fits.flatMap((fit, i) => {
    const why = fit !== null && typeof fit === 'object' && 'why' in fit ? fit.why : undefined;
    /** @type {unknown} */
    const pairs = fit !== null && typeof fit === 'object' && 'pairs' in fit ? fit.pairs : undefined;
    const where = `seating fit ${i + 1} (${String(why).slice(0, 40)})`;
    const keys = Object.keys(fit ?? {}).sort();
    const shape = [
      ...(keys.join() === FIT_KEYS.join() ? [] : [`${where}: has keys ${keys.join(' ')}, not ${FIT_KEYS.join(' ')}`]),
      ...(typeof why === 'string' && why !== '' ? [] : [`${where}: needs a why`]),
      ...(Array.isArray(pairs) && pairs.length > 0 ? [] : [`${where}: needs at least one pair`]),
    ];
    if (shape.length > 0 || !Array.isArray(pairs)) return shape;
    /** @type {readonly unknown[]} */
    const listedPairs = pairs;
    return listedPairs.flatMap((pair) => {
      /** @type {readonly unknown[]} */
      const items = Array.isArray(pair) ? pair : [];
      const [seated, into, depth] = items;
      if (
        items.length !== 3 ||
        typeof seated !== 'string' ||
        typeof into !== 'string' ||
        typeof depth !== 'number' ||
        !(depth > 0)
      ) {
        return [`${where}: pair ${JSON.stringify(pair)} is not [seated, into, depth] with a depth above 0`];
      }
      const name = `${where}: pair ${seated} and ${into}`;
      const earlier = listed.get(key(seated, into));
      listed.set(key(seated, into), earlier ?? i);
      return [
        ...[seated, into]
          .filter((role) => !known.has(role))
          .map((role) => `${where}: role ${role} is the role of no site with pieces`),
        ...(earlier === undefined ? [] : [`${name} is also listed in fit ${earlier + 1}`]),
      ];
    });
  });
}

/**
 * How deep (m) the fits let parts of the two roles sink into each other: the depth of the pair that names them, in
 * either orientation, or 0.
 * @param {readonly Fit[]} fits
 * @param {string} roleA
 * @param {string} roleB
 */
export function fitDepth(fits, roleA, roleB) {
  const pair = key(roleA, roleB);
  const depths = fits
    .flatMap(({ pairs }) => pairs)
    .filter(([a, b]) => key(a, b) === pair)
    .map(([, , depth]) => depth);
  return Math.max(0, ...depths);
}

/** @param {number} metres */
const millimetres = (metres) => Math.round(metres * 1e3);

/** @typedef {'overlaps' | 'unjudged' | 'ledger'} OverlapList */

/**
 * The report on every vehicle's overlaps, as { problems, notes } messages, from the overlaps `overlapResults` found
 * by vehicle. A problem is an overlap that no fit, allowance or `unjudged` entry covers, or covers only to a lesser
 * depth, and an entry that is stale: its pair no longer overlaps, a fit already covers it, or it is listed twice. A
 * note is an overlap marked `unjudged`, said again on every run so nothing is silent. Each message names the vehicle,
 * both parts and their sites. A row of the family list may stand over a pair the vehicle allows, since its allowance
 * was sized by an earlier measure, so the row is stale only once the fits or that allowance cover the overlap again.
 * @param {Pick<SitePieces, 'grain' | 'fits' | 'roles' | 'vehicles'>} pieces
 * @param {Readonly<Record<string, readonly SiteOverlap[]>>} results
 */
export function overlapReport({ grain, fits, roles, vehicles }, results) {
  const problems = seatingProblems(fits, roles);
  /** @type {string[]} */
  const notes = [];
  /** @type {Map<string, number[]>} */
  const measured = new Map();
  /** @type {Set<string>} */
  const pending = new Set();
  for (const [vehicle, { parent, overlaps, unjudged, ledger = [] }] of Object.entries(vehicles)) {
    const overlapsOf = results[vehicle];
    if (overlapsOf === undefined) throw new Error(`${vehicle}: its overlaps were not measured`);
    const found = new Map(overlapsOf.map((overlap) => [key(...overlap.sites), overlap]));
    /** @param {{ sites: readonly [string, string] }} overlap */
    const roleDepth = ({ sites: [a, b] }) => fitDepth(fits, roleOf(a), roleOf(b));
    const family = parent === null ? undefined : vehicles[parent];
    /** @param {OverlapList} name */
    const from = (name) => family?.[name] ?? [];
    const allowed = byPair([...from('overlaps'), ...from('unjudged'), ...overlaps, ...unjudged]);
    const listed = byPair([...from('ledger'), ...ledger]);
    const notJudged = new Set([...from('unjudged'), ...unjudged]);
    /** @param {SiteOverlap} overlap */
    const describe = ({ sites: [a, b], parts: [partA, partB] }) => `${vehicle}: ${partA} at ${a} and ${partB} at ${b}`;
    for (const overlap of found.values()) {
      const pair = key(...overlap.sites);
      const rolePair = key(roleOf(overlap.sites[0]), roleOf(overlap.sites[1]));
      measured.set(rolePair, [...(measured.get(rolePair) ?? []), overlap.depth]);
      const allowance = allowed.get(pair);
      const unsettled = (allowance !== undefined && notJudged.has(allowance)) || listed.has(pair);
      if (unsettled && overlap.depth > roleDepth(overlap) + EPSILON) pending.add(rolePair);
      const cap = Math.max(roleDepth(overlap), allowance?.depth ?? 0, listed.get(pair)?.depth ?? 0);
      const [partA, partB] = overlap.parts;
      const [a, b] = overlap.sites;
      const detail = `by ${millimetres(overlap.depth)} mm (${overlap.pieces[0]} in ${overlap.pieces[1]})`;
      const limit = cap > 0 ? `, more than the ${millimetres(cap)} mm allowed` : '';
      if (overlap.depth > cap + EPSILON) {
        problems.push(`${vehicle}: ${partA} at ${a} overlaps ${partB} at ${b} ${detail}${limit}`);
      }
    }
    /**
     * @param {readonly ListedEntry[]} entries
     * @param {readonly ListedEntry[]} inherited
     * @param {(overlap: SiteOverlap) => number} covered
     * @param {string} what
     * @param {string} coverer
     */
    const audit = (entries, inherited, covered, what, coverer) => {
      const seen = new Set(inherited.map((entry) => key(...entry.sites)));
      for (const entry of entries) {
        const pair = key(...entry.sites);
        const [a, b] = entry.sites;
        const where = `${vehicle}: ${what} of ${a} and ${b}`;
        const overlap = found.get(pair);
        if (seen.has(pair)) problems.push(`${where} is listed twice`);
        else if (!overlap) problems.push(`${where} is stale: the parts no longer overlap`);
        else if (covered(overlap) + EPSILON >= overlap.depth) {
          problems.push(`${where} is stale: ${coverer} already covers it`);
        } else if (entry.depth - overlap.depth > LOOSE * grain) {
          const [capped, measures] = [entry.depth, overlap.depth].map(millimetres);
          problems.push(`${where} is capped at ${capped} mm, far above the ${measures} mm it measures`);
        }
        seen.add(pair);
        if (overlap && 'note' in entry) {
          const depth = millimetres(overlap.depth);
          notes.push(`${describe(overlap)} overlap by ${depth} mm and are not judged: ${entry.note}`);
        }
      }
    };
    audit(
      [...overlaps, ...unjudged],
      [...from('overlaps'), ...from('unjudged')],
      roleDepth,
      'allowed overlap',
      'the seating',
    );
    /** @param {SiteOverlap} overlap */
    const judged = (overlap) => Math.max(roleDepth(overlap), allowed.get(key(...overlap.sites))?.depth ?? 0);
    audit(ledger, from('ledger'), judged, 'family-listed overlap', 'the seating or the vehicle');
  }
  const use = seatingUse(fits, grain, measured);
  problems.push(...use.filter(({ pair }) => !pending.has(pair)).map(({ message }) => message));
  notes.push(
    ...use
      .filter(({ pair }) => pending.has(pair))
      .map(({ message }) => `${message}, until its unjudged overlaps are judged`),
  );
  return { problems, notes };
}

/** @param {readonly ListedEntry[]} entries */
const byPair = (entries) => new Map(entries.map((entry) => [key(...entry.sites), entry]));

/**
 * Pairs of the fits that no vehicle uses: one no vehicle overlaps on, or one whose depth is far above the deepest
 * overlap it covers, so the table keeps no pair that has lost its reason and no cap that has come loose. Each is keyed
 * by the pair's roles: while an overlap deeper than the pair is marked `unjudged`, the pair may yet be refitted to it,
 * so the report notes it rather than fails.
 * @param {readonly Fit[]} fits
 * @param {number} grain
 * @param {ReadonlyMap<string, readonly number[]>} measured
 * @returns {{ pair: string; message: string }[]}
 */
function seatingUse(fits, grain, measured) {
  return fits.flatMap(({ pairs }, i) =>
    pairs.flatMap(([seated, into, depth]) => {
      const pair = key(seated, into);
      const depths = measured.get(pair);
      const covered = Math.max(0, ...(depths ?? []).filter((found) => found <= depth + EPSILON));
      const where = `seating fit ${i + 1}: pair ${seated} and ${into}`;
      /** @param {string} message */
      const found = (message) => [{ pair, message: `${where} ${message}` }];
      if (!depths) return found('is unused: no vehicle overlaps on it');
      if (covered === 0) return found(`is dead: every overlap on it is deeper than ${millimetres(depth)} mm`);
      if (depth - covered > LOOSE * grain) {
        return found(`is capped at ${millimetres(depth)} mm, far above the ${millimetres(covered)} mm it covers`);
      }
      return [];
    }),
  );
}
