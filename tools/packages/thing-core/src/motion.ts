// How a part moves on its carrier, derived from the pins it is drawn with so the axis the game plays is the axis a
// check proves; see docs/decisions/0015-motion-as-content.md.
import { cross, dot, length, normalize, scale, sub, type Vec3 } from '@skelly/construct/foundation/math.ts';
import type { HingeAxis, Motion, MotionStage } from './schema.ts';

/**
 * Which way a part opens or slides, fixed in the model frame wherever the part is drawn or placed: near is the side
 * fore × up points to, and far its reflection.
 */
export const TOWARD = {
  up: [0, 1, 0],
  down: [0, -1, 0],
  fore: [0, 0, 1],
  rear: [0, 0, -1],
  near: [-1, 0, 0],
  far: [1, 0, 0],
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

/** The bounds the pieces fill together. */
export const piecesBounds = (pieces: readonly AnalyticPiece[]): Bounds => {
  const all = pieces.map(pieceBounds);
  return boundsOf(
    [0, 1, 2].map((axis) => Math.min(...all.map(({ min }) => min[axis]!))),
    [0, 1, 2].map((axis) => Math.max(...all.map(({ max }) => max[axis]!))),
  );
};

export const centreOf = ({ min, max }: Bounds): Vec3 => scale([min[0] + max[0], min[1] + max[1], min[2] + max[2]], 0.5);

/** The eight corners of `bounds`. */
export const cornersOf = ({ min, max }: Bounds): Vec3[] =>
  [0, 1, 2, 3, 4, 5, 6, 7].map((corner) => [0, 1, 2].map((axis) => ((corner >> axis) & 1 ? max : min)[axis]!) as unknown as Vec3);

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

const reflect = ([x, y, z]: readonly [number, number, number]): [number, number, number] => [-x, y, z];

/** The motion of a far-side twin, which consumers place reflected across the model's x = 0 plane. */
export const mirrorMotion = (motion: Motion): Motion =>
  motion.map((stage) =>
    stage.kind === 'hinge'
      ? { ...stage, axis: { from: reflect(stage.axis.from), to: reflect(stage.axis.to) }, angle: -stage.angle }
      : { ...stage, direction: reflect(stage.direction) },
  ) as unknown as Motion;

/** A stage as authored, before the build gives it its share of the clock. */
export type StageMove = { [Kind in MotionStage['kind']]: Omit<Extract<MotionStage, { kind: Kind }>, 'share'> }[MotionStage['kind']];

/** How far a stage carries the part's furthest point: a slide its travel, a hinge the arc that `hull`'s point furthest from its axis sweeps. */
const stageDistance = (stage: StageMove, hull: readonly Vec3[]): number => {
  if (stage.kind === 'slide') {
    return stage.travel;
  }
  const u = normalize(sub(stage.axis.to, stage.axis.from));
  const radius = Math.max(...hull.map((point) => length(cross(u, sub(point, stage.axis.from)))));
  return (Math.abs(stage.angle) * Math.PI * radius) / 180;
};

/**
 * The motion that runs `stages` in order, each through the share of the clock its distance is of theirs together, so
 * the part keeps one pace from rest to stop. `hull` is the corners of the part's rest bounds in the model frame.
 */
export const shareStages = (stages: readonly StageMove[], hull: readonly Vec3[]): Motion => {
  const distances = stages.map((stage) => stageDistance(stage, hull));
  const total = distances.reduce((sum, distance) => sum + distance, 0);
  return stages.map((stage, i) => ({ ...stage, share: distances[i]! / total })) as unknown as Motion;
};

/** Where one stage carries a point once it has moved `fraction` of the way from rest to its stop. */
const poseStage = (stage: MotionStage, point: Vec3, fraction: number): Vec3 => {
  if (stage.kind === 'slide') {
    const step = stage.travel * fraction;
    return [point[0] + stage.direction[0] * step, point[1] + stage.direction[1] * step, point[2] + stage.direction[2] * step];
  }
  const u = normalize(sub(stage.axis.to, stage.axis.from));
  const r = sub(point, stage.axis.from);
  const turn = (stage.angle * fraction * Math.PI) / 180;
  const [c, s] = [Math.cos(turn), Math.sin(turn)];
  // Rodrigues' rotation of the offset from the axis.
  const across = cross(u, r);
  const kept = dot(u, r) * (1 - c);
  return [0, 1, 2].map((i) => stage.axis.from[i]! + r[i]! * c + across[i]! * s + u[i]! * kept) as unknown as Vec3;
};

/**
 * Where a point of the part lies at `clock`, from 0 at rest to 1 at the stop. Each stage runs linearly through its
 * share of the clock once the stages before it have finished. Every stage is given in the part's rest frame and the
 * first carries the rest, so the last stage moves the point first and the first stage moves it last.
 */
export const posePoint = (motion: Motion, point: Vec3, clock = 1): Vec3 => {
  const starts = motion.map((_, i) => motion.slice(0, i).reduce((sum, { share }) => sum + share, 0));
  const fraction = (i: number) => Math.min(1, Math.max(0, (clock - starts[i]!) / motion[i]!.share));
  return motion.reduceRight((at, stage, i) => poseStage(stage, at, fraction(i)), point);
};
