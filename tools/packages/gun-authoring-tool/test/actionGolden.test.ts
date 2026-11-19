import { poseAt, type Rigid, type Vec3 } from '@skelly/motion/motion';
import { describe, expect, it } from 'vitest';
import { exportFileText } from '../src/cli/exportFile.ts';
import type { TimelineLeg } from '../src/gun/actionTimeline.ts';
import golden from './fixtures/action-before-shared-motion.json' with { type: 'json' };
import { designText } from './helpers.ts';

/*
 * The fixture, captured at 897c2e04, holds each action of the designs that have one as the sidecars carried it before a part's motion was
 * exported whole: an axis, a stroke and a turn per part, and phase seconds per timeline. The tests pose those parts by
 * the math the games then read them with and compare the poses the exported motions give, by their stops, to 1 um.
 */

const SAMPLES = 20;
const TOLERANCE = 1e-6;

interface OldTimeline {
  readonly durationSimSeconds: number;
  readonly rearwardSimSeconds: number;
  readonly dwellSimSeconds: number;
  readonly forwardSimSeconds: number;
  readonly unlockSimSeconds?: number;
  readonly lockSimSeconds?: number;
}
interface OldPart {
  readonly node: string;
  readonly axis: Vec3;
  readonly strokeMetres: number;
  readonly modes: readonly ('fire' | 'hand')[];
  readonly turn?: { readonly pivot: Vec3; readonly axis: Vec3; readonly angleRadians: number };
}
interface OldAction {
  readonly parts: Readonly<Record<string, OldPart>>;
  readonly fire?: OldTimeline;
  readonly hand: OldTimeline;
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** The share of the stroke and of the turn an old timeline gives at `t`, both linear in the phase they run through. */
const oldShares = (timeline: OldTimeline, t: number): { stroke: number; turn: number } => {
  const unlock = timeline.unlockSimSeconds ?? 0;
  const lock = timeline.lockSimSeconds ?? 0;
  const drawn = unlock + timeline.rearwardSimSeconds;
  const held = drawn + timeline.dwellSimSeconds;
  const lockAt = held + timeline.forwardSimSeconds;
  const stroke =
    t < unlock
      ? 0
      : t < drawn
        ? (t - unlock) / timeline.rearwardSimSeconds
        : t < held
          ? 1
          : clamp01(1 - (t - held) / timeline.forwardSimSeconds);
  const turn = Math.min(unlock > 0 ? t / unlock : 1, lock > 0 ? 1 - (t - lockAt) / lock : 1);
  return { stroke, turn: clamp01(turn) };
};

/** An old part at `t` of a timeline: turned about its pivot, then drawn along its axis. */
const oldPose = (part: OldPart, timeline: OldTimeline, t: number): Rigid => {
  const { stroke, turn } = oldShares(timeline, t);
  const travel = part.axis.map((x) => x * part.strokeMetres * stroke) as unknown as Vec3;
  if (!part.turn)
    return {
      rotation: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      shift: travel,
    };
  const { pivot, angleRadians } = part.turn;
  const length = Math.hypot(...part.turn.axis);
  const [x, y, z] = part.turn.axis.map((v) => v / length) as [number, number, number];
  const angle = angleRadians * turn;
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  const rotation = [
    [c + x * x * (1 - c), x * y * (1 - c) - z * s, x * z * (1 - c) + y * s],
    [y * x * (1 - c) + z * s, c + y * y * (1 - c), y * z * (1 - c) - x * s],
    [z * x * (1 - c) - y * s, z * y * (1 - c) + x * s, c + z * z * (1 - c)],
  ] as const;
  const shift = rotation.map(
    (row, i) => pivot[i]! - row[0] * pivot[0] - row[1] * pivot[1] - row[2] * pivot[2] + travel[i]!,
  );
  return { rotation, shift: shift as unknown as Vec3 };
};

/** The clock a timeline of `legs` gives a part with `stops` at `t`: each leg runs it linearly to the stop it names. */
const clockAt = (
  legs: readonly TimelineLeg[],
  stops: readonly { name: string; clock: number }[],
  t: number,
): number => {
  const clockOf = (name: string): number => stops.find((stop) => stop.name === name)!.clock;
  let from = 0;
  let start = 0;
  for (const { to, seconds } of legs) {
    const target = clockOf(to);
    if (t < start + seconds) return from + ((target - from) * (t - start)) / seconds;
    from = target;
    start += seconds;
  }
  return 0;
};

describe('an exported action poses its parts as the old axis, stroke and turn did', () => {
  it.each(Object.entries(golden as unknown as Record<string, OldAction>))('%s', (design, old) => {
    const exported = exportFileText(designText(design), {
      id: design.replaceAll('-', '_'),
      file: `assets/models/${design}.glb`,
    });
    if (!exported.ok) throw new Error(exported.message);
    const action = exported.modelEntry.gun.action!;
    expect(Object.keys(action.parts)).toEqual(Object.keys(old.parts));
    for (const [role, part] of Object.entries(old.parts)) {
      const { motion, modes } = action.parts[role]!;
      expect(modes).toEqual(part.modes);
      for (const mode of part.modes) {
        const timeline = old[mode]!;
        const { legs, durationSimSeconds } = action[mode]!;
        expect(durationSimSeconds).toBeCloseTo(timeline.durationSimSeconds, 9);
        for (let k = 0; k <= SAMPLES; k++) {
          const t = (k / SAMPLES) * timeline.durationSimSeconds;
          const want = oldPose(part, timeline, t);
          const got = poseAt(motion, clockAt(legs, motion.stops, t));
          const label = `${design} ${role} ${mode} t=${t.toFixed(4)}`;
          want.rotation.forEach((row, i) =>
            row.forEach((value, j) =>
              expect(Math.abs(got.rotation[i]![j]! - value), `${label} r${i}${j}`).toBeLessThan(TOLERANCE),
            ),
          );
          want.shift.forEach((value, i) =>
            expect(Math.abs(got.shift[i]! - value), `${label} s${i}`).toBeLessThan(TOLERANCE),
          );
        }
      }
    }
  });
});
