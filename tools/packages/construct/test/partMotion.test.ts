import { describe, expect, it } from 'vitest';
import { resolveMotion } from '../src/assembly/motion.ts';
import type { PartMotion, PartStop } from '../src/assembly/schema.ts';
import type { Solid } from '../src/shapes/solid.ts';

const block: Solid = { kind: 'box', id: 'block', box: { center: [0, 0, 0], half: [1, 1, 1] } };
const noSource = (): number => {
  throw new Error('no source');
};

const REST: PartStop = { name: 'rest', stage: 0, at: 0 };

const lift: PartMotion = {
  stages: [
    { kind: 'hinge', axis: { from: [0, 0, 0], to: [1, 0, 0] }, angle: 90 },
    { kind: 'slide', direction: [1, 0, 0], travel: { port: 'mount', keepOut: 'path' } },
  ],
  stops: [REST, { name: 'unlocked', stage: 0 }, { name: 'open', stage: 1 }],
};

describe('resolveMotion', () => {
  it('shares the clock by distance and puts the stops where the stages end', () => {
    const motion = resolveMotion(lift, () => 4, [block]);
    const [turn, slide] = motion.stages;
    expect(turn!.share + slide!.share).toBeCloseTo(1);
    expect(slide!.share).toBeGreaterThan(0.5);
    expect(motion.stops).toEqual([
      { name: 'rest', clock: 0 },
      { name: 'unlocked', clock: turn!.share },
      { name: 'open', clock: 1 },
    ]);
  });

  it('gives a motion that names no stops its rest and its open', () => {
    const { stops } = resolveMotion({ stages: [lift.stages[1]!] }, () => 4, [block]);
    expect(stops).toEqual([
      { name: 'rest', clock: 0 },
      { name: 'open', clock: 1 },
    ]);
  });

  it('puts a stop an offset into a slide, whatever travel the keep-out gives it', () => {
    const motion: PartMotion = {
      stages: [lift.stages[1]!],
      stops: [REST, { name: 'one', stage: 0, at: 1 }, { name: 'three', stage: 0, at: 3 }, { name: 'open', stage: 0 }],
    };
    expect(resolveMotion(motion, () => 4, [block]).stops.map(({ clock }) => clock)).toEqual([0, 0.25, 0.75, 1]);
    expect(resolveMotion(motion, () => 6, [block]).stops.map(({ clock }) => clock)).toEqual([0, 1 / 6, 0.5, 1]);
  });

  it('puts a stop some degrees into a hinge, signed as the hinge turns', () => {
    const fold: PartMotion = {
      stages: [{ kind: 'hinge', axis: { from: [0, 0, 0], to: [0, 1, 0] }, angle: -120 }],
      stops: [REST, { name: 'ajar', stage: 0, at: -30 }, { name: 'folded', stage: 0 }],
    };
    expect(resolveMotion(fold, noSource, [block]).stops.map(({ clock }) => clock)).toEqual([0, 0.25, 1]);
  });

  it('hands a keep-out source the direction the slide goes', () => {
    const asked: unknown[] = [];
    resolveMotion(
      lift,
      (source, direction) => {
        asked.push([source, direction]);
        return 1;
      },
      [block],
    );
    expect(asked).toEqual([[{ port: 'mount', keepOut: 'path' }, [1, 0, 0]]]);
  });

  it('refuses a source that gives no travel', () => {
    expect(() => resolveMotion(lift, noSource, [block])).toThrow('no source');
  });

  it.each([
    ['a stop on a stage the part lacks', [REST, { name: 'late', stage: 2 }], 'late'],
    [
      'a stop further than its stage moves',
      [REST, { name: 'far', stage: 1, at: 5 }, { name: 'open', stage: 1 }],
      'far',
    ],
    ['a stop behind the rest', [REST, { name: 'back', stage: 0, at: -10 }, { name: 'open', stage: 1 }], 'back'],
    ['stops out of order', [REST, { name: 'open', stage: 1 }, { name: 'unlocked', stage: 0 }], 'increase'],
    ['two stops of one name', [REST, { name: 'rest', stage: 0, at: 45 }, { name: 'open', stage: 1 }], 'one name'],
    ['stops that leave the end of travel out', [REST, { name: 'unlocked', stage: 0 }], 'end of travel at 1'],
    [
      'stops that start past the rest',
      [
        { name: 'rest', stage: 0, at: 45 },
        { name: 'open', stage: 1 },
      ],
      'rest',
    ],
  ] as const)('refuses %s', (_name, stops, message) => {
    expect(() => resolveMotion({ ...lift, stops }, () => 4, [block])).toThrow(message);
  });
});
