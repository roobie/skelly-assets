// @ts-check
// The geometry of the swing check (tools/swingClearance.mjs): how deep a moving piece sinks into another solid while it
// turns or slides, found without testing every sample at every pose. A pose is a rigid motion, so a signed distance
// that is 1-Lipschitz stays so under it, which lets a cell of an octree over the mover be cleared for a whole stretch
// of the clock at once: the cell's centre sets how deep any of its points can lie in the mover and, once its furthest
// possible travel is added, in the other solid. Cells that cannot be cleared are split down to the sample lattice,
// where the depth is read for real. The reason for the rule is in `docs/decisions/0016-swing-check.md`.
/** @import { Point, Pose, StowPlane } from '../site/motionPose.mjs' */
/** @import { AxisIndex, Vec3 } from './packages/construct/src/foundation/math.ts' */
/** @import { Bounds } from './packages/thing-core/src/motion.ts' */
/** @import { HingeStage, Motion } from './packages/motion/src/motion.ts' */
/** @import { Distance, Piece } from './pieceSolid.mjs' */

import { apply, compose, IDENTITY, invert, poseAt, stowPlanesOf } from '../site/motionPose.mjs';
import { AXES, perAxis } from './packages/construct/src/foundation/math.ts';
import { cornersOf } from './packages/thing-core/src/motion.ts';
import { solid } from './pieceSolid.mjs';

/** @typedef {{ readonly id: string; readonly min: Vec3; readonly max: Vec3; readonly distance: Distance }} Shape */
/** @typedef {StowPlane & { readonly pace?: number }} PacedPlane A stow plane with how fast its pose carries a shape. */
/**
 * A stow plane over a window of the clock (`stowsOver`).
 * @typedef {{ readonly from: Pose; readonly to: Pose; readonly direction: Vec3; readonly stow: number; readonly reach: number }} Stow
 */
/**
 * A mover or an obstacle of a sweep: a site's shape and, for an obstacle, the layers that move it.
 * @typedef {{ readonly site: string; readonly shape: Shape; readonly layers?: readonly Motion[] }} SweepEntry
 */
/**
 * What `sweepBody` found an obstacle's site in contact at: the deepest it measured, the clock it first was, and the
 * mover's and the obstacle's pieces at that depth.
 * @typedef {{ depth: number; at: number; pieces: readonly [string, string] }} SweepContact
 */
/** @typedef {{ readonly site: string; readonly pose: Pose; readonly shapes: readonly Shape[]; readonly planes: readonly StowPlane[] }} OpenBody */
/** @typedef {{ sites: readonly [string, string]; depth: number; pieces: readonly [string, string] }} OpenContact */

/**
 * @param {Vec3} point
 * @param {HingeStage['axis']} axis
 */
const distanceFromLine = ([px, py, pz], { from, to }) => {
  /** @type {Vec3} */
  const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  /** @type {Vec3} */
  const r = [px - from[0], py - from[1], pz - from[2]];
  const cross = [d[1] * r[2] - d[2] * r[1], d[2] * r[0] - d[0] * r[2], d[0] * r[1] - d[1] * r[0]];
  return Math.hypot(...cross) / Math.hypot(...d);
};

/**
 * How far (m) one motion can carry any point of a part whose rest corners are `corners`, for each unit of the clock: no
 * further than the greatest of its stages' paces, because the stages run one after another. A stage turns what the
 * stages after it have already moved, so its radius counts how far they can carry a point from the part. `carried` is
 * how far what moves inside this motion has already carried the point. Stages before `first` are left out.
 * @param {Motion} motion
 * @param {readonly Vec3[]} corners
 * @param {number} carried
 */
function pacesOf(motion, corners, carried, first = 0) {
  let pace = 0;
  for (const stage of motion.stages.slice(first).reverse()) {
    const radius =
      stage.kind === 'slide' ? 0 : Math.max(...corners.map((c) => distanceFromLine(c, stage.axis))) + carried;
    const reach = stage.kind === 'slide' ? stage.travel : ((Math.abs(stage.angle) * Math.PI) / 180) * radius;
    pace = Math.max(pace, reach / stage.share);
    carried += stage.kind === 'slide' ? stage.travel : Math.min(reach, 2 * radius);
  }
  return { pace, carried };
}

