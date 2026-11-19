import { motionTransform } from '@skelly/construct/assembly/motion.ts';
import type { Resolved } from '@skelly/construct/assembly/schema.ts';
import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import {
  distanceWorld,
  localSolidBounds,
  lowerBoundDistanceWorld,
  penetrationWorld,
  type WorldSolid,
  worldSolid,
} from '@skelly/construct/shapes/geometry.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { stageDistance } from '@skelly/motion/motion';
import { resolveGunAction } from './actionDescription.ts';
import { hingeOf } from './actionMotion.ts';

// Every obstacle visits the same dyadic phases; a moving solid's pose is independent of the obstacle.
const cachedPoses = (at: (phase: number) => WorldSolid): ((phase: number) => WorldSolid) => {
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

/** Certify continuous intervals by bounding each vertex's maximum displacement from the midpoint. */
const clearsInterval = (
  at: (phase: number) => WorldSolid,
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
  if (penetrationWorld(shape, obstacle) > 1e-7 || depth >= 20) {
    return false;
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

/**
 * Certify the path of every mover that turns, one stage at a time over the part's own clock: the turn bolt turns at
 * battery and then draws; the SMG handle draws to its slot's rear end and then turns into the notch.
 */
export const sweepTurningAction = (resolved: Resolved): readonly string[] => {
  const action = resolveGunAction(resolved);
  if (!action) {
    return [];
  }
  const moving = new Set(Object.values(action.parts).map(({ id }) => id));
  const obstacles = [...resolved.defs]
    .filter(([id]) => !moving.has(id))
    .flatMap(([id, def]) =>
      def.solids.map((solid) => ({ id: `${id}.${solid.id}`, shape: worldSolid(resolved.placed.get(id)!, solid) })),
    );
  return Object.values(action.parts).flatMap((part) => {
    const { motion } = part;
    if (!hingeOf(motion)) {
      return [];
    }
    return part.def.solids.flatMap((solid) => {
      const paths = motion.stages.map((stage, i) => {
        const from = motion.stages.slice(0, i).reduce((clock, { share }) => clock + share, 0);
        return {
          at: cachedPoses((phase) =>
            worldSolid(motionTransform(part.placed, motion, from + phase * stage.share), solid),
          ),
          speedBound: stageDistance(stage, restHull(solid)),
        };
      });
      return obstacles
        .filter(({ shape }) => !paths.every(({ at, speedBound }) => clearsInterval(at, shape, speedBound)))
        .map(({ id }) => `${part.id}.${solid.id} vs ${id}`);
    });
  });
};
