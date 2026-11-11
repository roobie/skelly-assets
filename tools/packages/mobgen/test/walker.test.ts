import { describe, expect, it } from 'vitest';
import ragdoll from '../../../../models/mobs/walker/ragdoll.json' with { type: 'json' };
import type { Realized } from '../src/core/generate.ts';
import { generateValid, planOf } from '../src/core/generate.ts';
import { applyPoint } from '../src/core/math.ts';
import { boneTransforms } from '../src/core/pose.ts';
import { posedVoxelSurfaceBoundsForBones } from '../src/core/voxelBounds.ts';
import { severableParts, severedBoneSet } from '../src/mob/dismember.ts';
import { WALKER_CLIPS, walkerAngles, walkerClip, walkerFrame } from '../src/mob/walker/motion.ts';
import { WALKER_TEMPLATE } from '../src/mob/walker/plan.ts';
import { sweepGroup } from './sweeps.ts';

const FRAMES = 32;
const FEET = ['foot.L', 'foot.R'];
const UNKNOWN_CLIP = /unknown walker clip/;
/** A planted foot holds its place to within a millimetre. */
const PLANTED = 1e-3;

const searched = (seed: number) => {
  const found = generateValid(WALKER_TEMPLATE, seed);
  if (!found) {
    throw new Error(`no valid walker from seed ${seed}`);
  }
  return found;
};
const walker = searched(0).realized;
const { bones } = walker.body;
const regions = planOf('walker').regionBones!;

const frames = (realized: Realized, clip: string) =>
  Array.from({ length: FRAMES + 1 }, (_, i) => ({ u: i / FRAMES, ...walkerFrame(realized, clip, i / FRAMES) }));

/** Every clip stands on the feet: the lowest voxel of each frame belongs to a foot. */
const restFailures = (realized: Realized): string[] =>
  WALKER_CLIPS.flatMap((clip) =>
    frames(realized, clip).flatMap(({ u, pose }) => {
      const ids = realized.body.bones.map((bone) => bone.id);
      const [lowest] = [...posedVoxelSurfaceBoundsForBones(realized, pose, ids)].reduce((low, entry) =>
        entry[1] < low[1] ? entry : low,
      );
      return FEET.includes(lowest) ? [] : [`${clip} at ${u.toFixed(3)} rests on ${lowest}`];
    }),
  );

/** Where each foot's ball is in the world, frame by frame, through the stomp with its travel applied. */
const ballTrack = (realized: Realized, foot: string) => {
  const bone = realized.body.bones.find((candidate) => candidate.id === foot)!;
  return frames(realized, 'stomp').map(({ pose }) => applyPoint(boneTransforms(realized.body.bones, pose).get(foot)!, bone.head));
};

describe('walker body', () => {
  it('validates at the template grid', () => {
    expect(walker.report.issues).toEqual([]);
  });

  it('maps every bone to exactly one hit region', () => {
    const owners = bones.map((bone) => Object.entries(regions).filter(([, members]) => members.includes(bone.id)));
    expect(owners.map((owner) => owner.length)).toEqual(bones.map(() => 1));
  });

  it('cuts only at limb roots and the head, each cut staying inside its region, never the hull', () => {
    const parts = severableParts(bones);
    expect(parts.length).toBeGreaterThan(0);
    for (const part of parts) {
      expect(bones.find((bone) => bone.id === part)!.parent).toBe('hull');
      const region = Object.values(regions).find((members) => members.includes(part))!;
      expect([...severedBoneSet(bones, [part])].every((id) => region.includes(id))).toBe(true);
    }
    expect(severedBoneSet(bones, parts).size).toBe(bones.length - regions.torso.length);
  });

  it('gives the corpse solver ragdoll groups holding every bone exactly once', () => {
    const grouped = ragdoll.groups.flatMap((group) => group.bones);
    expect(grouped.toSorted()).toEqual(bones.map((bone) => bone.id).toSorted());
  });
});

describe('walker motion', () => {
  it('stands on its feet in every frame of every clip', () => {
    expect(restFailures(walker)).toEqual([]);
  });

  it('keeps every clip, solved legs included, inside the rig joint ranges', () => {
    const inside = (value: number, [lo, hi]: readonly [number, number]) => value >= lo - 1e-9 && value <= hi + 1e-9;
    const outside: string[] = [];
    for (const clip of WALKER_CLIPS) {
      for (let i = 0; i <= FRAMES; i++) {
        for (const [id, [flex, twist, abduct]] of Object.entries(walkerAngles(bones, clip, i / FRAMES))) {
          const limits = bones.find((bone) => bone.id === id)!.limits!;
          if (!(inside(flex, limits.flex) && inside(twist, limits.twist) && inside(abduct, limits.abduct))) {
            outside.push(`${clip} ${id} at ${(i / FRAMES).toFixed(3)}`);
          }
        }
      }
    }
    expect(outside).toEqual([]);
  });

  it('plants each foot while it carries the stomp, so a foot on the ground never slides', () => {
    for (const foot of FEET) {
      const track = ballTrack(walker, foot);
      const ground = Math.min(...track.map(([, y]) => y));
      const planted = track.map(([, y]) => y - ground < PLANTED);
      const slides = track.flatMap((at, i) =>
        i > 0 && planted[i] && planted[i - 1] && Math.hypot(at[0] - track[i - 1]![0], at[2] - track[i - 1]![2]) > PLANTED
          ? [`${foot} slides at frame ${i}`]
          : [],
      );
      expect(slides).toEqual([]);
      // Not vacuous: the foot both stands for a stretch and travels with the body over the cycle.
      expect(planted.filter(Boolean).length).toBeGreaterThan(FRAMES / 4);
      expect(Math.abs(track.at(-1)![2] - track[0]![2])).toBeGreaterThan(0.5);
    }
  });

  it('flashes the charged lens and muzzles at the first shot and ends the fire at rest glow', () => {
    const fire = walkerClip('fire');
    const at = (u: number) => walkerFrame(walker, 'fire', u).charge;
    expect(at(fire.hit! + 0.01)).toBeGreaterThan(at(0));
    expect(at(1)).toBe(1);
  });

  it('refuses an unknown clip rather than playing another', () => {
    expect(() => walkerFrame(walker, 'no-such-clip', 0)).toThrow(UNKNOWN_CLIP);
  });
});

sweepGroup('walker sweeps', () => {
  it('finds valid bodies that stand on their feet in every clip across start seeds', () => {
    for (let seed = 1; seed < 24; seed++) {
      expect(restFailures(searched(seed).realized), `seed ${seed}`).toEqual([]);
    }
  });
});
