import { describe, expect, it } from 'vitest';
import ragdoll from '../../../../models/mobs/walker/ragdoll.json' with { type: 'json' };
import type { Realized } from '../src/core/generate.ts';
import { generateValid, planOf } from '../src/core/generate.ts';
import { applyPoint, mulMV, sub, type Vec3 } from '../src/core/math.ts';
import { boneTransforms } from '../src/core/pose.ts';
import { posedVoxelSurfaceBoundsForBones } from '../src/core/voxelBounds.ts';
import { severableParts, severedBoneSet } from '../src/mob/dismember.ts';
import {
  WALKER_CLIPS,
  WALKER_DAMAGE,
  walkerAngles,
  walkerClip,
  walkerFrame,
  walkerGaitFor,
  walkerStumps,
} from '../src/mob/walker/motion.ts';
import { WALKER_TEMPLATE } from '../src/mob/walker/plan.ts';
import { sweepGroup } from './sweeps.ts';

const FRAMES = 32;
const FEET = ['foot.L', 'foot.R'];
/** A leg lost from the heel down is cut at its foot. */
const STUMP_CUTS = FEET;
const UNKNOWN_CLIP = /unknown walker clip/;
const ONE_STUMP = /keyed for one stump/;
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

/** A clip played on a body it is keyed for: a clip keyed for a stump plays on either leg lost from the heel
 * down, every other clip on the whole body. */
interface Played {
  readonly clip: string;
  readonly cuts: readonly string[];
}
const PLAYED: readonly Played[] = WALKER_CLIPS.flatMap((clip) =>
  walkerClip(clip).stump ? STUMP_CUTS.map((cut) => ({ clip, cuts: [cut] })) : [{ clip, cuts: [] }],
);
const named = ({ clip, cuts }: Played) => (cuts.length ? `${clip} without ${cuts.join(', ')}` : clip);

const frames = (realized: Realized, { clip, cuts }: Played) =>
  Array.from({ length: FRAMES + 1 }, (_, i) => ({
    u: i / FRAMES,
    ...walkerFrame(realized, clip, i / FRAMES, { cuts }),
  }));

/** The bones a body may stand on: its feet, or the tarsus a lost foot leaves as a stump. */
const supportsOf = (cuts: readonly string[]) =>
  FEET.map((foot) => (cuts.includes(foot) ? foot.replace('foot', 'tarsus') : foot));
const visibleOf = (realized: Realized, cuts: readonly string[]) => {
  const hidden = severedBoneSet(realized.body.bones, cuts);
  return realized.body.bones.map((bone) => bone.id).filter((id) => !hidden.has(id));
};

/** Every clip stands on what its body keeps: the lowest voxel of each frame belongs to a foot or a stump. */
const restFailures = (realized: Realized): string[] =>
  PLAYED.flatMap((played) =>
    frames(realized, played).flatMap(({ u, pose }) => {
      const bounds = posedVoxelSurfaceBoundsForBones(realized, pose, visibleOf(realized, played.cuts));
      const [lowest] = [...bounds].reduce((low, entry) => (entry[1] < low[1] ? entry : low));
      return supportsOf(played.cuts).includes(lowest) ? [] : [`${named(played)} at ${u.toFixed(3)} rests on ${lowest}`];
    }),
  );

/** Where a bone's end is in the world, frame by frame, with the clip's travel applied. */
const pointTrack = (realized: Realized, played: Played, id: string, end: 'head' | 'tail') => {
  const bone = realized.body.bones.find((candidate) => candidate.id === id)!;
  return frames(realized, played).map(({ pose }) =>
    applyPoint(boneTransforms(realized.body.bones, pose).get(id)!, bone[end]),
  );
};

/** A support is planted while its point is at its lowest; a planted support that moves across the ground
 * slides. Returns the planted frames and the slides. */
const planting = (track: readonly Vec3[]) => {
  const ground = Math.min(...track.map(([, y]) => y));
  const planted = track.map(([, y]) => y - ground < PLANTED);
  const slid = (i: number) => {
    const [x, , z] = sub(track[i]!, track[i - 1]!);
    return Math.hypot(x, z) > PLANTED;
  };
  const slides = track.flatMap((_, i) => (i > 0 && planted[i] && planted[i - 1] && slid(i) ? [i] : []));
  return { planted, slides };
};

/** Each support's planted point: a foot's ball, or the stump's end where the ball was. */
const contactPoints = (cuts: readonly string[]) =>
  supportsOf(cuts).map((id) => ({ id, end: id.startsWith('foot') ? ('head' as const) : ('tail' as const) }));

