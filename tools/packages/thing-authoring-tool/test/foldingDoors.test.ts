import { resolve } from 'node:path';
import { add, applyPoint, sub, type Vec3 } from '@skelly/construct/foundation/math.ts';
import { toModelFrame } from '@skelly/thing-core/frame';
import { posePoint } from '@skelly/thing-core/motion';
import type { Motion } from '@skelly/thing-core/schema';
import { expect, it } from 'vitest';
import { evaluateJsonnet } from '../../../jsonnet/index.mjs';
import { buildItem, itemMotion, loadCatalogue } from '../src/catalogue.ts';

interface Site {
  readonly id: string;
  readonly part: string;
  readonly at: Vec3;
  readonly rides?: string;
  readonly mirror?: boolean;
}

// Every vehicle's folding door panels, the sites that place them, the jamb panel sites of each doorway whose two leaves
// close against each other, and the vehicle grain a row without its own is drawn at.
const { grain, vehicles, doorPairs, rows } = JSON.parse(evaluateJsonnet(`
  local placements = import 'models/vehicles/placements.libsonnet';
  local frame = import 'models/vehicles/frame.libsonnet';
  local rows = std.flattenArrays(std.objectValues(import 'models/vehicles/index.libsonnet'));
  local folding(site) = std.endsWith(site.part, '_jamb') || std.endsWith(site.part, '_free');
  local sites = { [v]: [site for site in std.get(placements[v], 'sites', []) if folding(site)] for v in std.objectFields(placements) };
  // A variant keeps its parent's doorways, as it keeps its parent's sites.
  local pairsOf(v) =
    if std.objectHasAll(placements[v], 'doorPairs') then placements[v].doorPairs
    else if std.objectHas(placements[v], 'parent') then pairsOf(placements[v].parent);
  local parts = std.set(std.flattenArrays([[site.part for site in sites[v]] for v in std.objectFields(sites)]));
  {
    grain: (import 'models/voxel-grains.libsonnet').classes.vehicle.grain,
    vehicles: { [v]: sites[v] for v in std.objectFields(sites) if std.length(sites[v]) > 0 },
    doorPairs: { [v]: pairsOf(v) for v in std.objectFields(placements) if pairsOf(v) != null },
    rows: frame.rows([row for row in rows if std.member(parts, row.id)]),
  }
`, resolve(import.meta.dirname, '../../../..'))) as {
  grain: number;
  vehicles: Record<string, Site[]>;
  doorPairs: Record<string, [string, string][]>;
  rows: unknown[];
};

const loaded = loadCatalogue({ units: { metresPerUnit: 1, grid: 0.001, bevel: 0 }, facets: 12, defaultMaterial: 'paint-silver', items: rows });

// Each panel's motion and the box each of its solids' voxels fill, both in the model frame about the panel's origin.
const panels = new Map(
  loaded.items.map((item) => {
    const voxelGrain = item.voxelGrain ?? grain;
    const built = buildItem(item, loaded, { voxelGrain });
    const { defs, placed } = built.report.resolved;
    const part = item.parts[0]!.id;
    const place = (point: Vec3) => applyPoint(placed.get(part)!, point);
    const boxes = defs.get(part)!.solids.map((solid) => {
      const { min, max } = built.drawn.measure(part, solid);
      const [a, b] = [place(min), place(max)];
      const bound = (pick: typeof Math.min) => a.map((value, axis) => pick(value, b[axis]!)) as unknown as Vec3;
      return { min: bound(Math.min), max: bound(Math.max) };
    });
    return [item.id, { motion: itemMotion(item, loaded, built, voxelGrain)!, boxes, forward: item.forward! }] as const;
  }),
);

// Where a point of a site's panel lies at `clock`: moved by the panel's own motion, then by each carrier's in turn.
const poser = (sites: readonly Site[]) => {
  const byId = new Map(sites.map((site) => [site.id, site]));
  const origin = (site: Site): Vec3 => toModelFrame(panels.get(site.part)!.forward, site.at);
  const motion = (site: Site): Motion => panels.get(site.part)!.motion;
  return (site: Site, point: Vec3, clock: number): Vec3 => {
    let at = add(origin(site), posePoint(motion(site), point, clock));
    for (let carrier = byId.get(site.rides ?? ''); carrier; carrier = byId.get(carrier.rides ?? '')) {
      at = add(origin(carrier), posePoint(motion(carrier), sub(at, origin(carrier)), clock));
    }
    return at;
  };
};

// Every hinge turns about y, so a solid stays an upright box: its outline across y (x and z) and its rise along it.
type Outline = { readonly corners: readonly (readonly [number, number])[]; readonly low: number; readonly high: number };

