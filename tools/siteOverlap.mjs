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
import { resolve } from 'node:path';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { solid } from './pieceSolid.mjs';

const repo = resolve(import.meta.dirname, '..');

// Every vehicle's sites that name a part of the vehicle rows, with the part's pieces placed in the vehicle frame and the
// grain the part is drawn on, and the overlaps it allows and has not judged, the fits by role and every drawn site's id:
// { grain, fits, roles, motions, vehicles: { vehicle: { parent?, forward, sites: [{ id, part, grain, pieces, mirror?,
// at, rides? }], overlaps, unjudged,
// ledger, swingContacts, swingUnjudged } } }, where `ledger` is the vehicle's rows of its family's unjudged list. A
// site whose part is a roster model has no pieces to compare, so it is left out.
// `motions` gives each part that moves its authored stages and its pieces as drawn, before any site moves them, which
// tools/swingClearance.mjs turns into the motion at each site.
export function readSitePieces(root = repo) {
  return JSON.parse(evaluateJsonnet(`
  local k = import 'models/vehicles/kit.libsonnet';
  local voxel = import 'tools/jsonnet/lib/voxel-grains.libsonnet';
  local placements = import 'models/vehicles/placements.libsonnet';
  local ledger = import 'models/vehicles/unjudged-overlaps.libsonnet';
  local rows = std.flattenArrays(std.objectValues(import 'models/vehicles/index.libsonnet'));
  local drawn = { [row.id]: std.parseJson(row.parts[0].params.pieces) for row in rows };
  local grains = { [row.id]: voxel.of(voxel.vehicle, row).grain for row in rows };
  local placed(site) = [
    k.moved(if std.objectHas(site, 'mirror') then k.far(piece) else piece, site.at)
    for piece in drawn[site.part]
  ];
  local moving = [row for row in rows if std.objectHas(row, 'motion')];
  {
    grain: voxel.vehicle.grain,
    motions: { [row.id]: { stages: row.motion.stages, pieces: drawn[row.id] } for row in moving },
    fits: (import 'models/vehicles/seating.libsonnet').fits,
    roles: std.set(std.flattenArrays([
      [site.id for site in placements[vehicle].sites if std.objectHas(drawn, site.part)]
      for vehicle in std.objectFields(placements)
      if std.objectHas(placements[vehicle], 'sites')
    ])),
    vehicles: {
      [vehicle]: {
        parent: std.get(placements[vehicle], 'parent'),
        forward: placements[vehicle].forward,
        sites: [site { grain: grains[site.part], pieces: placed(site) } for site in placements[vehicle].sites if std.objectHas(drawn, site.part)],
        overlaps: std.get(placements[vehicle], 'overlaps', []),
        unjudged: std.get(placements[vehicle], 'unjudged', []),
        ledger: std.get(ledger, vehicle, []),
        swingContacts: std.get(placements[vehicle], 'swingContacts', []),
        swingUnjudged: std.get(placements[vehicle], 'swingUnjudged', []),
      }
      for vehicle in std.objectFields(placements)
      if std.objectHas(placements[vehicle], 'sites')
    },
  }`, root));
}

export const key = (a, b) => [a, b].sort().join('\n');

// The deepest point two solids share, as how far inside both it lies (m), or 0 when they share no more than `inside`:
// a point must lie `inside` deep in both, and the solids are sampled every `step` m through the box they share.
export function sharedDepth(p, q, inside, step) {
  const lo = [0, 1, 2].map((i) => Math.max(p.min[i], q.min[i]) + inside);
  const hi = [0, 1, 2].map((i) => Math.min(p.max[i], q.max[i]) - inside);
  if (lo.some((l, i) => l > hi[i])) return 0;
  const samples = (i) => Math.ceil((hi[i] - lo[i]) / step) + 1;
  const at = (i, n) => (samples(i) === 1 ? lo[i] : lo[i] + ((hi[i] - lo[i]) * n) / (samples(i) - 1));
  let deepest = 0;
  for (let x = 0; x < samples(0); x++) {
    for (let y = 0; y < samples(1); y++) {
      for (let z = 0; z < samples(2); z++) {
        const point = [at(0, x), at(1, y), at(2, z)];
        deepest = Math.max(deepest, -Math.max(p.distance(point), q.distance(point)));
      }
    }
  }
  return deepest > inside ? deepest : 0;
}

