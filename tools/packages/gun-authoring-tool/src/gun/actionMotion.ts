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

/** The turn of a bolt part or an SMG handle, if it has one. */
export const hingeOf = (motion: Motion): HingeStage | undefined =>
  motion.stages.find((stage): stage is HingeStage => stage.kind === 'hinge');

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
