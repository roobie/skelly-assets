// Finds parts placed at different sites of one vehicle that occupy the same space. A part is authored as pieces in its
// vehicle's frame; a site moves them by its position, and a far-side twin first reflects them across the centre plane
// (models/vehicles/kit.libsonnet, `far` and `moved`), exactly as the showcase and the game place the part. Two pieces
// overlap when they share more than one voxel grain of depth, so faces that touch or sink a grain into each other are
// contact, not overlap. Parts that one site composes are out of scope: a site's pieces may overlap each other freely.
// Two things allow an overlap: the seating of either part's role (models/vehicles/seating.libsonnet), which holds for every
// vehicle, and the vehicle's own placements file, `overlaps` (models/vehicles/site.libsonnet, `overlap`), which a variant
// shares with its parent. The reason for the rule is in docs/decisions/0014-site-overlap.md.
import { resolve } from 'node:path';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { solid } from './pieceSolid.mjs';

const repo = resolve(import.meta.dirname, '..');

// Every vehicle's sites that name a part of the vehicle rows, with the part's pieces placed in the vehicle frame, and
// the overlaps it allows, and the seating by role: { grain, seating, vehicles: { vehicle: { parent?, sites: [{ id, part, pieces }], overlaps } } }. A site whose part
// is a roster model has no pieces to compare, so it is left out.
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
    seating: (import 'models/vehicles/seating.libsonnet').seats,
    vehicles: {
      [vehicle]: {
        parent: std.get(placements[vehicle], 'parent'),
        sites: [site { pieces: placed(site) } for site in placements[vehicle].sites if std.objectHas(drawn, site.part)],
        overlaps: std.get(placements[vehicle], 'overlaps', []),
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
// pieces: [a, b], depth }, depth being the shared thickness (m) at the deepest point sampled of the first piece pair
// found. Pieces are swept along x so only those whose boxes meet are compared.
export function siteOverlaps(sites, grain) {
  const pieces = sites.flatMap((site, owner) => site.pieces.map((piece) => ({ owner, id: piece.id, ...solid(piece) })))
    .sort((a, b) => a.min[0] - b.min[0]);
  const found = new Map();
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length && pieces[j].min[0] < pieces[i].max[0] - grain; j++) {
      const [p, q] = [pieces[i], pieces[j]];
      if (p.owner === q.owner || found.has(key(p.owner, q.owner))) continue;
      const depth = sharedDepth(p, q, grain / 2, grain / 2);
      if (depth > 0) found.set(key(p.owner, q.owner), { owners: [p.owner, q.owner].sort((a, b) => a - b), pieces: [p.id, q.id], depth: 2 * depth });
    }
  }
  return [...found.values()].map(({ owners, pieces: ids, depth }) => ({
    sites: owners.map((owner) => sites[owner].id),
    parts: owners.map((owner) => sites[owner].part),
    pieces: ids,
    depth,
  }));
}

// A site's role: its id without the side it is on and its number, so every vehicle's wheels share one seating.
export const roleOf = (siteId) => siteId.replace(/_(near|far)(?=_|$)/g, '').replace(/_\d+(?=_|$)/g, '');

const globPattern = (glob) => new RegExp(`^${glob.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);

// How deep (m) the role seats into its neighbours: the deepest of the seating entries that name it, or 0.
export function seatDepth(seating, role) {
  return Math.max(0, ...seating.filter(({ roles }) => roles.some((glob) => globPattern(glob).test(role))).map(({ depth }) => depth));
}

const millimetres = (metres) => Math.round(metres * 1e3);

// The overlaps no vehicle allows, as messages naming the vehicle, both parts and their sites.
export function overlapProblems({ grain, seating, vehicles }) {
  const seated = ({ sites, depth }) => depth <= Math.max(...sites.map((site) => seatDepth(seating, roleOf(site)))) + 1e-9;
  return Object.entries(vehicles).flatMap(([vehicle, { parent, sites, overlaps }]) => {
    const allowed = new Set([...(vehicles[parent]?.overlaps ?? []), ...overlaps].map(({ sites: pair }) => key(...pair)));
    return siteOverlaps(sites, grain)
      .filter((overlap) => !seated(overlap) && !allowed.has(key(...overlap.sites)))
      .map(({ sites: [a, b], parts: [partA, partB], pieces: [pieceA, pieceB], depth }) =>
        `${vehicle}: ${partA} at ${a} overlaps ${partB} at ${b} by ${millimetres(depth)} mm (${pieceA} in ${pieceB})`);
  });
}

export const siteOverlapProblems = (root = repo) => overlapProblems(readSitePieces(root));
