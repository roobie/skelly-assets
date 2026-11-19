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

import { apply, compose, evenClocks, IDENTITY, invert, poseAt, stowPlanesOf } from '../site/motionPose.mjs';
import { AXES, perAxis } from './packages/construct/src/foundation/math.ts';
import { cornersOf } from './packages/thing-core/src/motion.ts';
import { solid } from './pieceSolid.mjs';

/** @typedef {{ readonly id: string; readonly min: Vec3; readonly max: Vec3; readonly distance: Distance }} Shape */
/** @typedef {StowPlane & { readonly pace?: number }} PacedPlane A stow plane with how fast its pose carries a shape. */
/**
 * A stow plane over a window of the clock (`stowsOver`).
 * @typedef {{ readonly from: Pose; readonly direction: Vec3; readonly stow: number; readonly reach: number }} Stow
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
 * The stow planes of one shape over the window of the clock from `start` to `end`: `from` carries a point of the shape
 * at rest into each plane's frame at the window's start, and `reach` is how far the plane's pose carries a point of the
 * shape in the window, from the plane's `pace`.
 * @param {readonly PacedPlane[]} planes
 * @param {number} start
 * @param {number} end
 * @returns {Stow[]}
 */
const stowsOver = (planes, start, end) =>
  planes.map(({ layers, first, direction, stow, pace = 0 }) => ({
    from: poseAt(layers, evenClocks(layers, start), first),
    direction,
    stow,
    reach: pace * (end - start),
  }));

/**
 * How far a point lies on the shown side of the stow planes `stows`, Infinity when nothing stows: the most it can be
 * anywhere in their window. A depth inside a shape is no deeper than this.
 * @param {readonly Stow[]} stows
 * @param {Vec3} point
 * @param {Point} out
 */