/**
 * How far (m) a body's `layers` can carry any point of a part whose rest bounds are `bounds`, for each unit of the
 * clock: the paces of its layers add, each counting how far the layers inside it have carried the point. `first` leaves
 * out the outermost layer's stages before that one, as in `poseAt`.
 * @param {readonly Motion[]} layers
 * @param {Bounds} bounds
 */
export function paceOf(layers, bounds, first = 0) {
  const corners = cornersOf(bounds);
  const { total } = layers.reduceRight(
    ({ carried, total }, motion, i) => {
      const inner = pacesOf(motion, corners, carried, i === 0 ? first : 0);
      return { carried: inner.carried, total: total + inner.pace };
    },
    { carried: 0, total: 0 },
  );
  return total;
}

/**
 * The stow planes of one shape over the window of the clock from `start` to `end`: `from` and `to` carry a point of
 * the shape, read in the frame that `frame` carries to the shape's rest, into each plane's frame at the window's ends,
 * and `reach` is how far the plane's pose carries a point of the shape in the window, from the plane's `pace`.
 * @param {readonly PacedPlane[]} planes
 * @param {number} start
 * @param {number} end
 * @param {Pose} [frame]
 * @returns {Stow[]}
 */
const stowsOver = (planes, start, end, frame = IDENTITY) =>
  planes.map(({ layers, first, direction, stow, pace = 0 }) => ({
    from: compose(poseAt(layers, start, first), frame),
    to: compose(poseAt(layers, end, first), frame),
    direction,
    stow,
    reach: pace * (end - start),
  }));

/**
 * How far a point lies on the shown side of the stow planes `stows`, Infinity when nothing stows: read at the window's
 * end with `atEnd`, else the most it can be anywhere in the window. A depth inside a shape is no deeper than this.
 * @param {readonly Stow[]} stows
 * @param {Vec3} point
 * @param {boolean} atEnd
 * @param {Point} out
 */
function shownBy(stows, point, atEnd, out) {
  let shown = Infinity;
  for (const { from, to, direction, stow, reach } of stows) {
    apply(atEnd ? to : from, point, out);
    shown = Math.min(
      shown,
      stow - (out[0] * direction[0] + out[1] * direction[1] + out[2] * direction[2]) + (atEnd ? 0 : reach),
    );
  }
  return shown;
}

/**
 * The signed distance of a piece, a box through a faster path than `solid` gives it.
 * @param {Piece} piece
 * @returns {Distance}
 */
export function distanceOf(piece) {
  if (piece.kind !== 'box') return solid(piece).distance;
  const { min, max } = piece;
  return (p) => Math.max(min[0] - p[0], p[0] - max[0], min[1] - p[1], p[1] - max[1], min[2] - p[2], p[2] - max[2]);
}

/**
 * @param {Piece} piece
 * @returns {Shape}
 */
export const shapeOf = (piece) => {
  const { min, max } = solid(piece);
  return { id: piece.id, min, max, distance: distanceOf(piece) };
};

const SWEPT_CLOCKS = 32;
/**
 * The box that holds a shape's points wherever its layers put them, found at `SWEPT_CLOCKS` clocks and widened by the
 * furthest a point can travel between two of them.
 * @param {Bounds} shape
 * @param {readonly Motion[]} layers
 * @param {number} pace
 * @returns {Bounds}
 */
