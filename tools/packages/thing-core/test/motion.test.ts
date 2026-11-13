import { dot, sub, type Vec3 } from '@skelly/construct/foundation/math.ts';
import { describe, expect, it } from 'vitest';
import { type AnalyticPiece, hingeSense, mirrorMotion, pinAxis, posePoint, TOWARD } from '../src/motion.ts';
import type { Motion } from '../src/schema.ts';

const grain = 0.03125;
const pin = (id: string, at: Vec3): AnalyticPiece => ({
  id,
  kind: 'turned',
  axis: 'y',
  origin: at,
  profile: [[-grain, 0], [-grain, grain], [grain, grain], [grain, 0]],
});
const box = (id: string, half: Vec3): AnalyticPiece => ({ id, kind: 'box', min: half.map((h) => -h) as unknown as Vec3, max: half });

describe('pin axis', () => {
  it('fails pins that do not lie on the line through the end pins', () => {
    const ends = [pin('a', [0, 0, 0]), pin('c', [0, 1, 0])];
    expect(() => pinAxis([ends[0]!, pin('b', [0, 0.5, grain / 2]), ends[1]!], grain)).not.toThrow();
    expect(() => pinAxis([ends[0]!, pin('b', [0, 0.5, 2 * grain]), ends[1]!], grain)).toThrow(/off the line/);
  });

  it('fails a single box pin with no unique longest side', () => {
    expect(pinAxis([box('long', [0.01, 0.2, 0.01])], grain)).toEqual({ from: [0, -0.2, 0], to: [0, 0.2, 0] });
    expect(() => pinAxis([box('cube', [0.05, 0.05 + grain / 4, 0.05])], grain)).toThrow(/near-cubic/);
  });
});

describe('hinge sense', () => {
  // A door hinged on a vertical line at its front edge, its leaf running rearward.
  const axis = { from: [0, 0, 0], to: [0, 1, 0] } as const;
  const centre: Vec3 = [0, 0.5, -0.5];

  it('takes the sense that swings the centre toward the hint', () => {
    for (const toward of ['out', 'in'] as const) {
      const opened = posePoint({ kind: 'hinge', axis, angle: hingeSense(axis, centre, toward, grain) * 30 }, centre);
      expect(dot(sub(opened, centre), TOWARD[toward]), toward).toBeGreaterThan(0);
    }
  });

  it('fails a hint across the swing, which neither sense moves toward', () => {
    expect(() => hingeSense(axis, centre, 'up', grain)).toThrow(/clearly up/);
  });
});

describe('mirrored motion', () => {
  const reflect = ([x, y, z]: Vec3): Vec3 => [-x, y, z];
  const door: Motion = { kind: 'hinge', axis: { from: [-0.9, 0.4, 1], to: [-0.9, 1.2, 1] }, angle: 65 };
  const leaf: Vec3 = [-0.9, 0.8, 0.2];

  it('poses the far twin at its stop where the reflection of the near part lies', () => {
    const twin = posePoint(mirrorMotion(door), reflect(leaf));
    reflect(posePoint(door, leaf)).forEach((value, axis) => expect(twin[axis]).toBeCloseTo(value, 12));
  });
});