function shownBy(stows, point, out) {
  let shown = Infinity;
  for (const { from, direction, stow, reach } of stows) {
    apply(from, point, out);
    shown = Math.min(shown, stow - (out[0] * direction[0] + out[1] * direction[1] + out[2] * direction[2]) + reach);
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
    const pose = poseAt(layers, evenClocks(layers, i / SWEPT_CLOCKS));
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
 * The box that holds `shape` once the rigid motion `pose` has moved it: that of its moved corners.
 * @param {Bounds} shape
 * @param {Pose} pose
 * @returns {Bounds}
 */
function placedBounds(shape, pose) {
  const moved = cornersOf(shape).map((corner) => apply(pose, corner, [0, 0, 0]));
  return {
    min: perAxis((i) => Math.min(...moved.map((c) => c[i]))),
    max: perAxis((i) => Math.max(...moved.map((c) => c[i]))),
  };
}

/**
 * A search of `deepestOf` over one window of the clock.
 * @typedef {object} DepthSearch
 * @property {Shape} mover
 * @property {Shape} obstacle
 * @property {Pose} from
 * @property {number} reach
 * @property {number} floor
 * @property {number} step
 * @property {readonly Stow[]} [moverStows]
 * @property {readonly Stow[]} [obstacleStows]
 * @property {number} [probeCell]
 */

/**
 * How deep (m) `mover`, at the pose `from`, sinks into `obstacle`: of the points of a lattice at most `step` m apart
 * over the mover, its corners, edges and faces among them, the deepest any lies in the obstacle, or -Infinity when
 * none lies deeper than `floor`. `moverStows` and `obstacleStows` are the stow planes (`stowsOver`) that hide parts of
 * each, read in the mover's rest frame and in the frame the obstacle is read in. With `probe` it answers instead for a
 * window of the clock that starts at `from`, in which a point travels at most `reach` and the stows move as theirs
 * say: only whether any cell could not be cleared, as `true`, stopping at the first such cell it splits down to
 * `probeCell` lattice steps across. Without it, `reach` and the stows' reach are 0.
 * @overload
 * @param {DepthSearch & { probe: true }} search
 * @returns {boolean}
 */
/**
 * @overload
 * @param {DepthSearch & { probe?: false }} search
 * @returns {number}
 */
/**
 * @param {DepthSearch & { probe?: boolean }} search
 * @returns {number | boolean}
 */
function deepestOf({
  mover,
  obstacle,
  from,
  reach,
  floor,
  step,
  moverStows = [],
  obstacleStows = [],
  probe = false,
  probeCell = 4,
}) {
  const dims = perAxis((i) => Math.max(1, Math.ceil((mover.max[i] - mover.min[i]) / step - 1e-9)));
  const spacing = perAxis((i) => (mover.max[i] - mover.min[i]) / dims[i]);
  /** @type {Point} */
  const centre = [0, 0, 0];
  /** @type {Point} */
  const world = [0, 0, 0];
  /** @type {Point} */
  const scratch = [0, 0, 0];
  let deepest = -Infinity;
  let open = false;
  // A point of one solid inside the other must move at least its depth there to leave it, so the deepest such point
  // never reads deeper than the move that parts the two, and a corner, an edge or a face pressed in reads as far as it
  // is pressed: the lattice holds the mover's corners, and the obstacle's are read from its own (`depthAt`).
  // A probe answers for all the space its window sweeps, so each lattice point holds the space half a spacing about it;
  // a measurement reads the lattice points alone, so a single point's bound is its reading. A probe answers for the
  // obstacle's lattice too, so it keeps a cell where a point inside both could lie deep in either.
  const pad = probe ? 1 : 0;
  /**
   * A cell holds the lattice points `lo` to `hi`, and with them the space each point holds.
   * @param {Vec3} lo
   * @param {Vec3} hi
   */
  const visit = (lo, hi) => {
    if (open) return;
    /** @type {Vec3} */
    const size = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
    for (const i of AXES) {
      const t = (lo[i] + hi[i]) / 2 / dims[i];
      centre[i] = mover.min[i] * (1 - t) + mover.max[i] * t;
    }
    const radius =
      Math.hypot((size[0] + pad) * spacing[0], (size[1] + pad) * spacing[1], (size[2] + pad) * spacing[2]) / 2;
    const moverMost = Math.min(-mover.distance(centre), shownBy(moverStows, centre, scratch)) + radius;
    if (moverMost < 0) return;
    apply(from, centre, world);
    const obstacleMost = Math.min(-obstacle.distance(world), shownBy(obstacleStows, world, scratch)) + radius + reach;
    const most = probe ? Math.max(moverMost, obstacleMost) : obstacleMost;
    if (obstacleMost < 0 || most <= Math.max(floor, deepest)) return;
    if (size[0] === 0 && size[1] === 0 && size[2] === 0) {
      if (probe) open = true;
      else deepest = obstacleMost;
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
      size[i] === 0
        ? [[lo[i], hi[i]]]
        : [
            [lo[i], lo[i] + (size[i] >> 1)],
            [lo[i] + (size[i] >> 1) + 1, hi[i]],
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
 * A reading of `depthAt`: two shapes, `pose` carrying the mover's rest frame into the frame the obstacle is read in,
 * and the stow planes (`stowsOver`) that hide parts of each at that pose.
 * @typedef {object} DepthReading
 * @property {Shape} mover
 * @property {Shape} obstacle
 * @property {Pose} pose
 * @property {number} floor
 * @property {number} step
 * @property {readonly Stow[]} moverStows
 * @property {readonly Stow[]} obstacleStows
 */

/**
 * How deep (m) two shapes posed by `pose` sink into each other, read on the lattices of both, or -Infinity when no
 * point lies deeper than `floor`.
 * @param {DepthReading} reading
 */
const depthAt = ({ mover, obstacle, pose, floor, step, moverStows, obstacleStows }) => {
  const back = invert(pose);
  const onMover = deepestOf({
    mover,
    obstacle,
    from: pose,
    reach: 0,
    floor,
    step,
    moverStows,
    obstacleStows,
  });
  // The obstacle's lattice need only find a point deeper than the mover's did.
  const onObstacle = deepestOf({
    mover: obstacle,
    obstacle: mover,
    from: back,
    reach: 0,
    floor: Math.max(floor, onMover),
    step,
    moverStows: obstacleStows,
    obstacleStows: moverStows,
  });
  return Math.max(onMover, onObstacle);
};

/**
 * The depth (m) two shapes sink into each other at rest, 0 when they share no point. `moverPlanes` and
 * `obstaclePlanes` are the stow planes of each (`stowPlanesOf`), so the rest depth is measured as the sweep measures.
 * @param {Shape} mover
 * @param {Shape} obstacle
 * @param {number} step
 * @param {readonly StowPlane[]} [moverPlanes]
 * @param {readonly StowPlane[]} [obstaclePlanes]
 */
export const restDepth = (mover, obstacle, step, moverPlanes = [], obstaclePlanes = []) =>
  Math.max(
    0,
    depthAt({
      mover,
      obstacle,
      pose: IDENTITY,
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
      pose = poseAt(list, evenClocks(list, c));
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
   * @returns {DepthSearch}
   */
  const windowOf = (pair, start, end) => ({
    mover: pair.mover.shape,
    obstacle: pair.obstacle.shape,
    from: relativeAt(pair, start),
    reach: pair.pace * (end - start),
    floor: pair.floor,
    step,
    moverStows: stowsOver(pair.stows[0], start, end),
    obstacleStows: stowsOver(pair.stows[1], start, end),
  });
  // A pair the probe clears over a window can reach no contact in it, nor in any shorter window from the same clock, so
  // only the pairs that hold are probed again or measured.
  /**
   * @param {readonly SweepPair[]} candidates
   * @param {number} start
   * @param {number} end
   */
  const held = (candidates, start, end) =>
    candidates.filter((pair) => deepestOf({ ...windowOf(pair, start, end), probe: true }));
  /**
   * @param {SweepPair} pair
   * @param {number} c
   */
  const depthOf = (pair, c) =>
    depthAt({
      mover: pair.mover.shape,
      obstacle: pair.obstacle.shape,
      pose: relativeAt(pair, c),
      floor: pair.floor,
      step,
      moverStows: stowsOver(pair.stows[0], c, c),
      obstacleStows: stowsOver(pair.stows[1], c, c),
    });
  let clear = 1;
  let clock = 0;
  let span = Math.min(1, unit * 8);
  while (clock < 1 - 1e-12) {
    span = Math.min(span, 1 - clock);
    let holding = held(pairs, clock, clock + span);
    while (holding.length > 0 && span > unit) {
      span = Math.max(unit, span / 2);
      holding = held(holding, clock, clock + span);
    }
    const end = Math.min(1, clock + span);
    if (holding.length === 0) {
      clock = end;
      span *= 2;
      continue;
    }
    for (const pair of holding) {
      const { mover, obstacle, floor } = pair;
      const depth = depthOf(pair, end);
      if (!(depth > floor)) continue;
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
      const [moverStows, obstacleStows] = [stowsOver(a.planes, 1, 1), stowsOver(b.planes, 1, 1)];
      const pose = compose(invert(b.pose), a.pose);
      for (const mover of a.shapes) {
        for (const other of b.shapes) {
          if (!boundsMeet(placedBounds(mover, a.pose), placedBounds(other, b.pose))) continue;
          const rest = restDepth(mover, other, step, a.planes, b.planes);
          const depth = depthAt({
            mover,
            obstacle: other,
            pose,
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
