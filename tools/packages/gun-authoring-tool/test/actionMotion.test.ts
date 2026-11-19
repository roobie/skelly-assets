import { motionTransform } from '@skelly/construct/assembly/motion.ts';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import { add, applyPoint, cross, dot, normalize, scale, sub, type Vec3 } from '@skelly/construct/foundation/math.ts';
import { describe, expect, it } from 'vitest';
import { resolveGunAction } from '../src/gun/actionDescription.ts';
import { clockOf, hingeOf, slideOf, UNLOCKED_STOP } from '../src/gun/actionMotion.ts';
import { gunDomain } from '../src/gun/domain.ts';
import { loadDesigns } from './helpers.ts';

/** Rodrigues' rotation of a point about the line through `from` along `axis`. */
const turnAbout = (point: Vec3, from: Vec3, axis: Vec3, degrees: number): Vec3 => {
  const radians = (degrees * Math.PI) / 180;
  const unit = normalize(axis);
  const offset = sub(point, from);
  const turned = add(
    add(scale(offset, Math.cos(radians)), scale(cross(unit, offset), Math.sin(radians))),
    scale(unit, dot(unit, offset) * (1 - Math.cos(radians))),
  );
  return add(from, turned);
};

const boltParts = loadDesigns().flatMap(({ label, assembly }) => {
  const resolved = resolve(assembly, gunDomain);
  const action = resolveGunAction(resolved);
  return action
    ? Object.values(action.parts)
        .filter(({ motion }) => hingeOf(motion) && motion.stops.some(({ name }) => name === UNLOCKED_STOP))
        .map((part) => ({ label, action, part }))
    : [];
});

describe('turn-bolt part motion', () => {
  it('is found on the bolt designs', () => {
    expect(boltParts.length).toBeGreaterThan(0);
  });

  it.each(boltParts)(
    'poses $part.id at rest, unlocked and open as a turn about its pivot then a draw: $label',
    ({ part }) => {
      const { motion, placed } = part;
      const hinge = hingeOf(motion)!;
      const slide = slideOf(motion);
      const unlocked = motion.stops.find(({ name }) => name === UNLOCKED_STOP)!.clock;
      const probes: readonly Vec3[] = [
        [0, 0, 0],
        [1, 0, 0],
        [0, 2, -1],
      ];
      const expected = (point: Vec3, degrees: number, travel: number): Vec3 =>
        add(
          turnAbout(point, hinge.axis.from, sub(hinge.axis.to, hinge.axis.from), degrees),
          scale(slide.direction, travel),
        );
      for (const [clock, degrees, travel] of [
        [0, 0, 0],
        [unlocked, hinge.angle, 0],
        [1, hinge.angle, slide.travel],
      ] as const) {
        const transform = motionTransform(placed, motion, clock);
        for (const point of probes) {
          const actual = applyPoint(transform, point);
          const wanted = applyPoint(placed, expected(point, degrees, travel));
          actual.forEach((coordinate, axis) => {
            expect(coordinate, `clock ${clock}`).toBeCloseTo(wanted[axis]!, 9);
          });
        }
      }
    },
  );

  it.each(boltParts)(
    'reaches the unlocked stop exactly when the hand cycle has finished unlocking: $part.id, $label',
    ({ action, part }) => {
      const { hand } = action.cycle;
      const unlocked = part.motion.stops.find(({ name }) => name === UNLOCKED_STOP)!.clock;
      const clock = clockOf(part.motion, hand.at(hand.unlockSeconds!), hand.turnAt!(hand.unlockSeconds!));
      expect(clock).toBeCloseTo(unlocked, 9);
    },
  );

  it('refuses a clock where a stage has moved before the one ahead of it finished', () => {
    const { part } = boltParts[0]!;
    expect(() => clockOf(part.motion, 0.5, 0.5)).toThrow('moved before');
    expect(() => clockOf(part.motion, 0.5, 1)).not.toThrow();
  });
});
