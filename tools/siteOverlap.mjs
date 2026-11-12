// Finds parts placed at different sites of one vehicle that occupy the same space. A part is authored as pieces in its
// vehicle's frame; a site moves them by its position, and a far-side twin first reflects them across the centre plane
// (models/vehicles/kit.libsonnet, `far` and `moved`), exactly as the showcase and the game place the part. Two pieces
// overlap when they share more than one voxel grain of depth, so faces that touch or sink a grain into each other are
// contact, not overlap. Parts that one site composes are out of scope: a site's pieces may overlap each other freely.
// An overlap is allowed by a fit between the two parts' roles (`models/vehicles/seating.libsonnet`), which holds for
// every vehicle, or by the vehicle's own placements file (`models/vehicles/site.libsonnet`): `overlap` for one that is
// correct and says why, `unjudged` for one nobody has judged yet, which the report lists on every run. Both are capped
// at the depth they were written for, and a variant shares its parent's. An entry that no longer applies is reported,
// so the lists cannot rot. The reason for the rule is in `docs/decisions/0014-site-overlap.md`.
import { resolve } from 'node:path';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { solid } from './pieceSolid.mjs';

const repo = resolve(import.meta.dirname, '..');

// Every vehicle's sites that name a part of the vehicle rows, with the part's pieces placed in the vehicle frame, and
// the overlaps it allows and has not judged, the fits by role and every drawn site's id: { grain, fits,
// roles, vehicles: { vehicle: { parent?, sites: [{ id, part, pieces }], overlaps, unjudged } } }. A site whose part is
// a roster model has no pieces to compare, so it is left out.
export function readSitePieces(root = repo) {
  return JSON.parse(evaluateJsonnet(`
  local k = import 'models/vehicles/kit.libsonnet';
  local placements = import 'models/vehicles/placements.libsonnet';
  local rows = std.flattenArrays(std.objectValues(import 'models/vehicles/index.libsonnet'));
  local drawn = { [row.id]: std.parseJson(row.parts[0].params.pieces) for row in rows };
  local placed(site) = [
    k.moved(if std.objectHas(site, 'mirror') then k.far(piece) else piece, site.at)
    for piece in drawn[site.part]
  ];
  {
    grain: (import 'models/voxel-grains.libsonnet').classes.vehicle.grain,
    fits: (import 'models/vehicles/seating.libsonnet').fits,
    roles: std.set(std.flattenArrays([
      [site.id for site in placements[vehicle].sites if std.objectHas(drawn, site.part)]
      for vehicle in std.objectFields(placements)
      if std.objectHas(placements[vehicle], 'sites')
    ])),
    vehicles: {
      [vehicle]: {
        parent: std.get(placements[vehicle], 'parent'),
        sites: [site { pieces: placed(site) } for site in placements[vehicle].sites if std.objectHas(drawn, site.part)],
        overlaps: std.get(placements[vehicle], 'overlaps', []),
        unjudged: std.get(placements[vehicle], 'unjudged', []),
      }
      for vehicle in std.objectFields(placements)
      if std.objectHas(placements[vehicle], 'sites')
    },
  }`, root));
}

const key = (a, b) => [a, b].sort().join('\n');

