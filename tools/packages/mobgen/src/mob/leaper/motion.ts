// The leaper's clips, authored on its own rig as joint angles from the coiled rest pose (plan.ts,
// jointFrames, says what each joint's positive flex does). A clip is sampled at a normalized time and
// grounded on whatever supports the body has left, so the same clip works on a whole or a cut body.
// Big stance changes pivot at the pelvis root and the hips; the waist and chest only breathe, flex and
// counter, because a wide bend there opens the trunk (see seams.ts).

import type { Bone } from '../../core/body.ts';
import type { Realized } from '../../core/generate.ts';
import type { EulerDeg } from '../../core/pose.ts';
import { severedBoneSet } from '../dismember.ts';
import {
  type Angles,
  both,
  type ClipDef,
  type ClipFrame,
  channelAngles,
  clipLookup,
  groundedFrame,
  type Track,
} from '../keyframes.ts';
import { LEAPER_TEMPLATE } from './plan.ts';

const rest: EulerDeg = [0, 0, 0];

// Stance landmarks, shared so the clips that pass through them agree.
/** Reared to full height on reverse knees: the trunk tips up at the pelvis root, the thighs swing down
 * and back so the knees point behind, and the long feet stay flat on the ground. */
const REARED = {
  pelvis: [45, 0, 0],
  spine: [-6, 0, 0],
  chest: [-6, 0, 0],
  head: [-9, 0, 0],
  thigh: [105, 0, 0],
  shin: [122, 0, 0],
  foot: [19, 0, 0],
} as const satisfies Record<string, EulerDeg>;

/** One limb's step: stance sweeps from `reach` back to `-reach`; the swing returns with the limb folded. */
const step = (stance: number, reach: number, fold: EulerDeg): Track => [
  [0, [reach, 0, 0]],
  [stance, [-reach, 0, 0]],
  [(stance + 1) / 2, [fold[0], fold[1], fold[2]]],
  [1, [reach, 0, 0]],
];
const lift = (stance: number, folded: EulerDeg): Track => [
  [0, rest],
  [stance, rest],
  [(stance + 1) / 2, folded],
  [1, rest],
];