export function sweptBounds(shape, layers, pace) {
  /** @type {Point} */
  const min = [Infinity, Infinity, Infinity];
  /** @type {Point} */
  const max = [-Infinity, -Infinity, -Infinity];
  const margin = pace / SWEPT_CLOCKS;
  /** @type {Point} */
  const out = [0, 0, 0];
  const corners = cornersOf(shape);
  for (let i = 0; i <= SWEPT_CLOCKS; i++) {
    const pose = poseAt(layers, i / SWEPT_CLOCKS);
    for (const corner of corners) {
      apply(pose, corner, out);
      for (const axis of AXES) {
        min[axis] = Math.min(min[axis], out[axis] - margin);
        max[axis] = Math.max(max[axis], out[axis] + margin);
      }
    }
  }
  return { min, max };
}

/**
 * @param {Bounds} a
 * @param {Bounds} b
 */
export const boundsMeet = (a, b) => AXES.every((i) => a.min[i] < b.max[i] && b.min[i] < a.max[i]);

/**
 * `shape` moved by the rigid motion `pose`, as a shape: its box is that of its moved corners.
 * @param {Shape} shape
 * @param {Pose} pose
 * @returns {Shape}
 */
export function placedShape(shape, pose) {
  const inverse = invert(pose);
  /** @type {Point} */
  const scratch = [0, 0, 0];
  const moved = cornersOf(shape).map((corner) => apply(pose, corner, [0, 0, 0]));
  return {
    id: shape.id,
    min: perAxis((i) => Math.min(...moved.map((c) => c[i]))),
    max: perAxis((i) => Math.max(...moved.map((c) => c[i]))),
    distance: (p) => shape.distance(apply(inverse, p, scratch)),
  };
}

/**
 * A search of `deepestShared` over one window of the clock.
 * @typedef {object} SharedSearch
 * @property {Shape} mover
 * @property {Shape} obstacle
 * @property {Pose} from
 * @property {Pose} to
 * @property {number} reach
 * @property {number} floor
 * @property {number} step
 * @property {readonly Stow[]} [moverStows]
 * @property {readonly Stow[]} [obstacleStows]
 * @property {number} [probeCell]
 */

/**
 * How deep (m) the points of `mover`, moved from the pose `from` to the pose `to`, lie in both it and `obstacle`: the
 * deepest sample of a lattice `step` m across the mover that is inside both, read at `to`, or -Infinity when no cell
 * that could hold a point deeper than `floor` was found. `reach` is the furthest a point travels between the poses.
 * `moverStows` and `obstacleStows` are the stow planes (`stowsOver`) that hide parts of each over the same window, read
 * in the mover's rest frame and in the frame the obstacle is read in. With `probe` it answers only whether any cell
 * could not be cleared, as `true`, and stops at the first such cell it splits down to `probeCell` lattice cells across.
 * @overload
 * @param {SharedSearch & { probe: true }} search
 * @returns {boolean}
 */
/**
 * @overload
 * @param {SharedSearch & { probe?: false }} search
 * @returns {number}
 */
/**
 * @param {SharedSearch & { probe?: boolean }} search
 * @returns {number | boolean}
 */
