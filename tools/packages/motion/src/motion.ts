// One description of how a part moves, shared by every tool and game that places or plays it. It is a single file with
// no imports, so the showcase can ship it to a browser with its types stripped; see docs/decisions/0015-motion-as-content.md.

export type Vec3 = readonly [number, number, number];

/** Turns `angle` degrees about the line `from` → `to`, signed by the right-hand rule. */
export interface HingeStage {
  readonly kind: 'hinge';
  readonly axis: { readonly from: Vec3; readonly to: Vec3 };
  readonly angle: number;
  readonly share: number;
}

/**
 * Moves `travel` along the unit `direction`. A stowing slide hides what it carries past `stow`, an offset along its
 * direction in the frame just outside it.
 */
export interface SlideStage {
  readonly kind: 'slide';
  readonly direction: Vec3;
  readonly travel: number;
  readonly stow?: number | undefined;
  readonly share: number;
}

export type MotionStage = HingeStage | SlideStage;

/** A named place on the motion's clock, which a game or tool asks for by name. */
export interface Stop {
  readonly name: string;
  readonly clock: number;
}

/**
 * A part's motion from rest to the end of its travel, in one frame and unit: rigid stages run one after another, each
 * through its `share` of the clock, from 0 at rest to 1 at the end of travel. Every stage is given in the part's rest
 * frame, and the first carries the rest. `stops` name places on that clock, in order, the first at 0 and the last at 1.
 */
export interface Motion {
  readonly stages: readonly MotionStage[];
  readonly stops: readonly Stop[];
}

/** A stage as authored, before it is given its share of the clock. */
export type StageMove = {
  [Kind in MotionStage['kind']]: Omit<Extract<MotionStage, { kind: Kind }>, 'share'>;
}[MotionStage['kind']];

/** A rigid change of frame, or a reflection: a point goes to `rotation` times the point, then `shift`. */
export interface Rigid {
  readonly rotation: readonly [Vec3, Vec3, Vec3];
  readonly shift: Vec3;
}

export const IDENTITY_RIGID: Rigid = {
  rotation: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  shift: [0, 0, 0],
};

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Vec3): Vec3 => {
  const size = length(a);
  return [a[0] / size, a[1] / size, a[2] / size];
};

const turned = ({ rotation }: Rigid, v: Vec3): Vec3 => [dot(rotation[0], v), dot(rotation[1], v), dot(rotation[2], v)];

/** Where `rigid` carries a point. */
export const applyRigid = (rigid: Rigid, point: Vec3): Vec3 => add(turned(rigid, point), rigid.shift);

/** `a` after `b`: the change of frame that puts a point through `b` first. */
export const composeRigid = (a: Rigid, b: Rigid): Rigid => {
  const columns = [0, 1, 2].map((j): Vec3 => [b.rotation[0][j]!, b.rotation[1][j]!, b.rotation[2][j]!]);
  const row = (r: Vec3): Vec3 => [dot(r, columns[0]!), dot(r, columns[1]!), dot(r, columns[2]!)];
  return { rotation: [row(a.rotation[0]), row(a.rotation[1]), row(a.rotation[2])], shift: applyRigid(a, b.shift) };
};

/** How far a stage carries the part's furthest point: a slide its travel, a hinge the arc that `hull`'s point furthest from its axis sweeps. */
export const stageDistance = (stage: StageMove, hull: readonly Vec3[]): number => {
  if (stage.kind === 'slide') {
    return stage.travel;
  }
  const u = unit(sub(stage.axis.to, stage.axis.from));
  const radius = Math.max(...hull.map((point) => length(cross(u, sub(point, stage.axis.from)))));
  return (Math.abs(stage.angle) * Math.PI * radius) / 180;
};

/** Why `stops` cannot name places on one clock, if they cannot: every name is its own and the clocks strictly increase. */
export const stopsError = (stops: readonly Stop[]): string | undefined => {
  if (new Set(stops.map(({ name }) => name)).size !== stops.length) {
    return 'two stops of one name';
  }
  return stops.some(({ clock }, i) => i > 0 && clock <= stops[i - 1]!.clock) ? 'clocks must increase' : undefined;
};

/** The clock of the stop `name` of `motion`, which has to have it. */
export const stopClock = ({ stops }: Motion, name: string): number => {
  const stop = stops.find((candidate) => candidate.name === name);
  if (!stop) {
    throw new Error(`the motion has no stop "${name}"; its stops are ${stops.map((s) => s.name).join(', ')}`);
  }
  return stop.clock;
};

/**
 * The stages that run `moves` in order, each through the share of the clock its distance is of theirs together, so the
 * part keeps one pace from rest to the end of travel. `hull` is the corners of the part's rest bounds.
 */
export const shareStages = (moves: readonly StageMove[], hull: readonly Vec3[]): MotionStage[] => {
  const distances = moves.map((move) => stageDistance(move, hull));
  const total = distances.reduce((sum, distance) => sum + distance, 0);
  if (!(total > 0)) {
    throw new Error('the motion moves no point of the part, so it has no clock to share');
  }
  return moves.map((move, i) => ({ ...move, share: distances[i]! / total }));
};

