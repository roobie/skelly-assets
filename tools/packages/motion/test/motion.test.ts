import { describe, expect, it } from 'vitest';
import {
  IDENTITY_RIGID,
  isStowed,
  type Motion,
  posePoint,
  type Rigid,
  reflection,
  shareStages,
  transformMotion,
  type Vec3,
} from '../src/motion.ts';

const STOPS = [
  { name: 'rest', clock: 0 },
  { name: 'open', clock: 1 },
] as const;

const door = (): Motion => ({
  stops: STOPS,
  stages: [
    { kind: 'hinge', axis: { from: [0.5, 0, 0.2], to: [0.5, 1, 0.2] }, angle: 70, share: 0.6 },
    { kind: 'slide', direction: [0, 1, 0], travel: 0.8, stow: 1.1, share: 0.4 },
  ],
});

const turnedAboutY: Rigid = {
  rotation: [
    [0, 0, 1],
    [0, 1, 0],
    [-1, 0, 0],
  ],
  shift: [0.3, -0.2, 0.9],
};
const place = ({ rotation, shift }: Rigid, [x, y, z]: Vec3, scale = 1): Vec3 =>
  rotation.map((row, i) => (row[0] * x + row[1] * y + row[2] * z) * scale + shift[i]!) as unknown as Vec3;

const expectClose = (actual: Vec3, expected: Vec3) =>
  expected.forEach((value, axis) => expect(actual[axis]).toBeCloseTo(value, 12));

const leaf: Vec3 = [0.1, 0.45, 0.7];

describe('shareStages', () => {
  it('gives each stage the share its distance is of the whole', () => {
    const hull: Vec3[] = [
      [0.5, 0, 1.2],
      [0.5, 1, 1.2],
    ];
    const [hinge, slide] = shareStages(
      [
        { kind: 'hinge', axis: { from: [0.5, 0, 0.2], to: [0.5, 1, 0.2] }, angle: 90 },
        { kind: 'slide', direction: [0, 1, 0], travel: Math.PI / 2 },
      ],
      hull,
    );
    expect(hinge!.share).toBeCloseTo(0.5, 12);
    expect(slide!.share).toBeCloseTo(0.5, 12);
  });

  it('refuses a motion that moves nothing', () => {
    expect(() =>
      shareStages([{ kind: 'hinge', axis: { from: [0, 0, 0], to: [0, 1, 0] }, angle: 30 }], [[0, 0.5, 0]]),
    ).toThrow(/no clock/);
  });
});

describe('transformMotion', () => {
  it('keeps the stops and the shares', () => {
    const moved = transformMotion(door(), turnedAboutY, 2);
    expect(moved.stops).toEqual(STOPS);
    expect(moved.stages.map(({ share }) => share)).toEqual([0.6, 0.4]);
  });

  it.each([
    ['a rotation and a shift', turnedAboutY, 1],
    ['a reflection', reflection(0), 1],
    ['a reflection across z', reflection(2), 1],
    ['a change of unit', IDENTITY_RIGID, 0.0115],
    ['all three', { ...reflection(0), shift: [1, 2, 3] satisfies Vec3 }, 0.5],
  ] as const)('poses the moved part where the moved motion puts it: %s', (_name, rigid, scale) => {
    const moved = transformMotion(door(), rigid, scale);
    for (const clock of [0, 0.3, 0.6, 0.8, 1]) {
      expectClose(
        posePoint(moved, place(rigid, leaf, scale), clock),
        place(rigid, posePoint(door(), leaf, clock), scale),
      );
    }
  });

  it('hides the same points of the moved part', () => {
    const rigid: Rigid = { ...reflection(0), shift: [1, 2, 3] };
    const moved = transformMotion(door(), rigid, 0.5);
    for (const clock of [0, 0.7, 1]) {
      for (const point of [leaf, [0.2, 1.0, 0.4], [0.2, 1.3, 0.4]] as const) {
        expect(isStowed(moved, place(rigid, point, 0.5), clock)).toBe(isStowed(door(), point, clock));
      }
    }
  });

  it('turns a reflected hinge the other way and a rotated one the same way', () => {
    const [mirrored, turned] = [reflection(0), turnedAboutY].map((rigid) => transformMotion(door(), rigid).stages[0]!);
    expect(mirrored).toMatchObject({ angle: -70 });
    expect(turned).toMatchObject({ angle: 70 });
  });
});
