import { describe, expect, it } from 'vitest';
import { resolveMotion } from '../src/assembly/motion.ts';
import type { PartMotion } from '../src/assembly/schema.ts';
import type { Solid } from '../src/shapes/solid.ts';

const block: Solid = { kind: 'box', id: 'block', box: { center: [0, 0, 0], half: [1, 1, 1] } };
const noSource = (): number => {
  throw new Error('no source');
};

const lift: PartMotion = {
  stages: [
    { kind: 'hinge', axis: { from: [0, 0, 0], to: [1, 0, 0] }, angle: 90 },
    { kind: 'slide', direction: [1, 0, 0], travel: { port: 'mount', keepOut: 'path' } },
  ],
  stops: [{ name: 'unlocked', after: 0 }],
};

describe('resolveMotion', () => {
  it('shares the clock by distance and names the ends of stages as stops', () => {
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

  it('refuses a stop that follows the last stage', () => {
    const motion: PartMotion = { ...lift, stops: [{ name: 'late', after: 1 }] };
    expect(() => resolveMotion(motion, () => 4, [block])).toThrow('late');
  });
});
