// How a part moves on its carrier, derived from the pins it is drawn with so the axis the game plays is the axis a
// check proves; see docs/decisions/0015-motion-as-content.md.
import { cross, dot, length, normalize, scale, sub, type Vec3 } from '@skelly/construct/foundation/math.ts';
import type { HingeAxis, Motion } from './schema.ts';

/**
 * Which way a part opens or slides, in the model frame. Out is the near side, fore × up, where a part a pair of sites
 * shares is drawn; its far twin is the reflection.
 */
export const TOWARD = {
  up: [0, 1, 0],
  down: [0, -1, 0],
  fore: [0, 0, 1],
  rear: [0, 0, -1],
  out: [-1, 0, 0],
  in: [1, 0, 0],
} as const satisfies Readonly<Record<string, Vec3>>;
export type Toward = keyof typeof TOWARD;
export const TOWARDS = Object.keys(TOWARD) as readonly Toward[];

type Axis = 'x' | 'y' | 'z';
type Profile = readonly (readonly [number, number])[];
/** The analytic shape of an authored piece: a compound part's box, prism or turned parameters, not their voxels. */
export type AnalyticPiece =
  | { readonly id: string; readonly kind: 'box'; readonly min: Vec3; readonly max: Vec3 }
  | {
      readonly id: string;
      readonly kind: 'prism';
      readonly axis: Axis;
      readonly profile: Profile;
      readonly start: number;
      readonly end: number;
    }
  | { readonly id: string; readonly kind: 'turned'; readonly axis: Axis; readonly origin?: Vec3 | undefined; readonly profile: Profile };

// The axis a prism or turned piece runs along, then the two axes its profile's coordinates lie on.
type Index = 0 | 1 | 2;
const ALONG: Readonly<Record<Axis, readonly [Index, Index, Index]>> = { x: [0, 1, 2], y: [1, 2, 0], z: [2, 0, 1] };
const UNIT: Readonly<Record<Axis, Vec3>> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

interface Bounds {
  readonly min: Vec3;
  readonly max: Vec3;
}
const spread = (values: readonly number[]) => [Math.min(...values), Math.max(...values)] as const;
const boundsOf = (lows: readonly number[], highs: readonly number[]): Bounds => ({
  min: [lows[0]!, lows[1]!, lows[2]!],
  max: [highs[0]!, highs[1]!, highs[2]!],
});

/** The box a piece's analytic shape fills; a prism's cut planes only trim inside it. */
export const pieceBounds = (piece: AnalyticPiece): Bounds => {
  if (piece.kind === 'box') {
    return { min: piece.min, max: piece.max };
  }
  const [along, u, v] = ALONG[piece.axis];
  const lows: number[] = [];
  const highs: number[] = [];
  if (piece.kind === 'prism') {
    [lows[along], highs[along]] = [piece.start, piece.end];
    [lows[u], highs[u]] = spread(piece.profile.map(([a]) => a));
    [lows[v], highs[v]] = spread(piece.profile.map(([, b]) => b));
    return boundsOf(lows, highs);
  }
  const origin = piece.origin ?? [0, 0, 0];
  const radius = Math.max(...piece.profile.map(([, r]) => r));
  const [low, high] = spread(piece.profile.map(([a]) => a));
  [lows[along], highs[along]] = [origin[along] + low, origin[along] + high];
  for (const i of [u, v]) {
    [lows[i], highs[i]] = [origin[i] - radius, origin[i] + radius];
  }
  return boundsOf(lows, highs);
};

/** The centre of the bounds the pieces fill together, the point a hinge's sense is judged by. */
export const piecesCentre = (pieces: readonly AnalyticPiece[]): Vec3 => {
  const all = pieces.map(pieceBounds);
  const mid = (axis: number) =>
    (Math.min(...all.map(({ min }) => min[axis]!)) + Math.max(...all.map(({ max }) => max[axis]!))) / 2;
  return [mid(0), mid(1), mid(2)];
};

const centreOf = ({ min, max }: Bounds): Vec3 => scale([min[0] + max[0], min[1] + max[1], min[2] + max[2]], 0.5);

/** One pin's own line: a turned or prism piece runs along its declared axis, a box along its unique longest side. */
const ownDirection = (pin: AnalyticPiece, bounds: Bounds, grain: number): Vec3 => {
  if (pin.kind !== 'box') {
    return UNIT[pin.axis];
  }
  const sides = sub(bounds.max, bounds.min);
  const [longest, next] = (['x', 'y', 'z'] as const).toSorted((a, b) => dot(sides, UNIT[b]) - dot(sides, UNIT[a]));
  if (dot(sides, UNIT[longest!]) - dot(sides, UNIT[next!]) < grain) {
    throw new Error(`pin ${pin.id} is near-cubic, so no side of it is its axis`);
  }
  return UNIT[longest!];
};

