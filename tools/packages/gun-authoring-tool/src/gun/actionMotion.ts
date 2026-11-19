import type { HingeStage, Motion, SlideStage } from '@skelly/motion/motion';

/** The stop of a turn-bolt part where the bolt has turned free of its lugs, before it is drawn back. */
export const UNLOCKED_STOP = 'unlocked';

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

/** The clock a motion shows when its slide has gone `drawn` of its stroke and its hinge `turned` of its turn. */
export const clockOf = (motion: Motion, drawn: number, turned: number): number =>
  motion.stages.reduce((clock, stage) => clock + stage.share * (stage.kind === 'slide' ? drawn : turned), 0);