const CLIPS = {
  /** Coiled, waiting: the hump breathes, the head scans slowly, a claw twitches now and then. */
  idle: {
    seconds: 3.2,
    loop: true,
    channels: {
      spine: {
        track: [
          [0, [0, 0, 0]],
          [0.5, [1.5, 0, 0]],
          [1, [0, 0, 0]],
        ],
      },
      chest: {
        track: [
          [0, [0, 0, 0]],
          [0.5, [2, 0, 0]],
          [1, [0, 0, 0]],
        ],
      },
      pelvis: {
        track: [
          [0, [0, 0, 0]],
          [0.5, [0, 2, 0]],
          [1, [0, 0, 0]],
        ],
      },
      head: {
        track: [
          [0, [0, 0, 0]],
          [0.3, [4, 0, 10]],
          [0.65, [-3, 0, -8]],
          [1, [0, 0, 0]],
        ],
      },
      jaw: {
        track: [
          [0, rest],
          [0.6, rest],
          [0.7, [6, 0, 0]],
          [0.8, rest],
          [1, rest],
        ],
      },
      'hand.L': {
        track: [
          [0, rest],
          [0.4, rest],
          [0.45, [25, 0, 0]],
          [0.52, rest],
          [1, rest],
        ],
      },
      'hand.R': {
        track: [
          [0, rest],
          [0.75, rest],
          [0.8, [25, 0, 0]],
          [0.87, rest],
          [1, rest],
        ],
      },
    },
  },
  /** Slow approach: a low lateral-sequence walk, belly near the ground, knee peaks bobbing over the back. */
  stalk: {
    seconds: 1.2,
    loop: true,
    travel: [
      [0, 0],
      [1, 0.7],
    ],
    channels: {
      ...both('thigh', step(0.7, 12, [16, 0, 0]), [0, 0.5]),
      ...both('shin', lift(0.7, [-10, 0, 0]), [0, 0.5]),
      ...both('foot', lift(0.7, [-18, 0, 0]), [0, 0.5]),
      ...both('upperArm', step(0.7, 12, [14, 0, 0]), [0.25, 0.75]),
      ...both('forearm', lift(0.7, [-25, 0, 0]), [0.25, 0.75]),
      ...both('hand', lift(0.7, [25, 0, 0]), [0.25, 0.75]),
      pelvis: {
        track: [
          [0, [0, 3, 0]],
          [0.5, [0, -3, 0]],
          [1, [0, 3, 0]],
        ],
      },
      spine: {
        track: [
          [0, [0, 0, 3]],
          [0.5, [0, 0, -3]],
          [1, [0, 0, 3]],
        ],
      },
      head: {
        track: [
          [0, [0, 0, -3]],
          [0.5, [0, 0, 3]],
          [1, [0, 0, -3]],
        ],
      },
    },
  },
  /** At speed: the hind springs push together with the front raised, then the forelimbs catch and pull
   * through with the rump carried high, the back extending and gathering between them. */
  bound: {
    seconds: 0.55,
    loop: true,
    travel: [
      [0, 0],
      [1, 1.9],
    ],
    channels: {
      ...both('thigh', step(0.45, 28, [14, 0, 0])),
      ...both('shin', lift(0.45, [-24, 0, 0])),
      ...both('foot', [
        [0, [0, 0, 0]],
        [0.35, [24, 0, 0]],
        [0.45, [10, 0, 0]],
        [0.7, [-15, 0, 0]],
        [1, [0, 0, 0]],
      ]),
      ...both('upperArm', step(0.45, 24, [20, 0, 0]), [0.5, 0.5]),
      ...both('forearm', lift(0.45, [-30, 0, 0]), [0.5, 0.5]),
      ...both('hand', lift(0.45, [30, 0, 0]), [0.5, 0.5]),
      pelvis: {
        track: [
          [0, [6, 0, 0]],
          [0.5, [-6, 0, 0]],
          [1, [6, 0, 0]],
        ],
      },
      spine: {
        track: [
          [0, [7, 0, 0]],
          [0.5, [-7, 0, 0]],
          [1, [7, 0, 0]],
        ],
      },
      chest: {
        track: [
          [0, [5, 0, 0]],
          [0.5, [-5, 0, 0]],
          [1, [5, 0, 0]],
        ],
      },
      head: {
        track: [
          [0, [-7, 0, 0]],
          [0.5, [7, 0, 0]],
          [1, [-7, 0, 0]],
        ],
      },
    },
  },
  /** Coil, launch, airborne, landing. The eyes brighten through the coil as the telegraph. */
  pounce: {
    seconds: 1.9,
    loop: false,
    air: { from: 0.42, to: 0.78, apex: 0.9 },
    hit: 0.78,
    travel: [
      [0, 0],
      [0.32, 0],
      [0.42, 0.3],
      [0.78, 3.6],
      [0.9, 3.9],
      [1, 3.9],
    ],
    charge: [
      [0, 1],
      [0.32, 3.5],
      [0.45, 2],
      [0.78, 1.4],
      [1, 1],
    ],
    channels: {
      pelvis: {
        track: [
          [0, rest],
          [0.32, [-10, 0, 0]],
          [0.42, [-20, 0, 0]],
          [0.55, [-30, 0, 0]],
          [0.78, [-22, 0, 0]],
          [0.88, [-12, 0, 0]],
          [1, rest],
        ],
      },
      spine: {
        track: [
          [0, rest],
          [0.32, [-8, 0, 0]],
          [0.42, [6, 0, 0]],
          [0.55, [8, 0, 0]],
          [0.78, [-4, 0, 0]],
          [0.88, [-8, 0, 0]],
          [1, rest],
        ],
      },
      chest: {
        track: [
          [0, rest],
          [0.32, [-6, 0, 0]],
          [0.42, [4, 0, 0]],
          [0.55, [6, 0, 0]],
          [0.78, [0, 0, 0]],
          [0.88, [-6, 0, 0]],
          [1, rest],
        ],
      },
      head: {
        track: [
          [0, rest],
          [0.32, [8, 0, 0]],
          [0.42, [8, 0, 0]],
          [0.55, [8, 0, 0]],
          [0.78, [6, 0, 0]],
          [0.88, [6, 0, 0]],
          [1, rest],
        ],
      },
      jaw: {
        track: [
          [0, rest],
          [0.32, rest],
          [0.5, [30, 0, 0]],
          [0.78, [35, 0, 0]],
          [0.9, [5, 0, 0]],
          [1, rest],
        ],
      },
      ...both('thigh', [
        [0, rest],
        [0.32, [-15, 0, 0]],
        [0.42, [150, 0, 0]],
        [0.55, [120, 0, 0]],
        [0.7, [60, 0, 0]],
        [0.78, [30, 0, 0]],
        [0.88, [-5, 0, 0]],
        [1, rest],
      ]),
      ...both('shin', [
        [0, rest],
        [0.32, [-10, 0, 0]],
        [0.42, [148, 0, 0]],
        [0.55, [140, 0, 0]],
        [0.7, [80, 0, 0]],
        [0.78, [40, 0, 0]],
        [0.88, [-10, 0, 0]],
        [1, rest],
      ]),
      ...both('foot', [
        [0, rest],
        [0.32, [-10, 0, 0]],
        [0.42, [70, 0, 0]],
        [0.55, [60, 0, 0]],
        [0.7, [30, 0, 0]],
        [0.78, [10, 0, 0]],
        [0.88, [-5, 0, 0]],
        [1, rest],
      ]),
      ...both('upperArm', [
        [0, rest],
        [0.32, [-8, 0, 0]],
        [0.42, [40, 0, 0]],
        [0.55, [105, 0, -10]],
        [0.7, [90, 0, -10]],
        [0.78, [55, 0, 0]],
        [0.88, [10, 0, 0]],
        [1, rest],
      ]),
      ...both('forearm', [
        [0, rest],
        [0.32, [-10, 0, 0]],
        [0.42, [10, 0, 0]],
        [0.55, [27, 0, 0]],
        [0.78, [20, 0, 0]],
        [0.88, [-15, 0, 0]],
        [1, rest],
      ]),
      ...both('hand', [
        [0, rest],
        [0.32, [10, 0, 0]],
        [0.55, [-10, 0, 0]],
        [0.7, [-15, 0, 0]],
        [0.78, [10, 0, 0]],
        [1, rest],
      ]),
    },
  },
  /** Melee: rears to its full reach, claws hooked forward at head height, then rakes down through the
   * target and folds back into the coil. */
  rake: {
    seconds: 1.4,
    loop: false,
    hit: 0.62,
    travel: [
      [0, 0],
      [0.3, 0.1],
      [0.6, 0.35],
      [1, 0.35],
    ],
    channels: {
      pelvis: {
        track: [
          [0, rest],
          [0.3, REARED.pelvis],
          [0.45, REARED.pelvis],
          [0.62, [25, 0, 0]],
          [0.8, [18, 0, 0]],
          [1, rest],
        ],
      },
      spine: {
        track: [
          [0, rest],
          [0.3, REARED.spine],
          [0.45, [-4, 0, 0]],
          [0.62, [-8, 0, 0]],
          [0.8, [-6, 0, 0]],
          [1, rest],
        ],
      },
      chest: {
        track: [
          [0, rest],
          [0.3, REARED.chest],
          [0.45, [-4, 0, 0]],
          [0.62, [-8, 0, 0]],
          [0.8, [-6, 0, 0]],
          [1, rest],
        ],
      },
      head: {
        track: [
          [0, rest],
          [0.3, REARED.head],
          [0.45, [-9, 0, 0]],
          [0.62, [-5, 0, 0]],
          [0.8, [0, 0, 0]],
          [1, rest],
        ],
      },
      jaw: {
        track: [
          [0, rest],
          [0.3, [10, 0, 0]],
          [0.5, [30, 0, 0]],
          [0.62, [35, 0, 0]],
          [0.8, [10, 0, 0]],
          [1, rest],
        ],
      },
      ...both('thigh', [
        [0, rest],
        [0.3, REARED.thigh],
        [0.45, REARED.thigh],
        [0.62, [80, 0, 0]],
        [0.8, [55, 0, 0]],
        [1, rest],
      ]),
      ...both('shin', [
        [0, rest],
        [0.3, REARED.shin],
        [0.45, REARED.shin],
        [0.62, [95, 0, 0]],
        [0.8, [65, 0, 0]],
        [1, rest],
      ]),
      ...both('foot', [
        [0, rest],
        [0.3, REARED.foot],
        [0.45, REARED.foot],
        [0.62, [15, 0, 0]],
        [0.8, [10, 0, 0]],
        [1, rest],
      ]),
      ...both('upperArm', [
        [0, rest],
        [0.3, [30, 0, -10]],
        [0.45, [45, 0, -15]],
        [0.62, [-5, 0, 0]],
        [0.8, [-5, 0, 0]],
        [1, rest],
      ]),
      ...both('forearm', [
        [0, rest],
        [0.3, [10, 0, 0]],
        [0.45, [25, 0, 0]],
        [0.62, [10, 0, 0]],
        [0.8, [0, 0, 0]],
        [1, rest],
      ]),
      ...both('hand', [
        [0, rest],
        [0.3, [20, 0, 0]],
        [0.45, [55, 0, 0]],
        [0.62, [30, 0, 0]],
        [0.8, [10, 0, 0]],
        [1, rest],
      ]),
    },
  },
  /** Hit from the front: the body recoils back on its haunches, the maw gapes, the arms pull in. */
  flinch: {
    seconds: 0.5,
    loop: false,
    peak: 0.22,
    channels: {
      pelvis: {
        track: [
          [0, rest],
          [0.22, [12, 0, 0]],
          [1, rest],
        ],
      },
      spine: {
        track: [
          [0, rest],
          [0.22, [7, 0, 0]],
          [1, rest],
        ],
      },
      chest: {
        track: [
          [0, rest],
          [0.22, [8, 0, 0]],
          [1, rest],
        ],
      },
      head: {
        track: [
          [0, rest],
          [0.18, [6, 0, 0]],
          [1, rest],
        ],
      },
      jaw: {
        track: [
          [0, rest],
          [0.2, [32, 0, 0]],
          [1, rest],
        ],
      },
      ...both('upperArm', [
        [0, rest],
        [0.22, [-18, 0, 0]],
        [1, rest],
      ]),
      ...both('forearm', [
        [0, rest],
        [0.22, [-15, 0, 0]],
        [1, rest],
      ]),
      ...both('thigh', [
        [0, rest],
        [0.22, [-8, 0, 0]],
        [1, rest],
      ]),
    },
  },
  /** One hind spring lost (authored for the left; the right is mirrored): a three-point lurch, the
   * remaining spring pushing and both arms pulling, the body leaning onto the side it still has. */
  limp: {
    seconds: 1.1,
    loop: true,
    travel: [
      [0, 0],
      [1, 0.55],
    ],
    channels: {
      'thigh.R': { track: step(0.5, 18, [22, 0, 0]) },
      'shin.R': { track: lift(0.5, [-14, 0, 0]) },
      'foot.R': {
        track: [
          [0, rest],
          [0.4, [20, 0, 0]],
          [0.5, [10, 0, 0]],
          [0.75, [-15, 0, 0]],
          [1, rest],
        ],
      },
      ...both('upperArm', step(0.6, 16, [18, 0, 0]), [0.55, 0.85]),
      ...both('forearm', lift(0.6, [-28, 0, 0]), [0.55, 0.85]),
      ...both('hand', lift(0.6, [25, 0, 0]), [0.55, 0.85]),
      pelvis: {
        track: [
          [0, [-4, 0, 8]],
          [0.5, [2, 0, 10]],
          [1, [-4, 0, 8]],
        ],
      },
      spine: {
        track: [
          [0, [-6, 0, -4]],
          [0.5, [6, 0, -4]],
          [1, [-6, 0, -4]],
        ],
      },
      head: {
        track: [
          [0, [6, 0, 0]],
          [0.5, [-4, 0, 0]],
          [1, [6, 0, 0]],
        ],
      },
    },
  },
  /** Both hind springs lost: the arms reach and haul the dragging rump along. */
  drag: {
    seconds: 1.4,
    loop: true,
    travel: [
      [0, 0],
      [1, 0.45],
    ],
    channels: {
      pelvis: {
        track: [
          [0, [16, 0, 0]],
          [0.5, [18, 0, 0]],
          [1, [16, 0, 0]],
        ],
      },
      spine: {
        track: [
          [0, [-8, 0, 4]],
          [0.5, [-8, 0, -4]],
          [1, [-8, 0, 4]],
        ],
      },
      chest: {
        track: [
          [0, [-6, 0, 0]],
          [1, [-6, 0, 0]],
        ],
      },
      head: {
        track: [
          [0, [-8, 0, 0]],
          [1, [-8, 0, 0]],
        ],
      },
      ...both('upperArm', step(0.55, 30, [30, 0, 0]), [0, 0.5]),
      ...both(
        'forearm',
        [
          [0, [10, 0, 0]],
          [0.55, [-35, 0, 0]],
          [0.78, [-10, 0, 0]],
          [1, [10, 0, 0]],
        ],
        [0, 0.5],
      ),
      ...both('hand', lift(0.55, [30, 0, 0]), [0, 0.5]),
    },
  },
} as const satisfies Record<string, ClipDef>;