describe('walker body', () => {
  it('validates at the template grid', () => {
    expect(walker.report.issues).toEqual([]);
  });

  it('maps every bone to exactly one hit region', () => {
    const owners = bones.map((bone) => Object.entries(regions).filter(([, members]) => members.includes(bone.id)));
    expect(owners.map((owner) => owner.length)).toEqual(bones.map(() => 1));
  });

  it('cuts at limb roots, the head and the feet, each cut staying inside its region, never the hull', () => {
    const parts = severableParts(bones);
    const roots = parts.filter((part) => bones.find((bone) => bone.id === part)!.parent === 'hull');
    expect(parts.filter((part) => !roots.includes(part)).toSorted()).toEqual(STUMP_CUTS.toSorted());
    expect(roots.length).toBeGreaterThan(0);
    for (const part of parts) {
      const region = Object.values(regions).find((members) => members.includes(part))!;
      expect([...severedBoneSet(bones, [part])].every((id) => region.includes(id))).toBe(true);
    }
    expect(severedBoneSet(bones, roots).size).toBe(bones.length - regions.torso.length);
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
    for (const played of PLAYED) {
      const stumps = walkerStumps(walker, played.cuts);
      for (let i = 0; i <= FRAMES; i++) {
        for (const [id, [flex, twist, abduct]] of Object.entries(
          walkerAngles(bones, played.clip, i / FRAMES, stumps),
        )) {
          const limits = bones.find((bone) => bone.id === id)!.limits!;
          if (!(inside(flex, limits.flex) && inside(twist, limits.twist) && inside(abduct, limits.abduct))) {
            outside.push(`${named(played)} ${id} at ${(i / FRAMES).toFixed(3)}`);
          }
        }
      }
    }
    expect(outside).toEqual([]);
  });

  it('plants each foot and stump while it carries a walk, so nothing on the ground slides', () => {
    for (const played of PLAYED.filter(({ clip }) => walkerClip(clip).travel)) {
      for (const { id, end } of contactPoints(played.cuts)) {
        const track = pointTrack(walker, played, id, end);
        const { planted, slides } = planting(track);
        expect(slides, `${named(played)}: ${id} slides`).toEqual([]);
        // Not vacuous: each support both stands for a stretch and travels with the body over the cycle.
        expect(planted.filter(Boolean).length, `${named(played)}: ${id} stands`).toBeGreaterThan(FRAMES / 4);
        expect(Math.abs(track.at(-1)![2] - track[0]![2])).toBeGreaterThan(0.5);
      }
    }
  });

  it('sets a stump down on the ground where its heel stood', () => {
    const voxel = walker.voxels.size;
    for (const cut of STUMP_CUTS) {
      const tarsus = cut.replace('foot', 'tarsus');
      const limp = { clip: 'limp', cuts: [cut] };
      const track = pointTrack(walker, limp, tarsus, 'tail');
      const { planted } = planting(track);
      // Wherever the stump is planted, its lowest voxel bears on the ground.
      frames(walker, limp).forEach(({ pose }, i) => {
        if (planted[i]) {
          const low = posedVoxelSurfaceBoundsForBones(walker, pose, [tarsus]).get(tarsus)!;
          expect(Math.abs(low), `${cut} stump at frame ${i}`).toBeLessThan(voxel / 2);
        }
      });
      // Standing, the stump's end is over the place its heel held on the whole body, and its lowest voxel is on the ground.
      const stood = walkerFrame(walker, 'idle', 0, { cuts: [cut] }).pose;
      const whole = walkerFrame(walker, 'idle', 0).pose;
      const end = (pose: typeof stood) =>
        applyPoint(boneTransforms(bones, pose).get(tarsus)!, bones.find((bone) => bone.id === tarsus)!.tail);
      expect(Math.abs(end(stood)[2] - end(whole)[2])).toBeLessThan(PLANTED);
      expect(Math.abs(posedVoxelSurfaceBoundsForBones(walker, stood, [tarsus]).get(tarsus)!)).toBeLessThan(voxel / 2);
    }
  });

  it('walks a body that lost one foot on the limp, and a whole one on the stomp', () => {
    expect(walkerGaitFor(walkerStumps(walker, []))).toBe('stomp');
    for (const cut of STUMP_CUTS) {
      expect(walkerGaitFor(walkerStumps(walker, [cut]))).toBe('limp');
    }
  });

  it('refuses to play the limp on a body without exactly one stump', () => {
    expect(() => walkerFrame(walker, 'limp', 0)).toThrow(ONE_STUMP);
    expect(() => walkerFrame(walker, 'limp', 0, { cuts: STUMP_CUTS })).toThrow(ONE_STUMP);
  });

  it('tilts the hull by a flinch inside its content band, the feet standing where they stood', () => {
    const flinch = { clip: 'flinch', cuts: [] };
    const hull = bones.find((bone) => bone.id === 'hull')!;
    const along = sub(hull.tail, hull.head);
    // The hull's pitch in the world, from how far its line turns out of the ground plane's level.
    const pitches = frames(walker, flinch).map(({ pose }) => {
      const turned = mulMV(boneTransforms(bones, pose).get('hull')!.r, along);
      const rise = ([x, y, z]: Vec3) => Math.atan2(y, Math.hypot(x, z));
      return Math.abs(rise(turned) - rise(along));
    });
    const tilt = (Math.max(...pitches) * 180) / Math.PI;
    expect(tilt).toBeGreaterThanOrEqual(WALKER_DAMAGE.tiltBounds.min);
    expect(tilt).toBeLessThanOrEqual(WALKER_DAMAGE.tiltBounds.max);
    for (const { id, end } of contactPoints([])) {
      const track = pointTrack(walker, flinch, id, end);
      const moved = Math.max(...track.map((at) => Math.hypot(...sub(at, track[0]!))));
      expect(moved, id).toBeLessThan(PLANTED);
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
