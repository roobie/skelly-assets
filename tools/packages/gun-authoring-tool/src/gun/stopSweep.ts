import { motionTransform } from '@skelly/construct/assembly/motion.ts';
import { keepOutForPart } from '@skelly/construct/assembly/rules.ts';
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
import { resolveGunAction } from './actionDescription.ts';
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

const MAX_DEPTH = 20;

/** Certify continuous intervals by bounding each vertex's maximum displacement from the midpoint. */
const clearsInterval = (
  at: Path,
  obstacle: WorldSolid,
  speedBound: number,
  interval = { lo: 0, hi: 1, depth: 0 },
): boolean => {
  const { lo, hi, depth } = interval;
  const middle = (lo + hi) / 2;
  const shape = at(middle);
  if (lowerBoundDistanceWorld(shape, obstacle) > (speedBound * (hi - lo)) / 2 + 1e-9) {
    return true;
  }
  if (distanceWorld(shape, obstacle) > (speedBound * (hi - lo)) / 2 + 1e-9) {
    return true;
  }
  if (penetrationWorld(shape, obstacle) > TOLERANCE.contact) {
    return false;
  }
  // Parts that only touch, flush, never part from the obstacle however finely the interval is split.
  if (depth >= MAX_DEPTH) {
    return true;
  }
  return (
    clearsInterval(at, obstacle, speedBound, { lo, hi: middle, depth: depth + 1 }) &&
    clearsInterval(at, obstacle, speedBound, { lo: middle, hi, depth: depth + 1 })
  );
};

/** The corners of the box `solid` fills at rest. */
const restHull = (solid: Solid): Vec3[] => {
  const [min, max] = localSolidBounds(solid);
  return [min[0], max[0]].flatMap((x) => [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z): Vec3 => [x, y, z])));
};

/** The most a point of `solid` moves while the clock runs from `from` to `to`: each stage's reach for the part of it that falls in the span. */
const spanSpeedBound = (motion: Motion, solid: Solid, from: number, to: number): number => {
  const hull = restHull(solid);
  let start = 0;
  let bound = 0;
  for (const stage of motion.stages) {
    const overlap = Math.max(0, Math.min(start + stage.share, to) - Math.max(start, from));
    bound += (stageDistance(stage, hull) * overlap) / stage.share;
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

/** Every keep-out `id` meets when it stands at each named stop of `motion`, as `id at stop: what intrudes`. */
const keepOutsAtStops = (resolved: Resolved, id: string, motion: Motion): readonly string[] =>
  motion.stops.flatMap(({ name, clock }) => {
    const placed = new Map(resolved.placed).set(id, motionTransform(resolved.placed.get(id)!, motion, clock));
    return keepOutForPart({ ...resolved, placed }, id).map(({ message }) => `${id} at ${name}: ${message}`);
  });

/**
 * Certify every stop and every span between stops of every part of the gun that turns, a bolt's or a handle's turn and
 * a stock's fold alike: each span against everything that does not move, and each stop against the keep-outs. The
 * action's own parts are no judge of keep-outs, which are made room for them: a bolt rides through the receiver's
 * loading and clearance volumes by design. A part that only slides is left to `sweepMovingPart`, which certifies it
 * against its keep-outs: a pistol's slide rides inside its frame's rails by design, so solids that overlap there are no
 * clash. A slide part with stops of its own would need adding here.
 */
export const sweepStops = (resolved: Resolved): readonly string[] => {
  const actionParts = new Set(
    Object.values(resolveGunAction(resolved)?.parts ?? {}).flatMap((part) => (part ? [part.id] : [])),
  );
  const obstacles = [...resolved.defs]
    .filter(([id]) => !resolved.motions.has(id))
    .flatMap(([id, def]) =>
      def.solids.map((solid) => ({ id: `${id}.${solid.id}`, shape: worldSolid(resolved.placed.get(id)!, solid) })),
    );
  return [...resolved.motions]
    .filter(([, motion]) => hingeOf(motion))
    .flatMap(([id, motion]) => [
      ...sweepPartStops(
        { id, placed: resolved.placed.get(id)!, solids: resolved.defs.get(id)!.solids, motion },
        obstacles,
      ),
      ...(actionParts.has(id) ? [] : keepOutsAtStops(resolved, id, motion)),
    ]);
};