export function deepestShared({
  mover,
  obstacle,
  from,
  to,
  reach,
  floor,
  step,
  moverStows = [],
  obstacleStows = [],
  probe = false,
  probeCell = 4,
}) {
  const dims = perAxis((i) => Math.max(1, Math.ceil((mover.max[i] - mover.min[i]) / step - 1e-9)));
  /** @type {Point} */
  const centre = [0, 0, 0];
  /** @type {Point} */
  const world = [0, 0, 0];
  /** @type {Point} */
  const scratch = [0, 0, 0];
  let deepest = -Infinity;
  let open = false;
  /**
   * @param {Vec3} lo
   * @param {Vec3} hi
   */
  const visit = (lo, hi) => {
    if (open) return;
    /** @type {Vec3} */
    const size = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
    for (const i of AXES) centre[i] = mover.min[i] + (step * (lo[i] + hi[i])) / 2;
    const radius = (step * Math.hypot(size[0], size[1], size[2])) / 2;
    const inMover = -mover.distance(centre);
    if (Math.min(inMover, shownBy(moverStows, centre, false, scratch)) + radius <= floor) return;
    apply(from, centre, world);
    if (Math.min(-obstacle.distance(world), shownBy(obstacleStows, world, false, scratch)) + radius + reach <= floor)
      return;
    if (size[0] === 1 && size[1] === 1 && size[2] === 1) {
      if (probe) {
        open = true;
        return;
      }
      apply(to, centre, world);
      const inObstacle = Math.min(-obstacle.distance(world), shownBy(obstacleStows, world, true, scratch));
      deepest = Math.max(deepest, Math.min(inMover, shownBy(moverStows, centre, true, scratch), inObstacle));
      return;
    }
    if (probe && Math.max(...size) <= probeCell) {
      open = true;
      return;
    }
    /**
     * @param {AxisIndex} i
     * @returns {(readonly [number, number])[]}
     */
    const halves = (i) =>
      size[i] === 1
        ? [[lo[i], hi[i]]]
        : [
            [lo[i], lo[i] + (size[i] >> 1)],
            [lo[i] + (size[i] >> 1), hi[i]],
          ];
    const [xs, ys, zs] = [halves(0), halves(1), halves(2)];
    for (const [a, b] of xs) {
      for (const [c, d] of ys) {
        for (const [e, f] of zs) visit([a, c, e], [b, d, f]);
      }
    }
  };
  visit([0, 0, 0], dims);
  return probe ? open : deepest;
}

/**
 * The depth (m) two shapes share at rest, 0 when they share none. `moverPlanes` and `obstaclePlanes` are the stow
 * planes of each (`stowPlanesOf`), so the rest depth is measured as the sweep measures.
 * @param {Shape} mover
 * @param {Shape} obstacle
 * @param {number} step
 * @param {readonly StowPlane[]} [moverPlanes]
 * @param {readonly StowPlane[]} [obstaclePlanes]
 */
export const restDepth = (mover, obstacle, step, moverPlanes = [], obstaclePlanes = []) =>
  Math.max(
    0,
    deepestShared({
      mover,
      obstacle,
      from: IDENTITY,
      to: IDENTITY,
      reach: 0,
      floor: 0,
      step,
      moverStows: stowsOver(moverPlanes, 0, 0),
      obstacleStows: stowsOver(obstaclePlanes, 0, 0),
    }),
  );

/**
 * How many leading layers of `layers` are the very motions that lead `other`: what both are carried by.
 * @param {readonly Motion[]} layers
 * @param {readonly Motion[]} other
 */
const sharedLayers = (layers, other) => {
  let shared = 0;
  while (shared < layers.length && layers[shared] === other[shared]) shared++;
  return shared;
};

/** @typedef {{ layers: readonly Motion[]; pace: number; bounds: Bounds }} Beyond */

/**
 * How an entry of a sweep, a mover or an obstacle, moves beyond its first `shared` layers: its pace (`paceOf`) and the
 * box it sweeps (`sweptBounds`), or its rest bounds when nothing beyond moves it. Every pair an entry is in that shares
 * as many layers reads the same, so each is found once: finding them per pair was most of a large vehicle's sweep.
 * Handing every pair the same `layers` also lets the poses read on them be shared.
 */
const motionsBeyond = () => {
  /** @type {Map<SweepEntry, Map<number, Beyond>>} */
  const known = new Map();
  /**
   * @param {SweepEntry} entry
   * @param {readonly Motion[]} layers
   * @param {number} shared
   */
  return (entry, layers, shared) => {
    let byShared = known.get(entry);
    if (byShared === undefined) {
      byShared = new Map();
      known.set(entry, byShared);
    }
    let found = byShared.get(shared);
    if (found === undefined) {
      const beyond = layers.slice(shared);
      const pace = beyond.length > 0 ? paceOf(beyond, entry.shape) : 0;
      const bounds = beyond.length > 0 ? sweptBounds(entry.shape, beyond, pace) : entry.shape;
      found = { layers: beyond, pace, bounds };
      byShared.set(shared, found);
    }
    return found;
  };
};