/** How far each stage has moved from rest to its end at `clock`, from 0 to 1: a stage waits for the ones before it. */
const stageFractions = ({ stages }: Motion, clock: number): number[] => {
  let start = 0;
  return stages.map(({ share }) => {
    const fraction = Math.min(1, Math.max(0, (clock - start) / share));
    start += share;
    return fraction;
  });
};

/** What one stage does to the part once it has moved `fraction` of the way from rest to its end. */
export const stagePose = (stage: MotionStage, fraction: number): Rigid => {
  if (stage.kind === 'slide') {
    const step = stage.travel * fraction;
    return {
      rotation: IDENTITY_RIGID.rotation,
      shift: [stage.direction[0] * step, stage.direction[1] * step, stage.direction[2] * step],
    };
  }
  const [ux, uy, uz] = unit(sub(stage.axis.to, stage.axis.from));
  const turn = (stage.angle * fraction * Math.PI) / 180;
  const [c, s, t] = [Math.cos(turn), Math.sin(turn), 1 - Math.cos(turn)];
  const rotation: Rigid['rotation'] = [
    [c + ux * ux * t, ux * uy * t - uz * s, ux * uz * t + uy * s],
    [uy * ux * t + uz * s, c + uy * uy * t, uy * uz * t - ux * s],
    [uz * ux * t - uy * s, uz * uy * t + ux * s, c + uz * uz * t],
  ];
  // The turn is about the axis, so the origin it carries is the axis point's own displacement.
  return { rotation, shift: sub(stage.axis.from, turned({ rotation, shift: IDENTITY_RIGID.shift }, stage.axis.from)) };
};

/**
 * What a motion does to the part at `clock`, from 0 at rest to 1 at the end of travel, as one change of frame. In time,
 * the first stage runs first: each runs linearly through its share of the clock once the stages before it have
 * finished. In space, the first stage is the outermost: every stage is given in the part's rest frame and carries the
 * stages after it. From stage `first` on, the stages outside it are left out.
 */
export const poseAt = (motion: Motion, clock: number, first = 0): Rigid => {
  const fractions = stageFractions(motion, clock);
  return motion.stages
    .slice(first)
    .reduceRight((pose, stage, i) => composeRigid(stagePose(stage, fractions[first + i]!), pose), IDENTITY_RIGID);
};

/** Where a point of the part lies at `clock`, from 0 at rest to 1 at the end of travel. */
export const posePoint = (motion: Motion, point: Vec3, clock = 1): Vec3 => applyRigid(poseAt(motion, clock), point);

/**
 * Whether a stowing slide hides a point of the part at `clock`: the point, carried by the stages inside the slide and
 * then by the slide itself, lies past the slide's `stow` plane, which stays where it is as the slide moves.
 */
export const isStowed = (motion: Motion, point: Vec3, clock = 1): boolean => {
  const fractions = stageFractions(motion, clock);
  let at = point;
  for (let i = motion.stages.length - 1; i >= 0; i--) {
    const stage = motion.stages[i]!;
    at = applyRigid(stagePose(stage, fractions[i]!), at);
    if (stage.kind === 'slide' && stage.stow !== undefined && dot(at, stage.direction) > stage.stow) {
      return true;
    }
  }
  return false;
};

/** The reflection across the plane through the origin that is across `axis`: 0 is x, 1 is y, 2 is z. */
export const reflection = (axis: 0 | 1 | 2): Rigid => ({
  rotation: IDENTITY_RIGID.rotation.map((row, i) =>
    i === axis ? row.map((value) => -value) : row,
  ) as unknown as Rigid['rotation'],
  shift: IDENTITY_RIGID.shift,
});

/** A reflection reverses which way a turn goes; a rotation keeps it. */
const handedness = ({ rotation: [a, b, c] }: Rigid) => (dot(cross(a, b), c) < 0 ? -1 : 1);

/**
 * The same motion in another frame and unit: each point of it is scaled by `scale`, then put through `rigid`. Mirroring a
 * far-side twin, placing a part at its site and carrying authored units into metres are all this one call. A stowing
 * slide's plane goes with the part it hides, so its offset is scaled and moved by how far the shift lies along the
 * slide's new direction.
 */
export const transformMotion = (motion: Motion, rigid: Rigid, scale = 1): Motion => {
  const place = (point: Vec3): Vec3 => applyRigid(rigid, [point[0] * scale, point[1] * scale, point[2] * scale]);
  const sense = handedness(rigid);
  return {
    ...motion,
    stages: motion.stages.map((stage): MotionStage => {
      if (stage.kind === 'hinge') {
        return {
          ...stage,
          axis: { from: place(stage.axis.from), to: place(stage.axis.to) },
          angle: stage.angle * sense,
        };
      }
      const direction = turned(rigid, stage.direction);
      return {
        ...stage,
        direction,
        travel: stage.travel * scale,
        ...(stage.stow === undefined ? {} : { stow: stage.stow * scale + dot(rigid.shift, direction) }),
      };
    }),
  };
};
