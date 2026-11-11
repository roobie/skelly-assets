// The walker's clips. The hull, head and pods are keyed as joint angles from the guard stance (plan.ts,
// jointFrames, says what each positive flex does); the legs are solved, not keyed: each clip says where
// the feet are and how far the hull sinks, and the solver finds the hinge angles that put them there. A
// machine that weighs tonnes must plant its feet: keyed legs slide on the ground as the body moves, and
// the eye reads a sliding foot on a heavy walker at once.

import type { Bone } from '../../core/body.ts';
import type { Realized } from '../../core/generate.ts';
import { clamp } from '../../core/math.ts';
import type { EulerDeg } from '../../core/pose.ts';
import { severedBoneSet } from '../dismember.ts';
import {
  type Angles,
  type ClipDef,
  type ClipFrame,
  channelAngles,
  clipLookup,
  groundedFrame,
  type ScalarKeys,
  both,
  scalar,
} from '../keyframes.ts';
import { LEG_BONES, REVERSED_FLEX } from './plan.ts';

/** How the feet move in a walking clip; a clip without one keeps both feet where they stand. */
interface Stride {
  /** The share of the cycle each foot spends on the ground. */
  readonly duty: number;
  /** How high a swinging foot clears the ground, in metres. */
  readonly lift: number;
  /** How far the tarsus tucks back at the top of the swing, in degrees. */
  readonly tuck: number;
  /** How far the toes hang at the top of the swing, in degrees; they come level again before the foot lands. */
  readonly droop: number;
}

interface WalkerClipDef extends ClipDef {
  /** How far the hull sinks below the guard stance, in metres, as keys; the legs fold to carry it. */
  readonly drop?: ScalarKeys;
  readonly stride?: Stride;
}

const rest: EulerDeg = [0, 0, 0];

/** A quick servo move: holds `from` until `at`, then snaps to `to` over `snap` of the clip. */
const servo = (at: number, from: EulerDeg, to: EulerDeg, snap = 0.025) =>
  [
    [at, from],
    [at + snap, to],
  ] as const;

/** A recoil: snaps to `kick` at `at` and eases back to `back` by `settle`. */
const recoil = (at: number, back: EulerDeg, kick: EulerDeg, settle: number) =>
  [
    [at, back],
    [at + 0.02, kick],
    [at + settle, back],
  ] as const;

const SHOTS = [0.42, 0.52, 0.62] as const;
/** The pods dip onto a target at a man's height ahead and turn in from their splay to bear on it together. */
const AIM: EulerDeg = [-7, 0, -10];
/** Each shot kicks the pods up, not off their bearing. */
const KICK: EulerDeg = [3, 0, -10];

