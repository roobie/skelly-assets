import type { BoxSolid, ExtrudedPolygonSolid, RevolvedSolid, Vec2 } from '@skelly/construct/shapes/solid.ts';

interface Footprint {
  halfX: number;
  halfZ: number;
  chamfer?: number;
  cx?: number;
  cz?: number;
}

const outline = ({ halfX, halfZ, chamfer = 0.012, cx = 0, cz = 0 }: Footprint): Vec2[] => {
  const c = Math.min(chamfer, halfX, halfZ) * 0.5;
  return (
    [
      [-halfZ + c, -halfX],
      [halfZ - c, -halfX],
      [halfZ, -halfX + c],
      [halfZ, halfX - c],
      [halfZ - c, halfX],
      [-halfZ + c, halfX],
      [-halfZ, halfX - c],
      [-halfZ, -halfX + c],
    ] satisfies Vec2[]
  ).map(([z, x]) => [z! + cz, x! + cx]);
};
export const slab = (
  id: string,
  slot: string,
  [bottom, top]: readonly [number, number],
  footprint: Footprint,
): ExtrudedPolygonSolid => ({
  id,
  kind: 'extruded-polygon',
  axis: 'y',
  profile: outline(footprint),
  z: [bottom, top],
  slot,
});

interface Oval extends Omit<Footprint, 'chamfer'> {
  /** Corners of the superellipse: 2 is an ellipse, higher is squarer. */
  power?: number;
  sides?: number;
}

/**
 * A superellipse of `sides` points, `halfU` along the first profile coordinate and `halfV` along the second, as a
 * convex counterclockwise profile. Body masses are rounded, so a limb or a skull reads as flesh rather than a crate.
 */
const ovalProfile = (halfU: number, halfV: number, { power = 2.6, sides = 16, cu = 0, cv = 0 } = {}): Vec2[] =>
  Array.from({ length: sides }, (_, i): Vec2 => {
    const a = (2 * Math.PI * i) / sides;
    const shape = (t: number) => Math.sign(t) * Math.abs(t) ** (2 / power);
    return [cu + halfU * shape(Math.cos(a)), cv + halfV * shape(Math.sin(a))];
  });

/** An upright rounded slab: `slab` with a superellipse footprint. */
export const oval = (
  id: string,
  slot: string,
  [bottom, top]: readonly [number, number],
  { halfX, halfZ, cx = 0, cz = 0, power, sides }: Oval,
): ExtrudedPolygonSolid => ({
  id,
  kind: 'extruded-polygon',
  axis: 'y',
  profile: ovalProfile(halfZ, halfX, { power, sides, cu: cz, cv: cx }),
  z: [bottom, top],
  slot,
});
type Range = readonly [number, number];
/** A range open at either end. */
type Bounds = readonly [number | undefined, number | undefined];
/** A convex counterclockwise profile cut to the half-plane `coordinate >= limit` (or `<=` with `keep` -1). */
const cutProfile = (profile: readonly Vec2[], coordinate: 0 | 1, limit: number, keep: 1 | -1): Vec2[] => {
  const inside = (p: Vec2) => keep * (p[coordinate] - limit) >= 0;
  const crossing = (p: Vec2, q: Vec2): Vec2 => {
    const t = (limit - p[coordinate]) / (q[coordinate] - p[coordinate]);
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  };
  const cut = profile.flatMap((p, i) => {
    const q = profile[(i + 1) % profile.length]!;
    if (inside(p)) return inside(q) ? [p] : [p, crossing(p, q)];
    return inside(q) ? [crossing(p, q)] : [];
  });
  // A vertex on the cut line is its own crossing, which would repeat it.
  return cut.filter(
    (p, i) => Math.hypot(p[0] - cut[(i + 1) % cut.length]![0], p[1] - cut[(i + 1) % cut.length]![1]) > 1e-9,
  );
};
/**
 * An oval slab cut square to the ranges `x` and `z` it is given, so a hair mass can end at a hairline or a parting
 * while following the skull's curve round the rest of its edge.
 */
export const ovalCut = (
  id: string,
  slot: string,
  range: Range,
  shape: Oval,
  cut: { x?: Bounds; z?: Bounds },
): ExtrudedPolygonSolid => {
  const whole = oval(id, slot, range, shape);
  const limits: [0 | 1, number | undefined, 1 | -1][] = [
    [0, cut.z?.[0], 1],
    [0, cut.z?.[1], -1],
    [1, cut.x?.[0], 1],
    [1, cut.x?.[1], -1],
  ];
  return {
    ...whole,
    profile: limits.reduce<readonly Vec2[]>(
      (profile, [coordinate, limit, keep]) =>
        limit === undefined ? profile : cutProfile(profile, coordinate, limit, keep),
      whole.profile,
    ),
  };
};
type Section = Pick<Oval, 'halfX' | 'halfZ' | 'cz'>;
const section = (from: Required<Section>, to: Required<Section>, t: number): Required<Section> => ({
  halfX: from.halfX + (to.halfX - from.halfX) * t,
  halfZ: from.halfZ + (to.halfZ - from.halfZ) * t,
  cz: from.cz + (to.cz - from.cz) * t,
});
/**
 * A limb or mass tapering from one section at the bottom to another at the top, as `slices` stacked ovals named
 * `<id>-<index>` from the bottom. A `curve` reshapes the taper: `(t) => Math.sqrt(1 - t * t)` rounds it like a dome.
 */
export const taper = (
  id: string,
  slot: string,
  [bottom, top]: Range,
  [from, to]: readonly [Section, Section],
  {
    slices = 3,
    power,
    curve = (t: number) => t,
  }: { slices?: number; power?: number; curve?: (t: number) => number } = {},
): ExtrudedPolygonSolid[] => {
  const start = { cz: 0, ...from };
  const end = { cz: 0, ...to };
  return Array.from({ length: slices }, (_, i) => {
    const y0 = bottom + ((top - bottom) * i) / slices;
    const y1 = bottom + ((top - bottom) * (i + 1)) / slices;
    // Each slice takes the section at its own top, so the stack never pokes out of the taper it approximates.
    const at = section(start, end, curve((i + 1) / slices));
    return oval(`${id}-${i}`, slot, [y0, y1], { ...at, ...(power === undefined ? {} : { power }) });
  });
};
/** A dome: a taper whose sections shrink on a quarter ellipse, full at the bottom and `to` at the top. */
export const dome = (
  id: string,
  slot: string,
  range: Range,
  sections: readonly [Section, Section],
  options: { slices?: number; power?: number } = {},
) => taper(id, slot, range, sections, { ...options, curve: (t) => 1 - Math.sqrt(Math.max(0, 1 - t * t)) });
export const block = (
  id: string,
  slot: string,
  ...[[x0, x1], [y0, y1], [z0, z1]]: [Range, Range, Range]
): BoxSolid => ({
  id,
  kind: 'box',
  box: {
    center: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
    half: [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2],
  },
  slot,
});

/**
 * Solids marked as one region of a doll part, a piece the export keeps as its own primitives, so a worn shell's `covers`
 * can hide that region alone (docs/decisions/0012-hidden-body.md).
 */
export const region = <T extends ExtrudedPolygonSolid | BoxSolid | RevolvedSolid>(piece: string, solids: T[]): T[] =>
  solids.map((solid) => ({ ...solid, display: { ...solid.display, piece } }));
