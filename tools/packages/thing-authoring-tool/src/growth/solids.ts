// Turns a grown skeleton (grow.ts) into the convex solids the thing exporter draws, voxel and smooth alike: bark as
// tapered tubes along the axes, and foliage as flattened clumps over the young shoots. A voxel pipeline has no
// transparent twig cards, so a clump stands for a card spray: it faces out of the crown's ellipsoid as the article's
// cards blend their normals toward one, which is what lets a crown read as a volume and not as a heap of balls.
import { add, cross, dot, length, normalize, scale, sub, type Vec3 } from '@skelly/construct/foundation/math.ts';
import type { ClipPlane, ExtrudedPolygonSolid, SolidDisplayHints, Vec2 } from '@skelly/construct/shapes/solid.ts';
import type { Skeleton } from './grow.ts';
import type { Species } from './species.ts';

const UP: Vec3 = [0, 1, 0];
const OCTAGON = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
/** A tangent plane every 45°, the 26 directions of a cube's faces, edges and corners. */
const FACETS: readonly Vec3[] = [-1, 0, 1].flatMap((x) =>
  [-1, 0, 1].flatMap((y) => [-1, 0, 1].flatMap((z): Vec3[] => (x || y || z ? [normalize([x, y, z])] : []))),
);
/** The octagon's corners lie this far out from its flats. */
const OCTAGON_REACH = 1 / Math.cos(Math.PI / 8);
const PLAIN: SolidDisplayHints = { bevel: false };

/** How a grown skeleton is drawn: the voxel grain its row is exported at, and the internodes thinning cut (thin.ts). */
export interface Drawing {
  readonly grain: number;
  readonly cut: ReadonlySet<number>;
}

/** A solid bounded by `clip` inside the box from `low` to `high`, as the compound family's clipped prisms are. */
const clipped = (
  id: string,
  slot: string,
  low: Vec3,
  high: Vec3,
  clip: readonly ClipPlane[],
  display = PLAIN,
): ExtrudedPolygonSolid => {
  // On the y axis a profile's points are [z, x], counterclockwise.
  const profile: Vec2[] = [
    [low[2], low[0]],
    [high[2], low[0]],
    [high[2], high[0]],
    [low[2], high[0]],
  ];
  return { id, slot, kind: 'extruded-polygon', axis: 'y', profile, z: [low[1], high[1]], clip, display };
};

const across = (dir: Vec3): Vec3 => normalize(cross(dir, Math.abs(dir[1]) < 0.9 ? UP : [0, 0, 1]));
const mean = (points: readonly Vec3[]): Vec3 => scale(points.reduce(add), 1 / points.length);

/** An octagonal tube from `a` (radius r0) to `b` (radius r1): two caps and eight flats leaning in with the taper. */
const tube = (id: string, slot: string, a: Vec3, b: Vec3, r0: number, r1: number): ExtrudedPolygonSolid => {
  const run = sub(b, a);
  const d = normalize(run);
  const u = across(d);
  const w = cross(d, u);
  const taper = (r0 - r1) / length(run);
  const reach = Math.max(r0, r1) * OCTAGON_REACH;
  const low = [0, 1, 2].map((i) => Math.min(a[i]!, b[i]!) - reach) as unknown as Vec3;
  const high = [0, 1, 2].map((i) => Math.max(a[i]!, b[i]!) + reach) as unknown as Vec3;
  const flats = OCTAGON.map((angle): ClipPlane => {
    const normal = add(add(scale(u, Math.cos(angle)), scale(w, Math.sin(angle))), scale(d, taper));
    return { normal, offset: r0 + dot(normal, a) };
  });
  return clipped(id, slot, low, high, [
    { normal: scale(d, -1), offset: -dot(d, a) },
    { normal: d, offset: dot(d, b) },
    ...flats,
  ]);
};

/**
 * An ellipsoid's 26 tangent planes, its short axis along `facing`, cut at the ground. The planes lie at the ellipsoid's
 * support h(n) = |R·diag(r)·Rᵀ n|, so the facets circumscribe it and the box of its three axis supports holds them.
 */
const clump = (
  id: string,
  slot: string,
  centre: Vec3,
  radius: number,
  thickness: number,
  facing: Vec3,
  display: SolidDisplayHints,
): ExtrudedPolygonSolid => {
  const u = across(facing);
  const axes: readonly [Vec3, number][] = [
    [u, radius],
    [cross(facing, u), radius],
    [facing, thickness],
  ];
  const support = (n: Vec3) => Math.hypot(...axes.map(([axis, r]) => r * dot(axis, n)));
  const half = [0, 1, 2].map((i) => support([0, 1, 2].map((j) => (i === j ? 1 : 0)) as unknown as Vec3));
  const low = centre.map((c, i) => c - half[i]!) as unknown as Vec3;
  const high = centre.map((c, i) => c + half[i]!) as unknown as Vec3;
  return clipped(
    id,
    slot,
    [low[0], Math.max(low[1], 0), low[2]],
    high,
    [
      ...FACETS.map((normal) => ({ normal, offset: support(normal) + dot(normal, centre) })),
      { normal: [0, -1, 0], offset: 0 },
    ],
    display,
  );
};

/**
 * The bark: each axis walked from its foot, its internodes gathered into straight runs while they bend less than
 * `merge`, each run one tube. A run starts a radius back down its axis so a bend leaves no notch, and the trunk's first
 * run flares and sinks below the ground. Axes thinner than `cull`, and those thinning cut, are left out.
 */
