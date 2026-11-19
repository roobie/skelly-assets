import {
  type Motion,
  type MotionStage,
  poseAt,
  type Rigid,
  type StageMove,
  type Stop,
  shareStages,
  stopsError,
} from '@skelly/motion/motion';
import { compose, length, type Transform, type Vec3 } from '../foundation/math.ts';
import { boundsOfPoints, localSolidBounds } from '../shapes/geometry.ts';
import type { Solid } from '../shapes/solid.ts';
import type { KeepOutTravel, PartMotion, PartStop } from './schema.ts';

/** A part's authored motion cannot form a motion; the message says why, for the structure report. */
export class MotionError extends Error {}

/** The stop at the start of every motion's clock. */
export const REST_STOP = 'rest';
/** The stop at the end of every motion's clock. */
export const OPEN_STOP = 'open';

const rigidTransform = ({ rotation: [a, b, c], shift }: Rigid): Transform => ({
  r: [...a, ...b, ...c],
  t: shift,
});

/** Where a part placed at `placed` stands with its motion at `clock`, from 0 at rest to 1 at the end of travel. */
export const motionTransform = (placed: Transform, motion: Motion, clock: number): Transform =>
  compose(placed, rigidTransform(poseAt(motion, clock)));

/** The corners of the box the solids fill at rest. */
const restHull = (solids: readonly Solid[]): Vec3[] => {
  const [min, max] = boundsOfPoints(solids.flatMap((solid) => localSolidBounds(solid)));
  return [min[0], max[0]].flatMap((x) => [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z): Vec3 => [x, y, z])));
};

/**
 * The motion a part's stages make once every slide has its travel: each stage's share of the clock is the distance it
 * carries the part's solids, and the clock's stops lie where the part authors them along its stages. `travelOf` gives the
 * travel a keep-out source stands for along a direction, and throws a `MotionError` when it has none. Throws a
 * `MotionError` when the stages cannot form a motion.
 */
export const resolveMotion = (
  authored: PartMotion,
  travelOf: (source: KeepOutTravel, direction: Vec3) => number,
  solids: readonly Solid[],
): Motion => {
  const moves = authored.stages.map((stage): StageMove => {
    if (stage.kind === 'hinge') {
      return stage;
    }
    if (Math.abs(length(stage.direction) - 1) > 1e-9) {
      throw new MotionError('a slide goes along a unit direction');
    }
    const { travel } = stage;
    return { ...stage, travel: typeof travel === 'number' ? travel : travelOf(travel, stage.direction) };
  });
  let stages: MotionStage[];
  try {
    stages = shareStages(moves, restHull(solids));
  } catch (error) {
    throw new MotionError(error instanceof Error ? error.message : String(error));
  }
  const stops = (authored.stops ?? defaultStops(stages.length)).map((stop) => resolveStop(stop, stages));
  const error = stopsError(stops);
  if (error !== undefined) {
    throw new MotionError(error);
  }
  return { stages, stops };
};

/** Every motion's stops unless it names its own: the rest, and open at the end of the last stage. */
const defaultStops = (stageCount: number): PartStop[] => [
  { name: REST_STOP, stage: 0, at: 0 },
  { name: OPEN_STOP, stage: stageCount - 1 },
];

/** Where on the clock `stop` lies once the stages have their shares. */
const resolveStop = ({ name, stage: index, at }: PartStop, stages: readonly MotionStage[]): Stop => {
  const stage = stages[index];
  if (stage === undefined) {
    throw new MotionError(`stop "${name}" lies on stage ${index}, which the part does not have`);
  }
  const full = stage.kind === 'slide' ? stage.travel : stage.angle;
  const fraction = at === undefined ? 1 : at / full;
  if (!(fraction >= 0 && fraction <= 1)) {
    throw new MotionError(`stop "${name}" lies ${at} into stage ${index}, which moves ${full}`);
  }
  const before = stages.slice(0, index).reduce((clock, { share }) => clock + share, 0);
  // The last stage ends the clock exactly, whatever the shares sum to in floating point.
  const clock = index === stages.length - 1 && fraction === 1 ? 1 : before + stage.share * fraction;
  return { name, clock };
};