export type LeaperClip = keyof typeof CLIPS;
export const LEAPER_CLIPS = Object.keys(CLIPS) as readonly LeaperClip[];

/** Looks a clip up by name, refusing an unknown one rather than falling back to another. */
export const leaperClip = clipLookup<LeaperClip>('leaper', CLIPS);

/** Joint angles of a clip at normalized time `u` (0..1), keyed by bone id. */
export const clipAngles = (name: string, u: number, mirrored = false): Angles =>
  channelAngles(leaperClip(name), u, mirrored);

/** Which locomotion clip a body can still use, from the bones a cut has taken. */
export const locomotionFor = (
  hidden: ReadonlySet<string>,
  fast = false,
): { readonly clip: LeaperClip; readonly mirrored: boolean } => {
  const lostLeft = hidden.has('thigh.L');
  const lostRight = hidden.has('thigh.R');
  if (lostLeft && lostRight) {
    return { clip: 'drag', mirrored: false };
  }
  if (lostLeft || lostRight) {
    return { clip: 'limp', mirrored: lostRight };
  }
  return { clip: fast ? 'bound' : 'stalk', mirrored: false };
};

/** Bones a body rests on: the template's supports it still has, and the rump once both springs are gone. */
export const supportsFor = (bones: readonly Bone[], hidden: ReadonlySet<string>): ReadonlySet<string> => {
  const supports = new Set(
    (LEAPER_TEMPLATE.supportBones as readonly string[]).filter(
      (id) => bones.some((bone) => bone.id === id) && !hidden.has(id),
    ),
  );
  if (hidden.has('thigh.L') && hidden.has('thigh.R')) {
    supports.add('pelvis');
  }
  return supports;
};

export interface FrameOptions {
  /** Cut points already severed (mob/dismember.ts, severedBoneSet). */
  readonly cuts?: readonly string[];
  /** Plays a sided clip for the opposite side. */
  readonly mirrored?: boolean;
}

/** The pose of a clip at normalized time `u`, standing on the ground (keyframes.ts, groundedFrame). */
export const leaperFrame = (
  realized: Pick<Realized, 'body' | 'voxels'>,
  name: string,
  u: number,
  { cuts = [], mirrored = false }: FrameOptions = {},
): ClipFrame => {
  const clip = leaperClip(name);
  const { bones } = realized.body;
  const hidden = severedBoneSet(bones, cuts);
  const visible = bones.filter((bone) => !hidden.has(bone.id)).map((bone) => bone.id);
  return groundedFrame(realized, clip, (at) => channelAngles(clip, at, mirrored), u, visible);
};