// How far apart two convex outlines are along the axis that parts them best: negative by how deep they interpenetrate.
const separation = (a: Outline, b: Outline): number => {
  if (a.high <= b.low || b.high <= a.low) return Number.POSITIVE_INFINITY;
  let best = Number.NEGATIVE_INFINITY;
  for (const [from, to] of [[a, b], [b, a]] as const) {
    from.corners.forEach(([x0, z0], i) => {
      const [x1, z1] = from.corners[(i + 1) % from.corners.length]!;
      const length = Math.hypot(x1 - x0, z1 - z0);
      const normal = [(z1 - z0) / length, -(x1 - x0) / length] as const;
      const along = ([x, z]: readonly [number, number]) => x * normal[0] + z * normal[1];
      const [ours, theirs] = [from.corners.map(along), to.corners.map(along)];
      best = Math.max(best, Math.min(...theirs) - Math.max(...ours), Math.min(...ours) - Math.max(...theirs));
    });
  }
  return best;
};

// A vehicle's folding leaves, each a panel that rides no other folding panel with every panel that rides it, keyed by
// that panel's site, and how far apart two of them are at `clock`.
const leavesOf = (vehicle: string, sites: readonly Site[]) => {
  for (const site of sites) if (site.mirror) throw new Error(`${vehicle} ${site.id}: a far-side door is not posed here`);
  const pose = poser(sites);
  const carrier = (site: Site) => sites.find(({ id }) => id === site.rides);
  const leafOf = (site: Site): string => {
    const below = carrier(site);
    return below ? leafOf(below) : site.id;
  };
  const leaves = new Map<string, Site[]>();
  for (const site of sites) leaves.set(leafOf(site), [...(leaves.get(leafOf(site)) ?? []), site]);
  const drawOutlines = (leaf: string, clock: number): Outline[] =>
    leaves.get(leaf)!.flatMap((site) =>
      panels.get(site.part)!.boxes.map(({ min, max }) => ({
        corners: ([[min[0], min[2]], [max[0], min[2]], [max[0], max[2]], [min[0], max[2]]] as const).map(([x, z]) => {
          const [px, , pz] = pose(site, [x, min[1], z], clock);
          return [px, pz] as const;
        }),
        low: pose(site, min, clock)[1],
        high: pose(site, max, clock)[1],
      })),
    );
  const posed = new Map<string, Outline[]>();
  const outlines = (leaf: string, clock: number): Outline[] => {
    const key = `${leaf}@${clock}`;
    if (!posed.has(key)) posed.set(key, drawOutlines(leaf, clock));
    return posed.get(key)!;
  };
  const gap = (a: string, b: string, clock: number) => {
    const theirs = outlines(b, clock);
    return Math.min(...outlines(a, clock).flatMap((one) => theirs.map((other) => separation(one, other))));
  };
  return { ids: [...leaves.keys()], gap };
};

const CLOCKS = 100;

it('keeps every folding leaf clear of every other leaf of its vehicle at every step of the fold, as the voxels draw them', () => {
  let compared = 0;
  for (const [vehicle, sites] of Object.entries(vehicles)) {
    const { ids, gap } = leavesOf(vehicle, sites);
    ids.forEach((a, i) =>
      ids.slice(i + 1).forEach((b) => {
        compared += 1;
        const gaps = Array.from({ length: CLOCKS + 1 }, (_, step) => ({ clock: step / CLOCKS, gap: gap(a, b, step / CLOCKS) }));
        const closest = gaps.reduce((low, next) => (next.gap < low.gap ? next : low));
        expect(closest.gap, `${vehicle}: ${a} and ${b} at clock ${closest.clock}`).toBeGreaterThanOrEqual(-1e-9);
      }),
    );
  }
  expect(compared).toBeGreaterThan(0);
});

// The widest closed seam between a doorway's two leaves that still reads as a seam rather than a slot.
const CLOSED_SEAM = 0.03;

it('closes the two leaves of a doorway to a seam, not a slot', () => {
  const pairs = Object.entries(doorPairs).flatMap(([vehicle, doorways]) => doorways.map((pair) => ({ vehicle, pair })));
  expect(pairs.length).toBeGreaterThan(0);
  for (const { vehicle, pair } of pairs) {
    const { ids, gap } = leavesOf(vehicle, vehicles[vehicle] ?? []);
    for (const leaf of pair) expect(ids, `${vehicle}: ${leaf} is a folding leaf`).toContain(leaf);
    expect(gap(pair[0], pair[1], 0), `${vehicle}: ${pair.join(' and ')} closed`).toBeLessThanOrEqual(CLOSED_SEAM);
  }
});
