// The geometry of the swing check (tools/swingClearance.mjs): how deep a moving piece sinks into another solid while it
// turns or slides, found without testing every sample at every pose. A pose is a rigid motion, so a signed distance
// that is 1-Lipschitz stays so under it, which lets a cell of an octree over the mover be cleared for a whole stretch
// of the clock at once: the cell's centre sets how deep any of its points can lie in the mover and, once its furthest
// possible travel is added, in the other solid. Cells that cannot be cleared are split down to the sample lattice,
// where the depth is read for real. The reason for the rule is in `docs/decisions/0016-swing-check.md`.
import { cornersOf } from './packages/thing-core/src/motion.ts';
import { solid } from './pieceSolid.mjs';
import { apply, compose, IDENTITY, invert, poseAt, stowPlanesOf } from '../site/motionPose.mjs';

const distanceFromLine = ([px, py, pz], { from, to }) => {
  const d = [0, 1, 2].map((i) => to[i] - from[i]);
  const r = [px - from[0], py - from[1], pz - from[2]];
  const cross = [d[1] * r[2] - d[2] * r[1], d[2] * r[0] - d[0] * r[2], d[0] * r[1] - d[1] * r[0]];
  return Math.hypot(...cross) / Math.hypot(...d);
};

// How far (m) one motion can carry any point of a part whose rest bounds are `bounds`, for each unit of the clock: no
// further than the greatest of its stages' paces, because the stages run one after another. A stage turns what the
// stages after it have already moved, so its radius counts how far they can carry a point from the part. `carried` is
// how far what moves inside this motion has already carried the point. Stages before `first` are left out.
function pacesOf(motion, corners, carried, first = 0) {
  let pace = 0;
  for (let i = motion.length - 1; i >= first; i--) {
    const stage = motion[i];
    const radius = stage.kind === 'slide' ? 0 : Math.max(...corners.map((c) => distanceFromLine(c, stage.axis))) + carried;
    const reach = stage.kind === 'slide' ? stage.travel : (Math.abs(stage.angle) * Math.PI / 180) * radius;
    pace = Math.max(pace, reach / stage.share);
    carried += stage.kind === 'slide' ? stage.travel : Math.min(reach, 2 * radius);
  }
  return { pace, carried };
}

// How far (m) a body's `layers` can carry any point of a part whose rest bounds are `bounds`, for each unit of the
// clock: the paces of its layers add, each counting how far the layers inside it have carried the point. `first` leaves
// out the outermost layer's stages before that one, as in `poseAt`.
export function paceOf(layers, bounds, first = 0) {
  const corners = cornersOf(bounds);
  let carried = 0;
  let total = 0;
  for (let i = layers.length - 1; i >= 0; i--) {
    const inner = pacesOf(layers[i], corners, carried, i === 0 ? first : 0);
    total += inner.pace;
    carried = inner.carried;
  }
  return total;
}

// The stow planes of one shape over the window of the clock from `start` to `end`: `from` and `to` carry a point of
// the shape, read in the frame that `frame` carries to the shape's rest, into each plane's frame at the window's ends,
// and `reach` is how far the plane's pose carries a point of the shape in the window, from the plane's `pace`.
const stowsOver = (planes, start, end, frame = IDENTITY) => planes.map(({ layers, first, direction, stow, pace = 0 }) => ({
  from: compose(poseAt(layers, start, first), frame),
  to: compose(poseAt(layers, end, first), frame),
  direction,
  stow,
  reach: pace * (end - start),
}));

// How far a point lies on the shown side of the stow planes `stows`, Infinity when nothing stows: read at the window's
// end with `atEnd`, else the most it can be anywhere in the window. A depth inside a shape is no deeper than this.
function shownBy(stows, point, atEnd, out) {
  let shown = Infinity;
  for (const { from, to, direction, stow, reach } of stows) {
    apply(atEnd ? to : from, point, out);
    shown = Math.min(shown, stow - (out[0] * direction[0] + out[1] * direction[1] + out[2] * direction[2]) + (atEnd ? 0 : reach));
  }
  return shown;
}

// The signed distance of a piece, a box through a faster path than `solid` gives it.
export function distanceOf(piece) {
  if (piece.kind !== 'box') return solid(piece).distance;
  const { min, max } = piece;
  return (p) => Math.max(min[0] - p[0], p[0] - max[0], min[1] - p[1], p[1] - max[1], min[2] - p[2], p[2] - max[2]);
}

export const shapeOf = (piece) => {
  const { min, max } = solid(piece);
  return { id: piece.id, min, max, distance: distanceOf(piece) };
};

// The box that holds a shape's points wherever its layers put them, found at `SWEPT_CLOCKS` clocks and widened by the
// furthest a point can travel between two of them.
const SWEPT_CLOCKS = 32;
export function sweptBounds(shape, layers, pace) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const margin = pace / SWEPT_CLOCKS;
  const out = [0, 0, 0];
  for (let i = 0; i <= SWEPT_CLOCKS; i++) {
    const pose = poseAt(layers, i / SWEPT_CLOCKS);
    for (const corner of cornersOf(shape)) {
      apply(pose, corner, out);
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], out[axis] - margin);
        max[axis] = Math.max(max[axis], out[axis] + margin);
      }
    }
  }
  return { min, max };
}