const REFINE = 12; // halvings that place a boundary between two march steps

// The spans (m along `axis`) where a solid lies on the line through `point` parallel to `axis`, as [enter, leave]
// pairs, read only from `from` to `to`. The march steps by the solid's distance, which never oversteps a boundary, and
// at least `least`.
function spans({ box, min, max, distance }, point, axis, [from, to], least) {
  const [start, end] = [Math.max(min[axis], from), Math.min(max[axis], to)];
  if (box) {
    const through = [0, 1, 2].every((i) => i === axis || (min[i] <= point[i] && point[i] <= max[i]));
    return through && start < end ? [[start, end]] : [];
  }
  const inside = (t) => distance(point.with(axis, t)) < 0;
  const boundary = (outer, inner) => {
    let [a, b] = [outer, inner];
    for (let i = 0; i < REFINE; i++) {
      const mid = (a + b) / 2;
      if (inside(mid) === inside(b)) b = mid;
      else a = mid;
    }
    return b;
  };
  const found = [];
  let [t, previous, within, enter] = [start, start, false, 0];
  while (t <= end) {
    const d = distance(point.with(axis, t));
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

// How far (m) q must move along `axis`, one way or the other, to share no point with p, or null when no line sampled
// every `step` m through the boxes' shared face finds them sharing one. A shift is barred while, on some line, a span
// of q moved by it meets a span of p, so a piece passing right through a panel must move clear of the whole panel. A
// move of `beyond` or more is not told apart from `beyond`, so the spans are read only where a shorter move reaches.
function shiftClear(p, q, axis, step, beyond) {
  const across = [0, 1, 2].filter((i) => i !== axis);
  const lines = across.map((i) => {
    const [lo, hi] = [Math.max(p.min[i], q.min[i]), Math.min(p.max[i], q.max[i])];
    const n = Math.max(1, Math.ceil((hi - lo) / step));
    return Array.from({ length: n }, (_, k) => lo + ((k + 0.5) * (hi - lo)) / n);
  });
  const barred = [];
  for (const u of lines[0]) {
    for (const v of lines[1]) {
      const point = [0, 0, 0].with(across[0], u).with(across[1], v);
      const onQ = spans(q, point, axis, [p.min[axis] - beyond, p.max[axis] + beyond], step / 2);
      if (onQ.length === 0) continue;
      const onP = spans(p, point, axis, [q.min[axis] - beyond, q.max[axis] + beyond], step / 2);
      for (const [a0, a1] of onP) for (const [b0, b1] of onQ) barred.push([a0 - b1, a1 - b0]);
    }
  }
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

// How deep (m) two solids sink into each other, as the shortest move along an axis that parts them, or 0 when they
// part with a move of `grain` or less. A piece through a thin panel thus reads as deep as it passes, not as thin as
// the panel. Moves are sampled on lines every `step` m.
export function penetration(p, q, grain, step) {
  // A move that parts the boxes parts the solids, so no axis needs a longer one, and boxes that part with a grain's
  // move hold no deeper overlap. The axis whose boxes part soonest is read first, as the likeliest shortest.
  const boxesPart = (i) => Math.min(p.max[i] - q.min[i], q.max[i] - p.min[i]);
  const axes = [0, 1, 2].sort((a, b) => boxesPart(a) - boxesPart(b));
  if (boxesPart(axes[0]) <= grain) return 0;
  let [depth, sharing] = [boxesPart(axes[0]), false];
  for (const axis of axes) {
    const move = shiftClear(p, q, axis, step, Math.min(depth, boxesPart(axis)));
    if (move === null) continue;
    [depth, sharing] = [Math.min(depth, move), true];
    if (depth <= grain) return 0;
  }
  return sharing ? depth : 0;
}

// Every pair of sites of one vehicle whose pieces overlap by more than the finer of their parts' grains, as
// { sites: [a, b], parts: [a, b], pieces: [a, b], depth }, depth being the penetration (m) of the deepest piece pair
// found. A site's part is drawn on its `grain`, or on the vehicle's `grain` when it names none, and moves are sampled
// every vehicle grain. Pieces are swept along x so only those whose boxes meet are compared.
export function siteOverlaps(sites, grain) {
  const pieces = sites.flatMap((site, owner) =>
    site.pieces.map((piece) => ({ owner, id: piece.id, grain: site.grain ?? grain, ...solid(piece) })))
    .sort((a, b) => a.min[0] - b.min[0]);
  const found = new Map();
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length && pieces[j].min[0] < pieces[i].max[0]; j++) {
      if (pieces[i].owner === pieces[j].owner) continue;
      const [p, q] = pieces[i].owner < pieces[j].owner ? [pieces[i], pieces[j]] : [pieces[j], pieces[i]];
      const depth = penetration(p, q, Math.min(p.grain, q.grain), grain);
      const pair = key(p.owner, q.owner);
      if (depth > (found.get(pair)?.depth ?? 0)) {
        found.set(pair, { owners: [p.owner, q.owner], pieces: [p.id, q.id], depth });
      }
    }
  }
  return [...found.values()].map(({ owners, pieces: ids, depth }) => ({
    sites: owners.map((owner) => sites[owner].id),
    parts: owners.map((owner) => sites[owner].part),
    pieces: ids,
    depth,
  }));
}

// A site's role: its id without the side it is on and its number, so every vehicle's wheels share one fit.
export const roleOf = (siteId) => siteId.replace(/_(near|far)(?=_|$)/g, '').replace(/_\d+(?=_|$)/g, '');

const FIT_KEYS = ['pairs', 'why'];
const EPSILON = 1e-9;
const LOOSE = 1; // grains a cap may exceed the depth it was measured at

// Why the fits cannot be trusted, as messages: a malformed fit or pair, a role no drawn site has, and a pair of roles
// that is listed twice, whose depths would then disagree.
export function seatingProblems(fits, roles) {
  const known = new Set(roles.map(roleOf));
  const listed = new Map();
  return fits.flatMap((fit, i) => {
    const where = `seating fit ${i + 1} (${String(fit?.why).slice(0, 40)})`;
    const keys = Object.keys(fit ?? {}).sort();
    const shape = [
      ...(keys.join() === FIT_KEYS.join() ? [] : [`${where}: has keys ${keys.join(' ')}, not ${FIT_KEYS.join(' ')}`]),
      ...(typeof fit?.why === 'string' && fit.why !== '' ? [] : [`${where}: needs a why`]),
      ...(Array.isArray(fit?.pairs) && fit.pairs.length > 0 ? [] : [`${where}: needs at least one pair`]),
    ];
    if (shape.length > 0) return shape;
    return fit.pairs.flatMap((pair) => {
      const items = Array.isArray(pair) ? pair : [];
      const [seated, into, depth] = items;
      const name = `${where}: pair ${seated} and ${into}`;
      if (items.length !== 3 || typeof seated !== 'string' || typeof into !== 'string' || !(depth > 0)) {
        return [`${where}: pair ${JSON.stringify(pair)} is not [seated, into, depth] with a depth above 0`];
      }
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

// How deep (m) the fits let parts of the two roles sink into each other: the depth of the pair that names them, in
// either orientation, or 0.
export function fitDepth(fits, roleA, roleB) {
  const pair = key(roleA, roleB);
  const depths = fits.flatMap(({ pairs }) => pairs).filter(([a, b]) => key(a, b) === pair).map(([, , depth]) => depth);
  return Math.max(0, ...depths);
}

const millimetres = (metres) => Math.round(metres * 1e3);

// The report on every vehicle's overlaps, as { problems, notes } messages. A problem is an overlap that no fit,
// allowance or `unjudged` entry covers, or covers only to a lesser depth, and an entry that is stale: its pair no
// longer overlaps, a fit already covers it, or it is listed twice. A note is an overlap marked `unjudged`, said again
// on every run so nothing is silent. Each message names the vehicle, both parts and their sites. A row of the family
// list may stand over a pair the vehicle allows, since its allowance was sized by an earlier measure, so the row is
// stale only once the fits or that allowance cover the overlap again.
export function overlapReport({ grain, fits, roles, vehicles }) {
  const problems = seatingProblems(fits, roles);
  const notes = [];
  const measured = new Map();
  const pending = new Set();
  for (const [vehicle, { parent, sites, overlaps, unjudged, ledger = [] }] of Object.entries(vehicles)) {
    const found = new Map(siteOverlaps(sites, grain).map((overlap) => [key(...overlap.sites), overlap]));
    const roleDepth = ({ sites: [a, b] }) => fitDepth(fits, roleOf(a), roleOf(b));
    const from = (name) => vehicles[parent]?.[name] ?? [];
    const allowed = byPair([...from('overlaps'), ...from('unjudged'), ...overlaps, ...unjudged]);
    const listed = byPair([...from('ledger'), ...ledger]);
    const notJudged = new Set([...from('unjudged'), ...unjudged]);
    const describe = ({ sites: [a, b], parts: [partA, partB] }) =>
      `${vehicle}: ${partA} at ${a} and ${partB} at ${b}`;
    for (const overlap of found.values()) {
      const pair = key(...overlap.sites);
      const rolePair = key(...overlap.sites.map(roleOf));
      measured.set(rolePair, [...(measured.get(rolePair) ?? []), overlap.depth]);
      const allowance = allowed.get(pair);
      const unsettled = notJudged.has(allowance) || listed.has(pair);
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
    audit([...overlaps, ...unjudged], [...from('overlaps'), ...from('unjudged')], roleDepth, 'allowed overlap', 'the seating');
    const judged = (overlap) => Math.max(roleDepth(overlap), allowed.get(key(...overlap.sites))?.depth ?? 0);
    audit(ledger, from('ledger'), judged, 'family-listed overlap', 'the seating or the vehicle');
  }
  const use = seatingUse(fits, grain, measured);
  problems.push(...use.filter(({ pair }) => !pending.has(pair)).map(({ message }) => message));
  notes.push(...use.filter(({ pair }) => pending.has(pair)).map(({ message }) => `${message}, until its unjudged overlaps are judged`));
  return { problems, notes };
}

const byPair = (entries) => new Map(entries.map((entry) => [key(...entry.sites), entry]));

// Pairs of the fits that no vehicle uses: one no vehicle overlaps on, or one whose depth is far above the deepest
// overlap it covers, so the table keeps no pair that has lost its reason and no cap that has come loose. Each is
// { pair, message }, keyed by the pair's roles: while an overlap deeper than the pair is marked `unjudged`, the pair
// may yet be refitted to it, so the report notes it rather than fails.
function seatingUse(fits, grain, measured) {
  return fits.flatMap(({ pairs }, i) => pairs.flatMap(([seated, into, depth]) => {
    const pair = key(seated, into);
    const depths = measured.get(pair);
    const covered = Math.max(0, ...(depths ?? []).filter((found) => found <= depth + EPSILON));
    const where = `seating fit ${i + 1}: pair ${seated} and ${into}`;
    const found = (message) => [{ pair, message: `${where} ${message}` }];
    if (!depths) return found('is unused: no vehicle overlaps on it');
    if (covered === 0) return found(`is dead: every overlap on it is deeper than ${millimetres(depth)} mm`);
    if (depth - covered > LOOSE * grain) {
      return found(`is capped at ${millimetres(depth)} mm, far above the ${millimetres(covered)} mm it covers`);
    }
    return [];
  }));
}

export const siteOverlapReport = (root = repo) => overlapReport(readSitePieces(root));
