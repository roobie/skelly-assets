import { describe, expect, it } from 'vitest';
import {
  applyRigid,
  composeRigid,
  IDENTITY_RIGID,
  isStowed,
  type Motion,
  type MotionStage,
  poseAt,
  posePoint,
  type Rigid,
  reflection,
  shareStages,
  stagePose,
  stopClock,
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

describe('a staged motion', () => {
  const [hinge, slide] = door().stages as [MotionStage, MotionStage];
  const alone = (stage: MotionStage): Motion => ({ stops: STOPS, stages: [{ ...stage, share: 1 }] });
  const [outer, inner] = [alone(hinge), alone(slide)];

  it('keeps a stage at rest until the stages before it have finished', () => {
    expectClose(posePoint(door(), leaf, hinge.share / 2), posePoint(outer, leaf, 0.5));
    expectClose(posePoint(door(), leaf, hinge.share), posePoint(outer, leaf));
    expectClose(posePoint(door(), leaf, hinge.share + slide.share / 2), posePoint(outer, posePoint(inner, leaf, 0.5)));
  });

  it('poses a stage as the turn or step it has made so far', () => {
    expectClose(applyRigid(stagePose(hinge, 0.5), leaf), posePoint(outer, leaf, 0.5));
    expectClose(applyRigid(stagePose(slide, 0.5), leaf), posePoint(inner, leaf, 0.5));
    expect(stagePose(slide, 0)).toEqual(IDENTITY_RIGID);
  });

  it('composes the poses so the later one is applied to the point first', () => {
    const [a, b] = [stagePose(hinge, 1), stagePose(slide, 1)];
    expectClose(applyRigid(composeRigid(a, b), leaf), applyRigid(a, applyRigid(b, leaf)));
  });

  it('poses the whole part at a clock, leaving out the stages before `first`', () => {
    for (const clock of [0, 0.3, 0.6, 0.8, 1]) {
      expectClose(applyRigid(poseAt(door(), clock), leaf), posePoint(door(), leaf, clock));
    }
    const innerOnly: Motion = { ...door(), stages: [slide] };
    expectClose(applyRigid(poseAt(door(), 0.8, 1), leaf), posePoint(innerOnly, leaf, 0.8 - hinge.share));
    expect(poseAt(door(), 0.4, 1).shift).toEqual(IDENTITY_RIGID.shift);
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

describe('stopClock', () => {
  it('gives the clock of a stop by its name and refuses a name the motion lacks', () => {
    expect(stopClock(door(), 'open')).toBe(1);
    expect(() => stopClock(door(), 'notched')).toThrow('"notched"');
  });
});
