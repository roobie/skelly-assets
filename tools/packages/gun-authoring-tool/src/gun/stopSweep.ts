import { motionTransform, OPEN_STOP, REST_STOP } from '@skelly/construct/assembly/motion.ts';
import { keepOutsMetBy } from '@skelly/construct/assembly/rules.ts';
import type { Resolved } from '@skelly/construct/assembly/schema.ts';
import { TOLERANCE } from '@skelly/construct/foundation/conventions.ts';
import type { Transform, Vec3 } from '@skelly/construct/foundation/math.ts';
import {
  distanceWorld,
  localSolidBounds,
  lowerBoundDistanceWorld,
  penetrationWorld,
  type WorldSolid,
  worldSolid,
} from '@skelly/construct/shapes/geometry.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { type Motion, stageDistance } from '@skelly/motion/motion';
import { hingeOf } from './actionMotion.ts';

/** A moving solid's pose along a path, by the path's phase from 0 to 1. */
type Path = (phase: number) => WorldSolid;

// Every obstacle visits the same dyadic phases; a moving solid's pose is independent of the obstacle.
const cachedPoses = (at: Path): Path => {
  const poses = new Map<number, WorldSolid>();
  return (phase) => {
    const cached = poses.get(phase);
    if (cached) {
      return cached;
    }
    const shape = at(phase);
    poses.set(phase, shape);
    return shape;
  };
};

/**
 * Certify continuous intervals by bounding each vertex's maximum displacement from the midpoint. Parts that only touch
 * never part by distance however finely an interval is split, so a touching interval is accepted once the part cannot
 * move more than the position allowance within it: the guarantee is in units, not in how deep the search went.
 */
const clearsInterval = (at: Path, obstacle: WorldSolid, speedBound: number, interval = { lo: 0, hi: 1 }): boolean => {
  const { lo, hi } = interval;
  const middle = (lo + hi) / 2;
  const shape = at(middle);
  const reach = (speedBound * (hi - lo)) / 2;
  if (lowerBoundDistanceWorld(shape, obstacle) > reach + 1e-9) {
    return true;
  }
  if (distanceWorld(shape, obstacle) > reach + 1e-9) {
    return true;
  }
  const penetration = penetrationWorld(shape, obstacle);
  if (penetration > TOLERANCE.contact) {
    return false;
  }
  if (penetration + reach <= TOLERANCE.position) {
    return true;
  }
  return (
    clearsInterval(at, obstacle, speedBound, { lo, hi: middle }) &&
    clearsInterval(at, obstacle, speedBound, { lo: middle, hi })
  );
};

/** The corners of the box `solid` fills at rest. */
const restHull = (solid: Solid): Vec3[] => {
  const [min, max] = localSolidBounds(solid);
  return [min[0], max[0]].flatMap((x) => [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z): Vec3 => [x, y, z])));
};

/**
 * The most a point of `solid` moves per unit of the span's phase, as the clock runs from `from` to `to`. At any phase only
 * one stage is running, so the bound is that of the fastest stage the span overlaps: its reach over its whole share,
 * scaled to the span's length.
 */
const spanSpeedBound = (motion: Motion, solid: Solid, from: number, to: number): number => {
  const hull = restHull(solid);
  let start = 0;
  let bound = 0;
  for (const stage of motion.stages) {
    const overlaps = Math.min(start + stage.share, to) > Math.max(start, from);
    if (overlaps) {
      bound = Math.max(bound, (stageDistance(stage, hull) * (to - from)) / stage.share);
    }
    start += stage.share;
  }
  return bound;
};

/** A part that moves over a motion, to be swept against the fixed `obstacles`. */
export interface SweptPart {
  readonly id: string;
  readonly placed: Transform;
  readonly solids: readonly Solid[];
  readonly motion: Motion;
}

/** What a part must not touch: a fixed solid and the name a clash with it is reported under. */
export interface Obstacle {
  readonly id: string;
  readonly shape: WorldSolid;
}

/**
 * Every clash of `part` with an obstacle at a stop or on the way between two consecutive stops, one entry for each
 * solid, obstacle and span: `part.solid vs obstacle from stop to stop`. Each span is certified over the part's own
 * clock, however many slides and hinges it crosses, so a stop that cannot be reached, or a path that clips something
 * between two stops that are each clear, is found.
 */
export const sweepPartStops = (part: SweptPart, obstacles: readonly Obstacle[]): readonly string[] => {
  const { motion } = part;
  const spans = motion.stops.slice(1).map((stop, i) => ({ from: motion.stops[i]!, to: stop }));
  return part.solids.flatMap((solid) =>
    spans.flatMap(({ from, to }) => {
      const at = cachedPoses((phase) =>
        worldSolid(motionTransform(part.placed, motion, from.clock + phase * (to.clock - from.clock)), solid),
      );
      const speedBound = spanSpeedBound(motion, solid, from.clock, to.clock);
      return obstacles
        .filter(({ shape }) => !clearsInterval(at, shape, speedBound))
        .map(({ id }) => `${part.id}.${solid.id} vs ${id} from ${from.name} to ${to.name}`);
    }),
  );
};

/**
 * The keep-outs of other parts that `id` occupies at each named stop of `motion`, as `id at stop: what intrudes`. Its own
 * keep-outs describe its whole travel from rest, so carrying them to a stop would mean nothing.
 */
const keepOutsAtStops = (resolved: Resolved, id: string, motion: Motion): readonly string[] =>
  motion.stops.flatMap(({ name, clock }) => {
    const placed = new Map(resolved.placed).set(id, motionTransform(resolved.placed.get(id)!, motion, clock));
    return keepOutsMetBy({ ...resolved, placed }, id).map(({ message }) => `${id} at ${name}: ${message}`);
  });

/**
 * Whether a part's motion is swept: every turn, a bolt's or a handle's turn and a stock's fold alike, and every slide
 * that names stops of its own, such as a stock's positions along its tube. A slide left to the default stops, rest and
 * open, is an action's stroke, which rides inside the receiver by design, a pistol's slide in its frame's rails and a
 * carrier in its bore, so solids that overlap there are no clash.
 */
const isSwept = (motion: Motion): boolean =>
  hingeOf(motion) !== undefined || motion.stops.map(({ name }) => name).join() !== ACTION_STROKE_STOPS;

/** The stops a motion that names none of its own is given: an action's stroke. */
const ACTION_STROKE_STOPS = [REST_STOP, OPEN_STOP].join();

/**
 * Certify every stop and every span between stops of every swept part of the gun, a stock's slide along its tube
 * alike: each span against everything that does not move, and each stop against the keep-outs of the other parts.
 */
export const sweepStops = (resolved: Resolved): readonly string[] => {
  const obstacles = [...resolved.defs]
    .filter(([id]) => !resolved.motions.has(id))
    .flatMap(([id, def]) =>
      def.solids.map((solid) => ({ id: `${id}.${solid.id}`, shape: worldSolid(resolved.placed.get(id)!, solid) })),
    );
  return [...resolved.motions]
    .filter(([, motion]) => isSwept(motion))
    .flatMap(([id, motion]) => [
      ...sweepPartStops(
        { id, placed: resolved.placed.get(id)!, solids: resolved.defs.get(id)!.solids, motion },
        obstacles,
      ),
      ...keepOutsAtStops(resolved, id, motion),
    ]);
};