const barkOf = (
  { internodes, roots, radius, tip }: Skeleton,
  { bark, pipe }: Species,
  { cut }: Drawing,
  slot: string,
) => {
  const tubes: ExtrudedPolygonSolid[] = [];
  const mergeCos = Math.cos((bark.merge * Math.PI) / 180);
  const drawn = (i: number) => internodes[i]!.alive && !cut.has(i);
  const endRadius = (i: number) => {
    const main = internodes[i]!.main;
    return main && 'child' in main && drawn(main.child) ? radius[main.child]! : tip;
  };
  const axisFeet = [...roots];
  const rootSet = new Set(roots);
  while (axisFeet.length > 0) {
    let i = axisFeet.pop()!;
    while (i >= 0 && drawn(i) && radius[i]! >= bark.cull) {
      const first = internodes[i]!;
      const dir = normalize(sub(first.end, first.start));
      let last = i;
      for (;;) {
        for (const slot of internodes[last]!.laterals) {
          if (slot && 'child' in slot && drawn(slot.child)) axisFeet.push(slot.child);
        }
        const main = internodes[last]!.main;
        const next = main && 'child' in main ? main.child : -1;
        if (next < 0 || !drawn(next) || radius[next]! < bark.cull) break;
        const along = normalize(sub(internodes[next]!.end, internodes[next]!.start));
        if (dot(along, dir) < mergeCos) break;
        last = next;
      }
      const foot = rootSet.has(i);
      const r0 = radius[i]! * (foot ? pipe.flare : 1);
      const start = foot ? sub(first.start, [0, pipe.sink, 0]) : sub(first.start, scale(dir, radius[i]!));
      tubes.push(tube(`bark-${tubes.length}`, slot, start, internodes[last]!.end, r0, endRadius(last)));
      const main = internodes[last]!.main;
      i = main && 'child' in main ? main.child : -1;
    }
  }
  return tubes;
};

/** The ellipsoid that bounds every leafy point, no thinner than a clump on any axis. */
const crownOf = (points: readonly Vec3[], clumpRadius: number) => {
  const low = [0, 1, 2].map((i) => Math.min(...points.map((p) => p[i]!)));
  const high = [0, 1, 2].map((i) => Math.max(...points.map((p) => p[i]!)));
  return {
    centre: low.map((l, i) => (l + high[i]!) / 2) as unknown as Vec3,
    radii: low.map((l, i) => Math.max((high[i]! - l) / 2, clumpRadius)) as unknown as Vec3,
  };
};

/**
 * The foliage: the ends of shoots younger than `age`, gathered by cells a clump across into one clump each at their
 * mean, facing between up and out of the crown's ellipsoid by `crown`; then a core box down each column of clumps, so
 * the crown is solid inside. The crown is measured before thinning, so a sparser tree's clumps face as a thick one's.
 */
const foliageOf = ({ internodes, seasons }: Skeleton, { foliage }: Species, { grain, cut }: Drawing, slot: string) => {
  const young = internodes.flatMap((node, index) =>
    node.alive && seasons - node.born < foliage.age ? [{ end: node.end, kept: !cut.has(index) }] : [],
  );
  if (young.length === 0) return [];
  const crown = crownOf(
    young.map(({ end }) => end),
    foliage.clump,
  );
  const cell = foliage.clump * 2;
  const cellOf = (p: Vec3) => p.map((v) => Math.floor(v / cell));
  const cells = new Map<string, Vec3[]>();
  for (const { end, kept } of young) {
    if (!kept) continue;
    const at = cellOf(end).join(',');
    cells.set(at, [...(cells.get(at) ?? []), end]);
  }
  const centres = [...cells.keys()].sort().map((at) => mean(cells.get(at)!));

  const thickness = Math.max(foliage.clump * foliage.squash, foliage.least * grain);
  const radius = Math.max(foliage.clump, thickness);
  const display: SolidDisplayHints = foliage.terrace > 1 ? { ...PLAIN, terrace: foliage.terrace } : PLAIN;
  const clumps = centres.map((centre, index) => {
    const offset = sub(centre, crown.centre);
    const outward = offset.map((v, i) => v / crown.radii[i]! ** 2) as unknown as Vec3;
    const out = length(outward) > 1e-9 ? normalize(outward) : UP;
    const facing = normalize(add(scale(UP, 1 - foliage.crown), scale(out, foliage.crown)));
    return clump(`leaf-${index}`, slot, centre, radius, thickness, facing, display);
  });

  const columns = new Map<string, Vec3[]>();
  for (const centre of centres) {
    const [i, , k] = cellOf(centre);
    columns.set(`${i},${k}`, [...(columns.get(`${i},${k}`) ?? []), centre]);
  }
  const half = foliage.clump * foliage.core;
  const cores =
    half > 0
      ? [...columns.values()]
          .filter((column) => column.length >= 2)
          .map((column, index) => {
            const [x, , z] = mean(column);
            const ys = column.map((p) => p[1]);
            const low: Vec3 = [x - half, Math.max(0, Math.min(...ys)), z - half];
            return clipped(`leaf-core-${index}`, slot, low, [x + half, Math.max(...ys), z + half], []);
          })
      : [];
  return [...clumps, ...cores];
};

/** The solids a grown skeleton draws as, in two finish slots: `bark` and `leaf`. */
export const grownSolids = (skeleton: Skeleton, species: Species, drawing: Drawing): ExtrudedPolygonSolid[] => [
  ...barkOf(skeleton, species, drawing, 'bark'),
  ...foliageOf(skeleton, species, drawing, 'leaf'),
];
