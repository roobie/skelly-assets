// Keyframed whole-body clips: joint-angle tracks on a rig whose joint frames make every angle mean the
// same thing on both sides, sampled at a normalized time and grounded on the supports the body keeps.
// Shared by the mobs that author their motion as clips (leaper/motion.ts, walker/motion.ts), so a clip
// plays, mirrors, travels and lands the same way whichever mob it belongs to.

import type { Bone } from '../core/body.ts';
import type { Realized } from '../core/generate.ts';
import { jointRotation } from '../core/joints.ts';
import { lerp } from '../core/math.ts';
import type { EulerDeg, Pose } from '../core/pose.ts';
import { posedVoxelSurfaceBoundsForBones } from '../core/voxelBounds.ts';

export type Key = readonly [number, EulerDeg];
export type Track = readonly Key[];
export type Angles = Record<string, EulerDeg>;
/** A scalar over the clip, as [time, value] keys. */
export type ScalarKeys = readonly (readonly [number, number])[];

const ease = (t: number): number => t * t * (3 - 2 * t);

/** The eased value of `track` at `u`; a looping track wraps, and its last key should repeat its first. */
export const sample = (track: Track, u: number): EulerDeg => {
  const first = track[0]!;
  if (u <= first[0]) {
    return first[1];
  }
  for (let i = 1; i < track.length; i++) {
    const [u1, b] = track[i]!;
    const [u0, a] = track[i - 1]!;
    if (u <= u1) {
      const t = ease((u - u0) / Math.max(1e-9, u1 - u0));
      return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    }
  }
  return track.at(-1)![1];
};

export const scalar = (keys: ScalarKeys, u: number): number =>
  sample(
    keys.map(([at, value]) => [at, [value, 0, 0]] as const),
    u,
  )[0];

/** A sided channel; `shift` offsets the limb's cycle, as a fraction of the clip. */
export interface Channel {
  readonly track: Track;
  readonly shift?: number;
}

/** Mirrored sides share flex; twist and abduct change sign, as the rigs' joint frames are built to. */
export const mirror = ([flex, twist, abduct]: EulerDeg): EulerDeg => [flex, -twist, -abduct];
const SIDE_SWAP: Readonly<Record<string, string>> = { L: 'R', R: 'L' };
export const otherSide = (id: string): string => {
  const [name, side] = id.split('.');
  return side === undefined ? id : `${name}.${SIDE_SWAP[side]}`;
};

/** The same track on both sides, mirrored, each with its own cycle offset. */
export const both = (
  name: string,
  track: Track,
  shifts: readonly [number, number] = [0, 0],
): Record<string, Channel> => ({
  [`${name}.L`]: { track, shift: shifts[0] },
  [`${name}.R`]: { track: track.map(([u, angles]) => [u, mirror(angles)] as const), shift: shifts[1] },
});

export interface ClipDef {
  readonly seconds: number;
  readonly loop: boolean;
  readonly channels: Readonly<Record<string, Channel>>;
  /** Forward travel in metres over the clip, as keys. */
  readonly travel?: ScalarKeys;
  /** The airborne span and its apex above the straight line from takeoff to landing height, in metres. */
  readonly air?: { readonly from: number; readonly to: number; readonly apex: number };
  /** Multiplier on charged materials' emission (mob/crowd.ts, packCharge), as keys. */
  readonly charge?: ScalarKeys;
  /** When an attack's blow lands, as a fraction of the clip, so a consumer resolves damage on the motion. */
  readonly hit?: number;
  /** When a reaction is at its fullest, as a fraction of the clip. */
  readonly peak?: number;
}

/** Looks a clip up by name, refusing an unknown one rather than falling back to another. */
export const clipLookup =
  <Name extends string, Def extends ClipDef = ClipDef>(mob: string, clips: Readonly<Record<Name, Def>>) =>
  (name: string): Def & { readonly name: Name } => {
    if (!Object.hasOwn(clips, name)) {
      throw new Error(`unknown ${mob} clip "${name}"; known: ${Object.keys(clips).join(', ')}`);
    }
    return { ...clips[name as Name], name: name as Name };
  };

/** A clip's channel angles at normalized time `u` (0..1), keyed by bone id; `mirrored` plays it for the
 * opposite side. */
export const channelAngles = (clip: ClipDef, u: number, mirrored = false): Angles => {
  const angles: Angles = {};
  for (const [id, { track, shift = 0 }] of Object.entries(clip.channels)) {
    const local = clip.loop ? (((u + shift) % 1) + 1) % 1 : u;
    const value = sample(track, local);
    angles[mirrored ? otherSide(id) : id] = mirrored ? mirror(value) : value;
  }
  return angles;
};

export const posed = (bones: readonly Bone[], angles: Angles, root: Pose['root']): Pose => ({
  root,
  rotations: Object.fromEntries(
    bones.filter((bone) => angles[bone.id]).map((bone) => [bone.id, jointRotation(bone, angles[bone.id]!)]),
  ),
});

export interface ClipFrame {
  readonly pose: Pose;
  /** True while the clip carries the body clear of the ground. */
  readonly airborne: boolean;
  readonly charge: number;
}

/** The pose of `clip` at normalized time `u`, standing on the ground: the lowest voxel of a `visible` bone
 * touches it, except in the clip's airborne span, which arcs between the takeoff and landing heights.
 * `anglesAt` gives the clip's joint angles at any time, so a mob may solve some of them rather than key them. */
export const groundedFrame = (
  realized: Pick<Realized, 'body' | 'voxels'>,
  clip: ClipDef,
  anglesAt: (u: number) => Angles,
  u: number,
  visible: readonly string[],
): ClipFrame => {
  const { bones } = realized.body;
  const travel = clip.travel ? scalar(clip.travel, u) : 0;
  const lifted = (at: number): number => {
    const pose = posed(bones, anglesAt(at), [0, 0, 0]);
    return -Math.min(...posedVoxelSurfaceBoundsForBones(realized, pose, visible).values());
  };
  const { air } = clip;
  const airborne = air !== undefined && u > air.from && u < air.to;
  let height: number;
  if (airborne) {
    const s = (u - air.from) / (air.to - air.from);
    height = lerp(lifted(air.from), lifted(air.to), s) + 4 * air.apex * s * (1 - s);
  } else {
    height = lifted(u);
  }
  return {
    pose: posed(bones, anglesAt(u), [0, height, -travel]),
    airborne,
    charge: clip.charge ? scalar(clip.charge, u) : 1,
  };
};