export const boundsMeet = (a, b) => [0, 1, 2].every((i) => a.min[i] < b.max[i] && b.min[i] < a.max[i]);

// `shape` moved by the rigid motion `pose`, as a shape: its box is that of its moved corners.
export function placedShape(shape, pose) {
  const inverse = invert(pose);
  const scratch = [0, 0, 0];
  const moved = cornersOf(shape).map((corner) => apply(pose, corner, [0, 0, 0]));
  return {
    id: shape.id,
    min: [0, 1, 2].map((i) => Math.min(...moved.map((c) => c[i]))),
    max: [0, 1, 2].map((i) => Math.max(...moved.map((c) => c[i]))),
    distance: (p) => shape.distance(apply(inverse, p, scratch)),
  };
}

// How deep (m) the points of `mover`, moved from the pose `from` to the pose `to`, lie in both it and `obstacle`: the
// deepest sample of a lattice `step` m across the mover that is inside both, read at `to`, or -Infinity when no cell
// that could hold a point deeper than `floor` was found. `reach` is the furthest a point travels between the poses.
// `moverStows` and `obstacleStows` are the stow planes (`stowsOver`) that hide parts of each over the same window, read
// in the mover's rest frame and in the frame the obstacle is read in. With `probe` it answers only whether any cell
// could not be cleared, as `true`, and stops at the first such cell it splits down to `probeCell` lattice cells across.
export function deepestShared({ mover, obstacle, from, to, reach, floor, step, moverStows = [], obstacleStows = [], probe = false, probeCell = 4 }) {
  const dims = [0, 1, 2].map((i) => Math.max(1, Math.ceil((mover.max[i] - mover.min[i]) / step - 1e-9)));
  const centre = [0, 0, 0];
  const world = [0, 0, 0];
  const scratch = [0, 0, 0];
  let deepest = -Infinity;
  let open = false;
  const visit = (lo, hi) => {
    if (open) return;
    const size = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
    for (let i = 0; i < 3; i++) centre[i] = mover.min[i] + (step * (lo[i] + hi[i])) / 2;
    const radius = (step * Math.hypot(size[0], size[1], size[2])) / 2;
    const inMover = -mover.distance(centre);
    if (Math.min(inMover, shownBy(moverStows, centre, false, scratch)) + radius <= floor) return;
    apply(from, centre, world);
    if (Math.min(-obstacle.distance(world), shownBy(obstacleStows, world, false, scratch)) + radius + reach <= floor) return;
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
    const halves = size.map((n, i) => (n === 1 ? [[lo[i], hi[i]]] : [[lo[i], lo[i] + (n >> 1)], [lo[i] + (n >> 1), hi[i]]]));
    for (const [a, b] of halves[0]) {
      for (const [c, d] of halves[1]) {
        for (const [e, f] of halves[2]) visit([a, c, e], [b, d, f]);
      }
    }
  };
  visit([0, 0, 0], dims);
  return probe ? open : deepest;
}

// The depth (m) two shapes share at rest, 0 when they share none. `moverPlanes` and `obstaclePlanes` are the stow planes
// of each (`stowPlanesOf`), so the rest depth is measured as the sweep measures.
export const restDepth = (mover, obstacle, step, moverPlanes = [], obstaclePlanes = []) => Math.max(0, deepestShared({
  mover, obstacle, from: IDENTITY, to: IDENTITY, reach: 0, floor: 0, step,
  moverStows: stowsOver(moverPlanes, 0, 0), obstacleStows: stowsOver(obstaclePlanes, 0, 0),
}));

// How many leading layers of `layers` are the very motions that lead `other`: what both are carried by.
const sharedLayers = (layers, other) => {
  let shared = 0;
  while (shared < layers.length && layers[shared] === other[shared]) shared++;
  return shared;
};