/**
 * A mover and an obstacle swept against each other, with the layers each moves by beyond what they share.
 * @typedef {object} SweepPair
 * @property {SweepEntry} mover
 * @property {SweepEntry} obstacle
 * @property {readonly Motion[]} own
 * @property {readonly Motion[]} other
 * @property {readonly [PacedPlane[], PacedPlane[]]} stows
 * @property {number} pace
 * @property {number} floor
 */

/**
 * Sweeps the pieces of one moving body (a part and what rides it, moved by its `layers` of motion) from rest to its
 * stop against `obstacles`, the shapes it must clear; an obstacle has the `layers` that move it, none when it stands
 * still. What both are carried by is the same in the layers of each, so it cancels: a pair is swept by the layers
 * beyond them, in the frame of what they share, and a mover that is the carrier of an obstacle is not swept against
 * it, as the obstacle's own sweep is against the mover. A pair is in contact once it shares more than `tolerance`
 * beyond the depth it shares at rest, so what the parts allow each other at rest is not a contact. A window of the
 * clock is measured every `step` of the furthest travel, since a point that travels further than the thinnest part is
 * thick can step across it, and each reading is the depth at the end of its window. What a stowing slide hides
 * (`stowPlanesOf`) is neither mover nor obstacle while it is hidden. `clear` is the last clock at which no pair was
 * measured in contact (1 when none ever was), and `contacts` each obstacle site's contact.
 * @param {{
 *   layers: readonly Motion[];
 *   movers: readonly SweepEntry[];
 *   obstacles: readonly SweepEntry[];
 *   step: number;
 *   tolerance: number;
 * }} sweep
 * @returns {{ clear: number; contacts: Map<string, SweepContact> }}
 */
export function sweepBody({ layers, movers, obstacles, step, tolerance }) {
  /** @type {SweepPair[]} */
  const pairs = [];
  const beyond = motionsBeyond();
  for (const mover of movers) {
    for (const obstacle of obstacles) {
      const shared = sharedLayers(layers, obstacle.layers ?? []);
      if (shared === layers.length) continue;
      const [own, other] = [beyond(mover, layers, shared), beyond(obstacle, obstacle.layers ?? [], shared)];
      if (!boundsMeet(own.bounds, other.bounds)) continue;
      const [moverPlanes, obstaclePlanes] = [stowPlanesOf(layers), stowPlanesOf(obstacle.layers ?? [])];
      const rest = restDepth(mover.shape, obstacle.shape, step, moverPlanes, obstaclePlanes);
      /**
       * @param {readonly StowPlane[]} list
       * @param {Bounds} shape
       */
      const paced = (list, shape) =>
        list.map((plane) => ({ ...plane, pace: paceOf(plane.layers, shape, plane.first) }));
      pairs.push({
        mover,
        obstacle,
        own: own.layers,
        other: other.layers,
        stows: [paced(moverPlanes, mover.shape), paced(obstaclePlanes, obstacle.shape)],
        pace: own.pace + other.pace,
        floor: rest + tolerance,
      });
    }
  }
  /** @type {Map<string, SweepContact>} */
  const contacts = new Map();
  const unit = Math.min(1, step / Math.max(...pairs.map(({ pace }) => pace), step));
  /** @type {Map<readonly Motion[], Map<number, Pose>>} */
  const poses = new Map();
  /**
   * @param {readonly Motion[]} list
   * @param {number} c
   */
  const poseOf = (list, c) => {
    if (list.length === 0) return IDENTITY;
    let known = poses.get(list);
    if (known === undefined) {
      known = new Map();
      poses.set(list, known);
    }
    let pose = known.get(c);
    if (pose === undefined) {
      pose = poseAt(list, c);
      known.set(c, pose);
    }
    return pose;
  };
  /**
   * @param {SweepPair} pair
   * @param {number} c
   */
  const relativeAt = ({ own, other }, c) =>
    other.length === 0 ? poseOf(own, c) : compose(invert(poseOf(other, c)), poseOf(own, c));
  /**
   * @param {SweepPair} pair
   * @param {number} start
   * @param {number} end
   * @returns {SharedSearch}
   */
  const windowOf = (pair, start, end) => ({
    mover: pair.mover.shape,
    obstacle: pair.obstacle.shape,
    from: relativeAt(pair, start),
    to: relativeAt(pair, end),
    reach: pair.pace * (end - start),
    floor: pair.floor,
    step,
    moverStows: stowsOver(pair.stows[0], start, end),
    obstacleStows: stowsOver(pair.stows[1], start, end),
  });
  /**
   * @param {number} start
   * @param {number} end
   */
  const held = (start, end) =>
    pairs.map((pair) => deepestShared({ ...windowOf(pair, start, end), probe: true })).some(Boolean);
  let clear = 1;
  let clock = 0;
  let span = Math.min(1, unit * 8);
  while (clock < 1 - 1e-12) {
    span = Math.min(span, 1 - clock);
    let holding = held(clock, clock + span);
    while (holding && span > unit) {
      span = Math.max(unit, span / 2);
      holding = held(clock, clock + span);
    }
    const end = Math.min(1, clock + span);
    if (!holding) {
      clock = end;
      span *= 2;
      continue;
    }
    const depths = pairs.map((pair) => deepestShared(windowOf(pair, clock, end)));
    for (const [i, { mover, obstacle, floor }] of pairs.entries()) {
      const depth = depths[i];
      if (depth === undefined || !(depth > floor)) continue;
      const seen = contacts.get(obstacle.site);
      if (!seen) {
        if (contacts.size === 0) clear = clock;
        contacts.set(obstacle.site, { depth, at: end, pieces: [mover.shape.id, obstacle.shape.id] });
      } else if (depth > seen.depth) {
        Object.assign(seen, { depth, pieces: [mover.shape.id, obstacle.shape.id] });
      }
    }
    clock = end;
    span = unit;
  }
  return { clear, contacts };
}