// The deepest point two solids share, as how far inside both it lies (m), or 0 when they share no more than `inside`:
// a point must lie `inside` deep in both, and the solids are sampled every `step` m through the box they share.
function sharedDepth(p, q, inside, step) {
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

// Every pair of sites of one vehicle whose pieces overlap by more than `grain`, as { sites: [a, b], parts: [a, b],
// pieces: [a, b], depth }, depth being the shared thickness (m) at the deepest point sampled of the deepest piece pair
// found. Pieces are swept along x so only those whose boxes meet are compared.
export function siteOverlaps(sites, grain) {
  const pieces = sites.flatMap((site, owner) => site.pieces.map((piece) => ({ owner, id: piece.id, ...solid(piece) })))
    .sort((a, b) => a.min[0] - b.min[0]);
  const found = new Map();
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length && pieces[j].min[0] < pieces[i].max[0] - grain; j++) {
      const [p, q] = [pieces[i], pieces[j]];
      if (p.owner === q.owner) continue;
      const depth = 2 * sharedDepth(p, q, grain / 2, grain / 2);
      const pair = key(p.owner, q.owner);
      if (depth > (found.get(pair)?.depth ?? 0)) {
        found.set(pair, { owners: [p.owner, q.owner].sort((a, b) => a - b), pieces: [p.id, q.id], depth });
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
const LOOSE = 2; // grains a cap may exceed the depth it was measured at

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
      const [seated, into, depth] = Array.isArray(pair) ? pair : [];
      const name = `${where}: pair ${seated} and ${into}`;
      if (pair.length !== 3 || typeof seated !== 'string' || typeof into !== 'string' || !(depth > 0)) {
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
// on every run so nothing is silent. Each message names the vehicle, both parts and their sites.
export function overlapReport({ grain, fits, roles, vehicles }) {
  const problems = seatingProblems(fits, roles);
  const notes = [];
  const measured = new Map();
  for (const [vehicle, { parent, sites, overlaps, unjudged }] of Object.entries(vehicles)) {
    const found = new Map(siteOverlaps(sites, grain).map((overlap) => [key(...overlap.sites), overlap]));
    const roleDepth = ({ sites: [a, b] }) => fitDepth(fits, roleOf(a), roleOf(b));
    const entries = [...overlaps, ...unjudged];
    const inherited = [...(vehicles[parent]?.overlaps ?? []), ...(vehicles[parent]?.unjudged ?? [])];
    const allowed = new Map([...inherited, ...entries].map((entry) => [key(...entry.sites), entry]));
    const inheritedPairs = new Set(inherited.map((entry) => key(...entry.sites)));
    const describe = ({ sites: [a, b], parts: [partA, partB] }) =>
      `${vehicle}: ${partA} at ${a} and ${partB} at ${b}`;
    for (const overlap of found.values()) {
      const rolePair = key(...overlap.sites.map(roleOf));
      measured.set(rolePair, [...(measured.get(rolePair) ?? []), overlap.depth]);
      const cap = Math.max(roleDepth(overlap), allowed.get(key(...overlap.sites))?.depth ?? 0);
      const [partA, partB] = overlap.parts;
      const [a, b] = overlap.sites;
      const detail = `by ${millimetres(overlap.depth)} mm (${overlap.pieces[0]} in ${overlap.pieces[1]})`;
      const limit = cap > 0 ? `, more than the ${millimetres(cap)} mm allowed` : '';
      if (overlap.depth > cap + EPSILON) {
        problems.push(`${vehicle}: ${partA} at ${a} overlaps ${partB} at ${b} ${detail}${limit}`);
      }
    }
    const seen = new Set();
    for (const entry of entries) {
      const pair = key(...entry.sites);
      const [a, b] = entry.sites;
      const where = `${vehicle}: allowed overlap of ${a} and ${b}`;
      const overlap = found.get(pair);
      if (seen.has(pair) || inheritedPairs.has(pair)) problems.push(`${where} is listed twice`);
      else if (!overlap) problems.push(`${where} is stale: the parts no longer overlap`);
      else if (roleDepth(overlap) + EPSILON >= overlap.depth) {
        problems.push(`${where} is stale: the seating already covers it`);
      } else if (entry.depth - overlap.depth > LOOSE * grain) {
        const [capped, measures] = [entry.depth, overlap.depth].map(millimetres);
        problems.push(`${where} is capped at ${capped} mm, far above the ${measures} mm it measures`);
      }
      seen.add(pair);
      if (overlap && unjudged.includes(entry)) {
        const depth = millimetres(overlap.depth);
        notes.push(`${describe(overlap)} overlap by ${depth} mm and are not judged: ${entry.note}`);
      }
    }
  }
  problems.push(...seatingUseProblems(fits, grain, measured));
  return { problems, notes };
}

// Pairs of the fits that no vehicle uses: one no vehicle overlaps on, or one whose depth is far above the deepest
// overlap it covers, so the table keeps no pair that has lost its reason and no cap that has come loose.
function seatingUseProblems(fits, grain, measured) {
  return fits.flatMap(({ pairs }, i) => pairs.flatMap(([seated, into, depth]) => {
    const depths = measured.get(key(seated, into));
    const covered = Math.max(0, ...(depths ?? []).filter((found) => found <= depth + EPSILON));
    const where = `seating fit ${i + 1}: pair ${seated} and ${into}`;
    if (!depths) return [`${where} is unused: no vehicle overlaps on it`];
    if (covered > 0 && depth - covered > LOOSE * grain) {
      return [`${where} is capped at ${millimetres(depth)} mm, far above the ${millimetres(covered)} mm it covers`];
    }
    return [];
  }));
}

export const siteOverlapReport = (root = repo) => overlapReport(readSitePieces(root));