const CLIPS = {
  /** On guard: the hull holds still while servos hunt in short, discrete moves; the sensor head snaps from
   * bearing to bearing, a pod corrects its aim, and the legs settle a notch and recover. */
  idle: {
    seconds: 4.8,
    loop: true,
    drop: [
      [0, 0],
      [0.34, 0],
      [0.36, 0.03],
      [0.7, 0.03],
      [0.73, 0],
      [1, 0],
    ],
    channels: {
      head: {
        track: [
          [0, rest],
          ...servo(0.12, rest, [0, 0, 14]),
          ...servo(0.3, [0, 0, 14], [-3, 0, 14], 0.015),
          ...servo(0.45, [-3, 0, 14], [-2, 0, -18]),
          ...servo(0.66, [-2, 0, -18], [2, 0, -6]),
          ...servo(0.86, [2, 0, -6], rest),
          [1, rest],
        ],
      },
      'pod.L': {
        track: [
          [0, rest],
          ...servo(0.2, rest, [5, 0, 0], 0.02),
          ...servo(0.27, [5, 0, 0], [2, 0, 0], 0.02),
          ...servo(0.8, [2, 0, 0], rest),
          [1, rest],
        ],
      },
      'pod.R': {
        track: [
          [0, rest],
          ...servo(0.5, rest, [-4, 0, -5], 0.02),
          ...servo(0.58, [-4, 0, -5], [-1, 0, -2], 0.02),
          ...servo(0.92, [-1, 0, -2], rest),
          [1, rest],
        ],
      },
      hull: {
        track: [
          [0, rest],
          ...servo(0.36, rest, [-1, 0, 0], 0.03),
          ...servo(0.73, [-1, 0, 0], rest, 0.03),
          [1, rest],
        ],
      },
    },
  },
  /** Patrol: each foot rises high, swings and slams down flat. The hull surges forward behind each step and
   * all but stops as the foot lands, sinking on the impact and nodding forward, then rides up as the leg
   * straightens; the head and pods lag the nod. The hull only pitches: a yaw or roll would carry the hips
   * across the leg planes and drag the planted feet. */
  stomp: {
    seconds: 2.2,
    loop: true,
    travel: [
      [0, 0],
      [0.5, 1],
      [1, 2],
    ],
    stride: { duty: 0.6, lift: 0.46, tuck: 28, droop: 22 },
    drop: [
      [0, 0.04],
      [0.06, 0.12],
      [0.3, 0.02],
      [0.5, 0.04],
      [0.56, 0.12],
      [0.8, 0.02],
      [1, 0.04],
    ],
    channels: {
      hull: {
        track: [
          [0, [0, 0, 0]],
          [0.06, [-2.5, 0, 0]],
          [0.3, [0.5, 0, 0]],
          [0.5, [0, 0, 0]],
          [0.56, [-2.5, 0, 0]],
          [0.8, [0.5, 0, 0]],
          [1, [0, 0, 0]],
        ],
      },
      head: {
        track: [
          [0, [0, 0, 0]],
          [0.09, [2.5, 0, 0]],
          [0.3, [-0.5, 0, 0]],
          [0.5, [0, 0, 0]],
          [0.59, [2.5, 0, 0]],
          [0.8, [-0.5, 0, 0]],
          [1, [0, 0, 0]],
        ],
      },
      ...both('pod', [
        [0, [0, 0, 0]],
        [0.1, [-4, 0, 0]],
        [0.35, [1, 0, 0]],
        [0.6, [-4, 0, 0]],
        [0.85, [1, 0, 0]],
        [1, [0, 0, 0]],
      ]),
    },
  },
  /** Fire: the legs brace and the hull sinks, the pods swing level onto the target as the lock-on lens
   * brightens, then three shots kick the pods and rock the hull; the walker holds aim and stands back up. */
  fire: {
    seconds: 2.4,
    loop: false,
    hit: SHOTS[0],
    drop: [
      [0, 0],
      [0.25, 0.22],
      [0.8, 0.22],
      [1, 0],
    ],
    charge: [
      [0, 1],
      [0.2, 1.6],
      [0.4, 3],
      ...SHOTS.flatMap(
        (at) =>
          [
            [at, 3],
            [at + 0.01, 8],
            [at + 0.06, 3],
          ] as const,
      ),
      [0.8, 2],
      [1, 1],
    ],
    channels: {
      hull: {
        track: [
          [0, rest],
          [0.25, [-4, 0, 0]],
          ...SHOTS.flatMap((at) => recoil(at, [-4, 0, 0], [-1.5, 0, 0], 0.07)),
          [0.8, [-4, 0, 0]],
          [1, rest],
        ],
      },
      head: {
        track: [
          [0, rest],
          ...servo(0.08, rest, [-3, 0, 0], 0.04),
          [0.8, [-3, 0, 0]],
          [1, rest],
        ],
      },
      ...both('pod', [
        [0, rest],
        [0.3, AIM],
        ...SHOTS.flatMap((at) => recoil(at, AIM, KICK, 0.07)),
        [0.8, AIM],
        [1, rest],
      ]),
    },
  },
} as const satisfies Record<string, WalkerClipDef>;

export type WalkerClip = keyof typeof CLIPS;
export const WALKER_CLIPS = Object.keys(CLIPS) as readonly WalkerClip[];

/** Looks a clip up by name, refusing an unknown one rather than falling back to another. */
export const walkerClip = clipLookup<WalkerClip, WalkerClipDef>('walker', CLIPS);

