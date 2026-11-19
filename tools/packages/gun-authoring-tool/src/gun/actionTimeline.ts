import { OPEN_STOP, REST_STOP } from '@skelly/construct/assembly/motion.ts';
import type { Motion } from '@skelly/motion/motion';
import { UNLOCKED_STOP } from './actionMotion.ts';
import type { CycleTimeline } from './cycle.ts';

/** One leg of an exported timeline: the parts' clocks run linearly from the stop the leg before ended on, to `to`. */
export interface TimelineLeg {
  readonly to: string;
  readonly seconds: number;
}

const hasStop = (motion: Motion, name: string): boolean => motion.stops.some((stop) => stop.name === name);

/**
 * The legs a timeline takes the parts that follow it through, so a reader plays it by naming stops rather than by
 * knowing which phase turns a bolt and which draws it. A leg to the stop it starts from holds there: a reach before the
 * stroke, or the dwell at the rear. The parts rest once the legs end, until the timeline's duration does. A stop that no
 * leg goes to, such as the SMG handle's notch, is a held state rather than a step of the cycle.
 */
export const cycleLegs = (cycle: CycleTimeline, followers: readonly Motion[]): readonly TimelineLeg[] => {
  const turning = followers.filter((motion) => hasStop(motion, UNLOCKED_STOP));
  if (turning.length !== 0 && turning.length !== followers.length) {
    throw new Error('the parts of one timeline either all turn free before they are drawn, or none do');
  }
  const freed = turning.length === 0 ? REST_STOP : UNLOCKED_STOP;
  if (freed !== REST_STOP && !(cycle.unlockSeconds && cycle.lockSeconds)) {
    throw new Error('a timeline that turns its parts free needs an unlock phase and a lock phase to turn them');
  }
  return [
    ...(cycle.unlockSeconds ? [{ to: freed, seconds: cycle.unlockSeconds }] : []),
    { to: OPEN_STOP, seconds: cycle.rearwardSeconds },
    ...(cycle.dwellSeconds > 0 ? [{ to: OPEN_STOP, seconds: cycle.dwellSeconds }] : []),
    { to: freed, seconds: cycle.forwardSeconds },
    ...(cycle.lockSeconds ? [{ to: REST_STOP, seconds: cycle.lockSeconds }] : []),
  ];
};
