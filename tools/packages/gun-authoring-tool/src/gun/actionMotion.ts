import { OPEN_STOP, REST_STOP } from '@skelly/construct/assembly/motion.ts';
import type { HingeStage, Motion, SlideStage } from '@skelly/motion/motion';

/** The stop of a turn-bolt part where the bolt has turned free of its lugs, before it is drawn back. */
export const UNLOCKED_STOP = 'unlocked';

/** The stop of an SMG's charging handle where it has drawn to the slot's rear end and turned up into the notch. */
export const NOTCHED_STOP = 'notched';

const FINISHED_TOLERANCE = 1e-9;

/** The one slide of a hand-driven part: its stroke. */
export const slideOf = (motion: Motion): SlideStage => {
  const slides = motion.stages.filter((stage): stage is SlideStage => stage.kind === 'slide');
  if (slides.length !== 1) {
    throw new Error('an action part strokes along exactly one slide');
  }
  return slides[0]!;
};

/** The turn of a part that has one, a bolt's or an SMG handle's or a stock's fold. */
export const hingeOf = (motion: Motion): HingeStage | undefined =>
  motion.stages.find((stage): stage is HingeStage => stage.kind === 'hinge');

/** The stops a motion that names none of its own is given. */
const DEFAULT_STOPS = [REST_STOP, OPEN_STOP].join();

/**
 * Whether a motion is an action's stroke: a slide with no turn, left to the default stops, rest and open. A part that
 * turns, such as a port cover or a folding stock, or one that names stops of its own, such as a stock's positions along
 * its tube, moves for its own sake rather than to work the action.
 */
export const isActionStroke = (motion: Motion): boolean =>
  hingeOf(motion) === undefined && motion.stops.map(({ name }) => name).join() === DEFAULT_STOPS;

/**
 * The clock a motion shows when its slide has gone `drawn` of its stroke and its hinge `turned` of its turn. Stages run
 * one after another, so throws when a stage has moved before the one ahead of it finished.
 */
export const clockOf = (motion: Motion, drawn: number, turned: number): number => {
  let clock = 0;
  let unfinished = false;
  for (const stage of motion.stages) {
    const fraction = stage.kind === 'slide' ? drawn : turned;
    if (unfinished && fraction > FINISHED_TOLERANCE) {
      throw new Error('a stage moved before the stage ahead of it finished');
    }
    unfinished ||= fraction < 1 - FINISHED_TOLERANCE;
    clock += stage.share * fraction;
  }
  return clock;
};