/**
 * The pairs of moving bodies that touch once both are at their stops: each body's shapes are a part's pieces at rest
 * and its `planes` its stow planes (`stowPlanesOf`), which hide what is stowed at the stop; a pair is in contact when
 * it shares more than `tolerance` beyond what it shares with both at rest, unless the two are `related`, as a rider
 * and the carrier it is hinged to. The contacts are by `key` of the pair's sites.
 * @template {OpenBody} Body
 * @param {{
 *   bodies: readonly Body[];
 *   step: number;
 *   tolerance: number;
 *   key: (a: string, b: string) => string;
 *   related?: (a: Body, b: Body) => boolean;
 * }} open
 * @returns {Map<string, OpenContact>}
 */
export function sweepOpenPose({ bodies, step, tolerance, key, related = () => false }) {
  /** @type {Map<string, OpenContact>} */
  const found = new Map();
  for (const [i, a] of bodies.entries()) {
    for (const b of bodies.slice(i + 1)) {
      if (related(a, b)) continue;
      const [moverStows, obstacleStows] = [stowsOver(a.planes, 1, 1), stowsOver(b.planes, 1, 1, invert(b.pose))];
      for (const mover of a.shapes) {
        for (const other of b.shapes) {
          const posedOther = placedShape(other, b.pose);
          const moved = placedShape(mover, a.pose);
          if (!boundsMeet(moved, posedOther)) continue;
          const rest = restDepth(mover, other, step, a.planes, b.planes);
          const depth = deepestShared({
            mover,
            obstacle: posedOther,
            from: a.pose,
            to: a.pose,
            reach: 0,
            floor: rest + tolerance,
            step,
            moverStows,
            obstacleStows,
          });
          if (!(depth > rest + tolerance)) continue;
          const pair = key(a.site, b.site);
          if (depth > (found.get(pair)?.depth ?? 0))
            found.set(pair, { sites: [a.site, b.site], depth, pieces: [mover.id, other.id] });
        }
      }
    }
  }
  return found;
}