/**
 * The hinge line a part's pins are drawn on, in their own frame and units, with `grain` the voxel grain in those units.
 * One pin runs along its own axis; two or more lie on the line through the first and last centres, each within a grain
 * of it, no two closer than a grain.
 */
export const pinAxis = (pins: readonly AnalyticPiece[], grain: number): HingeAxis => {
  if (pins.length === 0) {
    throw new Error('a hinge needs a pin');
  }
  if (pins.length === 1) {
    const bounds = pieceBounds(pins[0]!);
    const direction = ownDirection(pins[0]!, bounds, grain);
    const centre = centreOf(bounds);
    const half = dot(sub(bounds.max, bounds.min), direction) / 2;
    return { from: sub(centre, scale(direction, half)), to: sub(centre, scale(direction, -half)) };
  }
  const centres = pins.map((pin) => centreOf(pieceBounds(pin)));
  centres.forEach((a, i) =>
    centres.slice(i + 1).forEach((b, j) => {
      if (length(sub(b, a)) < grain) {
        throw new Error(`pins ${pins[i]!.id} and ${pins[i + 1 + j]!.id} lie closer than a grain`);
      }
    }),
  );
  const from = centres[0]!;
  const to = centres.at(-1)!;
  const direction = normalize(sub(to, from));
  centres.forEach((centre, i) => {
    if (length(cross(direction, sub(centre, from))) > grain) {
      throw new Error(`pin ${pins[i]!.id} lies off the line through the end pins`);
    }
  });
  return { from, to };
};

/**
 * How squarely a hinge's opening must carry the part's centre toward its `toward` hint, as the cosine between them:
 * within 60 degrees, so a hint across the swing never picks a sense by rounding.
 */
export const SENSE_FLOOR = 0.5;

/**
 * The sign of a hinge's angle: the sense whose first motion carries `centre` toward `toward`. All in the model frame,
 * `grain` in metres.
 */
export const hingeSense = (axis: HingeAxis, centre: Vec3, toward: Toward, grain: number): 1 | -1 => {
  const swing = cross(normalize(sub(axis.to, axis.from)), sub(centre, axis.from));
  if (length(swing) <= grain) {
    throw new Error(`the part's centre lies on its hinge line, so no sense carries it ${toward}`);
  }
  const along = dot(normalize(swing), TOWARD[toward]);
  if (Math.abs(along) < SENSE_FLOOR) {
    throw new Error(`neither sense of the hinge carries the part's centre clearly ${toward}`);
  }
  return along > 0 ? 1 : -1;
};

/**
 * Throws unless a part that opens in or out lies on the near side, where a part a pair of sites shares is drawn, so
 * its far twin's reflection opens the matching way. `centre` in the model frame, `grain` in metres.
 */
export const requireNearSide = (centre: Vec3, toward: Toward, grain: number) => {
  if ((toward === 'in' || toward === 'out') && dot(centre, TOWARD.out) <= grain) {
    throw new Error(`a part that moves ${toward} must be drawn on the near side`);
  }
};

const reflect = ([x, y, z]: readonly [number, number, number]): [number, number, number] => [-x, y, z];

/** The motion of a far-side twin, which consumers place reflected across the model's x = 0 plane. */
export const mirrorMotion = (motion: Motion): Motion =>
  motion.kind === 'hinge'
    ? { kind: 'hinge', axis: { from: reflect(motion.axis.from), to: reflect(motion.axis.to) }, angle: -motion.angle }
    : { ...motion, direction: reflect(motion.direction) };

/** Where a point of the part lies once it has moved `fraction` of the way from rest to its stop. */
export const posePoint = (motion: Motion, point: Vec3, fraction = 1): Vec3 => {
  if (motion.kind === 'slide') {
    const step = motion.travel * fraction;
    return [point[0] + motion.direction[0] * step, point[1] + motion.direction[1] * step, point[2] + motion.direction[2] * step];
  }
  const u = normalize(sub(motion.axis.to, motion.axis.from));
  const r = sub(point, motion.axis.from);
  const turn = (motion.angle * fraction * Math.PI) / 180;
  const [c, s] = [Math.cos(turn), Math.sin(turn)];
  // Rodrigues' rotation of the offset from the axis.
  const across = cross(u, r);
  const kept = dot(u, r) * (1 - c);
  return [0, 1, 2].map((i) => motion.axis.from[i]! + r[i]! * c + across[i]! * s + u[i]! * kept) as unknown as Vec3;
};