// The leg solver. Every leg hinge turns about the body's right axis, so a leg lives in its side's sagittal
// plane: points there are (y, z), and an angle is a direction's heading from straight up toward the back,
// the sense in which a positive turn about the right axis carries it (core/math.ts, rotX).
type Planar = readonly [number, number];
const DEG = 180 / Math.PI;
const heading = ([y, z]: Planar): number => Math.atan2(z, y) * DEG;
const toward = (deg: number, length: number): Planar => [Math.cos(deg / DEG) * length, Math.sin(deg / DEG) * length];
const plus = (a: Planar, b: Planar): Planar => [a[0] + b[0], a[1] + b[1]];
const minus = (a: Planar, b: Planar): Planar => [a[0] - b[0], a[1] - b[1]];
const span = (a: Planar, b: Planar): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
const planar = (bone: Bone): Planar => [bone.head[1], bone.head[2]];

/** A turn about the hull root's hinge. */
const turned = (point: Planar, pivot: Planar, deg: number): Planar => {
  const [y, z] = minus(point, pivot);
  const c = Math.cos(deg / DEG);
  const s = Math.sin(deg / DEG);
  return plus(pivot, [y * c - z * s, y * s + z * c]);
};

interface Leg {
  readonly ids: readonly [string, string, string, string];
  readonly hip: Planar;
  readonly ball: Planar;
  /** Thigh, shin and tarsus lengths. */
  readonly lengths: readonly [number, number, number];
  /** Rest headings of the thigh, shin, tarsus and foot. */
  readonly headings: readonly [number, number, number, number];
}

const legOf = (bones: readonly Bone[], side: string): Leg => {
  const ids = LEG_BONES.map((name) => `${name}.${side}`) as unknown as Leg['ids'];
  const [thigh, shin, tarsus, foot] = ids.map((id) => {
    const bone = bones.find((candidate) => candidate.id === id);
    if (!bone) {
      throw new Error(`walker leg bone "${id}" is missing`);
    }
    return bone;
  }) as [Bone, Bone, Bone, Bone];
  const [hip, knee, hock, ball] = [thigh, shin, tarsus, foot].map(planar) as [Planar, Planar, Planar, Planar];
  const toe: Planar = [foot.tail[1], foot.tail[2]];
  return {
    ids,
    hip,
    ball,
    lengths: [span(hip, knee), span(knee, hock), span(hock, ball)],
    headings: [heading(minus(knee, hip)), heading(minus(hock, knee)), heading(minus(ball, hock)), heading(minus(toe, ball))],
  };
};

/** Where a foot is and how it is held, relative to its guard-stance place. */
interface FootTarget {
  readonly ball: Planar;
  /** Turns of the tarsus and the foot from their rest headings, in degrees. */
  readonly tuck: number;
  readonly tilt: number;
}

/** The hinge angles that put a leg's ball at `target` with the hull turned `hullPitch` about `pivot`: the
 * tarsus is held at its rest heading plus the tuck, which places the hock, and the thigh and shin meet at
 * the knee with the knee forward, as built. Out of reach, the leg straightens toward the target. */
const solveLeg = (leg: Leg, pivot: Planar, hullPitch: number, target: FootTarget): Angles => {
  const [thighLength, shinLength, tarsusLength] = leg.lengths;
  const [thighRest, shinRest, tarsusRest, footRest] = leg.headings;
  const hip = turned(leg.hip, pivot, hullPitch);
  const tarsus = tarsusRest + target.tuck;
  const hock = minus(target.ball, toward(tarsus, tarsusLength));
  const reach = minus(hock, hip);
  const distance = clamp(Math.hypot(...reach), Math.abs(thighLength - shinLength) + 1e-6, thighLength + shinLength - 1e-6);
  const along = (thighLength ** 2 - shinLength ** 2 + distance ** 2) / (2 * distance);
  const rise = Math.sqrt(Math.max(0, thighLength ** 2 - along ** 2));
  const axis = heading(reach);
  const forward = Math.sin((axis - 90) / DEG) < 0 ? axis - 90 : axis + 90;
  const knee = plus(plus(hip, toward(axis, along)), toward(forward, rise));
  const thigh = heading(minus(knee, hip));
  const shin = heading(minus(hock, knee));
  const foot = footRest + target.tilt;
  /** A child's flex from the turn it adds to its parent's, in its own hinge sense. */
  const flex = (name: string, turn: number): EulerDeg => [(REVERSED_FLEX.has(name) ? -1 : 1) * wrap(turn), 0, 0];
  const [thighId, shinId, tarsusId, footId] = leg.ids;
  return {
    [thighId]: flex('thigh', thigh - thighRest - hullPitch),
    [shinId]: flex('shin', shin - shinRest - (thigh - thighRest)),
    [tarsusId]: flex('tarsus', tarsus - tarsusRest - (shin - shinRest)),
    [footId]: flex('foot', foot - footRest - (tarsus - tarsusRest)),
  };
};