// Sweeps the pieces of one moving body (a part and what rides it, moved by its `layers` of motion) from rest to its stop
// against `obstacles`, the shapes it must clear. Movers and obstacles are { site, shape }; an obstacle also has the
// `layers` that move it, none when it stands still. What both are carried by is the same in the layers of each, so it
// cancels: a pair is swept by the layers beyond them, in the frame of what they share, and a mover that is the carrier of
// an obstacle is not swept against it, as the obstacle's own sweep is against the mover. A pair is in contact once it
// shares more than `tolerance` beyond the depth it shares at rest, so what the parts allow each other at rest is not a
// contact. A window of the clock is measured every `step` of the furthest travel, since a point that travels further than
// the thinnest part is thick can step across it, and each reading is the depth at the end of its window. What a stowing
// slide hides (`stowPlanesOf`) is neither mover nor obstacle while it is hidden. Returns
// { clear, contacts: Map(obstacle site -> { depth, at, pieces }) }: `clear` the last clock at which no pair was measured
// in contact (1 when none ever was), each contact the deepest the sweep measured and the clock it first was.
export function sweepBody({ layers, movers, obstacles, step, tolerance }) {
  const pairs = [];
  for (const mover of movers) {
    for (const obstacle of obstacles) {
      const shared = sharedLayers(layers, obstacle.layers ?? []);
      const [own, other] = [layers.slice(shared), (obstacle.layers ?? []).slice(shared)];
      if (own.length === 0) continue;
      const paces = [paceOf(own, mover.shape), other.length > 0 ? paceOf(other, obstacle.shape) : 0];
      const bounds = sweptBounds(mover.shape, own, paces[0]);
      if (!boundsMeet(bounds, other.length > 0 ? sweptBounds(obstacle.shape, other, paces[1]) : obstacle.shape)) continue;
      const planes = [stowPlanesOf(layers), stowPlanesOf(obstacle.layers ?? [])];
      const rest = restDepth(mover.shape, obstacle.shape, step, ...planes);
      const paced = (list, shape) => list.map((plane) => ({ ...plane, pace: paceOf(plane.layers, shape, plane.first) }));
      const stows = [paced(planes[0], mover.shape), paced(planes[1], obstacle.shape)];
      pairs.push({ mover, obstacle, own, other, stows, pace: paces[0] + paces[1], floor: rest + tolerance });
    }
  }
  const contacts = new Map();
  const unit = Math.min(1, step / Math.max(...pairs.map(({ pace }) => pace), step));
  const poses = new Map();
  const poseOf = (list, c) => {
    if (list.length === 0) return IDENTITY;
    if (!poses.has(list)) poses.set(list, new Map());
    const known = poses.get(list);
    if (!known.has(c)) known.set(c, poseAt(list, c));
    return known.get(c);
  };
  const relativeAt = ({ own, other }, c) => (other.length === 0 ? poseOf(own, c) : compose(invert(poseOf(other, c)), poseOf(own, c)));
  const across = (start, end, probe) => pairs.map((pair) => deepestShared({
    mover: pair.mover.shape,
    obstacle: pair.obstacle.shape,
    from: relativeAt(pair, start),
    to: relativeAt(pair, end),
    reach: pair.pace * (end - start),
    floor: pair.floor,
    step,
    moverStows: stowsOver(pair.stows[0], start, end),
    obstacleStows: stowsOver(pair.stows[1], start, end),
    probe,
  }));
  let clear = 1;
  let clock = 0;
  let span = Math.min(1, unit * 8);
  while (clock < 1 - 1e-12) {
    span = Math.min(span, 1 - clock);
    let held = across(clock, clock + span, true).some(Boolean);
    while (held && span > unit) {
      span = Math.max(unit, span / 2);
      held = across(clock, clock + span, true).some(Boolean);
    }
    const end = Math.min(1, clock + span);
    if (!held) {
      clock = end;
      span *= 2;
      continue;
    }
    across(clock, end, false).forEach((depth, i) => {
      const { mover, obstacle, floor } = pairs[i];
      if (!(depth > floor)) return;
      const seen = contacts.get(obstacle.site);
      if (!seen) {
        if (contacts.size === 0) clear = clock;
        contacts.set(obstacle.site, { depth, at: end, pieces: [mover.shape.id, obstacle.shape.id] });
      } else if (depth > seen.depth) {
        Object.assign(seen, { depth, pieces: [mover.shape.id, obstacle.shape.id] });
      }
    });
    clock = end;
    span = unit;
  }
  return { clear, contacts };
}

// The pairs of moving bodies that touch once both are at their stops: bodies are { site, pose, shapes, planes }, each
// shape a part's piece at rest and `planes` the body's stow planes (`stowPlanesOf`), which hide what is stowed at the
// stop; a pair is in contact when it shares more than `tolerance` beyond what it shares with both at rest, unless the
// two are `related`, as a rider and the carrier it is hinged to. Returns
// Map(pair key -> { sites, depth, pieces }).
export function sweepOpenPose({ bodies, step, tolerance, key, related = () => false }) {
  const found = new Map();
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const [a, b] = [bodies[i], bodies[j]];
      if (related(a, b)) continue;
      const [moverStows, obstacleStows] = [stowsOver(a.planes, 1, 1), stowsOver(b.planes, 1, 1, invert(b.pose))];
      for (const mover of a.shapes) {
        for (const other of b.shapes) {
          const posedOther = placedShape(other, b.pose);
          const moved = placedShape(mover, a.pose);
          if (!boundsMeet(moved, posedOther)) continue;
          const rest = restDepth(mover, other, step, a.planes, b.planes);
          const depth = deepestShared({
            mover, obstacle: posedOther, from: a.pose, to: a.pose, reach: 0, floor: rest + tolerance, step,
            moverStows, obstacleStows,
          });
          if (!(depth > rest + tolerance)) continue;
          const pair = key(a.site, b.site);
          if (depth > (found.get(pair)?.depth ?? 0)) found.set(pair, { sites: [a.site, b.site], depth, pieces: [mover.id, other.id] });
        }
      }
    }
  }
  return found;
}

