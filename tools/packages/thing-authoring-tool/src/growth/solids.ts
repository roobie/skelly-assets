// Turns a grown skeleton (grow.ts) into the convex solids the thing exporter draws, voxel and smooth alike: bark as
// tapered tubes along the axes, and foliage as flattened clumps over the young shoots. A voxel pipeline has no
// transparent twig cards, so a clump stands for a card spray: it faces out of the crown's ellipsoid as the article's
// cards blend their normals toward one, which is what lets a crown read as a volume and not as a heap of balls.
import { add, cross, dot, length, normalize, scale, sub, type Vec3 } from '@skelly/construct/foundation/math.ts';
import type { ClipPlane, ExtrudedPolygonSolid, Vec2 } from '@skelly/construct/shapes/solid.ts';
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

/** A solid bounded by `clip` inside the box from `low` to `high`, as the compound family's clipped prisms are. */
const clipped = (id: string, slot: string, low: Vec3, high: Vec3, clip: readonly ClipPlane[]): ExtrudedPolygonSolid => {
  // On the y axis a profile's points are [z, x], counterclockwise.
  const profile: Vec2[] = [
    [low[2], low[0]],
    [high[2], low[0]],
    [high[2], high[0]],
    [low[2], high[0]],
  ];
  return {
    id,
    slot,
    kind: 'extruded-polygon',
    axis: 'y',
    profile,
    z: [low[1], high[1]],
    clip,
    display: { bevel: false },
  };
};

const across = (dir: Vec3): Vec3 => normalize(cross(dir, Math.abs(dir[1]) < 0.9 ? UP : [0, 0, 1]));

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
  return clipped(id, slot, [low[0], Math.max(low[1], 0), low[2]], high, [
    ...FACETS.map((normal) => ({ normal, offset: support(normal) + dot(normal, centre) })),
    { normal: [0, -1, 0], offset: 0 },
  ]);
};

/**
 * The bark: each axis walked from its foot, its internodes gathered into straight runs while they bend less than
 * `merge`, each run one tube. A run starts a radius back down its axis so a bend leaves no notch, and the trunk's first
 * run flares and sinks below the ground. Axes thinner than `cull` are left to the foliage.
 */
const barkOf = ({ internodes, roots, radius, tip }: Skeleton, { bark, pipe }: Species, slot: string) => {
  const tubes: ExtrudedPolygonSolid[] = [];
  const mergeCos = Math.cos((bark.merge * Math.PI) / 180);
  const endRadius = (i: number) => {
    const main = internodes[i]!.main;
    return main && 'child' in main && internodes[main.child]!.alive ? radius[main.child]! : tip;
  };
  const axisFeet = [...roots];
  const rootSet = new Set(roots);
  while (axisFeet.length > 0) {
    let i = axisFeet.pop()!;
    while (i >= 0 && internodes[i]!.alive && radius[i]! >= bark.cull) {
      const first = internodes[i]!;
      const dir = normalize(sub(first.end, first.start));
      let last = i;
      for (;;) {
        for (const slot of internodes[last]!.laterals) {
          if (slot && 'child' in slot && internodes[slot.child]!.alive) axisFeet.push(slot.child);
        }
        const main = internodes[last]!.main;
        const next = main && 'child' in main ? main.child : -1;
        if (next < 0 || !internodes[next]!.alive || radius[next]! < bark.cull) break;
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

/**
 * The foliage: the ends of shoots younger than `age`, gathered by cells a clump across into one clump each at their
 * mean, facing between up and out of the ellipsoid that bounds them all by `crown`.
 */
const foliageOf = ({ internodes, seasons }: Skeleton, { foliage }: Species, slot: string) => {
  const leafy = internodes.filter((node) => node.alive && seasons - node.born < foliage.age).map((node) => node.end);
  if (leafy.length === 0) return [];
  const cell = foliage.clump * 2;
  const cells = new Map<string, Vec3[]>();
  for (const p of leafy) {
    const at = p.map((v) => Math.floor(v / cell)).join(',');
    cells.set(at, [...(cells.get(at) ?? []), p]);
  }
  const low = [0, 1, 2].map((i) => Math.min(...leafy.map((p) => p[i]!)));
  const high = [0, 1, 2].map((i) => Math.max(...leafy.map((p) => p[i]!)));
  const centre = low.map((l, i) => (l + high[i]!) / 2) as unknown as Vec3;
  const radii = low.map((l, i) => Math.max((high[i]! - l) / 2, foliage.clump)) as unknown as Vec3;
  return [...cells.keys()].sort().map((at, index) => {
    const points = cells.get(at)!;
    const mean = scale(points.reduce(add), 1 / points.length);
    const offset = sub(mean, centre);
    const outward: Vec3 = [offset[0] / radii[0] ** 2, offset[1] / radii[1] ** 2, offset[2] / radii[2] ** 2];
    const out = length(outward) > 1e-9 ? normalize(outward) : UP;
    const facing = normalize(add(scale(UP, 1 - foliage.crown), scale(out, foliage.crown)));
    return clump(`leaf-${index}`, slot, mean, foliage.clump, foliage.clump * foliage.squash, facing);
  });
};

/** The solids a grown skeleton draws as, in two finish slots: `bark` and `leaf`. */
export const grownSolids = (skeleton: Skeleton, species: Species): ExtrudedPolygonSolid[] => [
  ...barkOf(skeleton, species, 'bark'),
  ...foliageOf(skeleton, species, 'leaf'),
];