const wrap = (deg: number): number => ((((deg + 180) % 360) + 360) % 360) - 180;

const ease = (t: number): number => t * t * (3 - 2 * t);

/** The clip's travel at any time, counting on through later cycles, so a step that spans the clip's end
 * still measures what the body covered. */
const travelled = (travel: ScalarKeys, u: number): number => {
  const cycles = Math.floor(u);
  return cycles * travel.at(-1)![1] + scalar(travel, u - cycles);
};

/** Where a foot is at clip time `u`, its leg at phase `q` of the stride. Planted, the foot moves back under
 * the hull by exactly what the body travels, so on the ground it stands still however the body surges; in
 * the swing it rises fast, carries forward and drops hard at the end, the stomp. */
const strideTarget = (leg: Leg, stride: Stride, travel: ScalarKeys, u: number, q: number, sink: number): FootTarget => {
  const landed = u - q;
  const reach = travelled(travel, landed + stride.duty) - travelled(travel, landed);
  const [y, z] = leg.ball;
  if (q < stride.duty) {
    return { ball: [y + sink, z - reach / 2 + travelled(travel, u) - travelled(travel, landed)], tuck: 0, tilt: 0 };
  }
  const s = (q - stride.duty) / (1 - stride.duty);
  const arc = Math.sin(Math.PI * s ** 0.7);
  return {
    ball: [y + sink + stride.lift * arc, z + reach / 2 - reach * ease(s)],
    tuck: stride.tuck * Math.sin(Math.PI * s),
    tilt: -stride.droop * Math.sin(Math.PI * s) ** 2,
  };
};

/** The phase offset of each leg's stride: the right foot steps half a cycle after the left. */
const LEG_SHIFT: Readonly<Record<string, number>> = { L: 0, R: 0.5 };

/** Joint angles of a clip at normalized time `u` (0..1) on this body, keyed by bone id: its keyed
 * channels, with every leg solved to stand where the clip puts its foot. */
export const walkerAngles = (bones: readonly Bone[], name: string, u: number): Angles => {
  const clip = walkerClip(name);
  const angles = channelAngles(clip, u);
  const hull = bones.find((bone) => bone.id === 'hull');
  if (!hull) {
    throw new Error('walker hull bone is missing');
  }
  const hullPitch = angles.hull?.[0] ?? 0;
  const sink = clip.drop ? scalar(clip.drop, u) : 0;
  for (const side of Object.keys(LEG_SHIFT)) {
    const leg = legOf(bones, side);
    const q = (((u + LEG_SHIFT[side]!) % 1) + 1) % 1;
    const target: FootTarget =
      clip.stride && clip.travel
        ? strideTarget(leg, clip.stride, clip.travel, u, q, sink)
      : { ball: [leg.ball[0] + sink, leg.ball[1]], tuck: 0, tilt: 0 };
    Object.assign(angles, solveLeg(leg, planar(hull), hullPitch, target));
  }
  return angles;
};

export interface FrameOptions {
  /** Cut points already severed (mob/dismember.ts, severedBoneSet). */
  readonly cuts?: readonly string[];
}

/** The pose of a clip at normalized time `u`, standing on the ground (keyframes.ts, groundedFrame). */
export const walkerFrame = (
  realized: Pick<Realized, 'body' | 'voxels'>,
  name: string,
  u: number,
  { cuts = [] }: FrameOptions = {},
): ClipFrame => {
  const clip = walkerClip(name);
  const { bones } = realized.body;
  const hidden = severedBoneSet(bones, cuts);
  const visible = bones.filter((bone) => !hidden.has(bone.id)).map((bone) => bone.id);
  return groundedFrame(realized, clip, (at) => walkerAngles(bones, name, at), u, visible);
};
