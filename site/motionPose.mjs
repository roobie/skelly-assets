// @ts-check
// How the moving parts of a vehicle stand at a point of their clock, shared by the showcase's "Open" view and the swing
// check (tools/swingClearance.mjs), so what the viewer draws open is what the check proved clear. Plain arrays, no
// three.js. A motion is `@skelly/motion`'s `Motion`; a pose is one rigid motion as twelve numbers: a row-major 3x3 turn, then
// the shift. The reason for the model is in docs/decisions/0015-motion-as-content.md.
/** @import { Vec3 } from '../tools/packages/construct/src/foundation/math.ts' */
/** @import { Motion, Rigid } from '../tools/packages/motion/src/motion.ts' */

import {
  IDENTITY_RIGID,
  poseAt as motionPoseAt,
  reflection,
  transformMotion,
} from '../tools/packages/motion/src/motion.ts';
import { MIRRORED_AXIS } from './modelFrame.mjs';

/** @typedef {readonly [number, number, number, number, number, number, number, number, number, number, number, number]} Pose */
/** @typedef {[number, number, number]} Point A point `apply` writes into. */
/**
 * What a stowing slide hides: what it carries past `stow` along `direction`, read in the pose of `layers` from stage
 * `first` of the outermost.
 * @typedef {{ layers: readonly Motion[]; first: number; direction: Vec3; stow: number }} StowPlane
 */

/** @type {Pose} */
export const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];

// The vehicle frame's lateral axis, which a far-side twin is reflected across: the swing check works in the authored
// frame, the showcase in the glTF model frame.
export const AUTHORED_LATERAL = 2;
export const MODEL_LATERAL = MIRRORED_AXIS;

/**
 * @param {Pose} m
 * @param {Vec3} point
 * @param {Point} out
 */
export function apply(m, [x, y, z], out) {
  out[0] = m[0] * x + m[1] * y + m[2] * z + m[9];
  out[1] = m[3] * x + m[4] * y + m[5] * z + m[10];
  out[2] = m[6] * x + m[7] * y + m[8] * z + m[11];
  return out;
}

/**
 * a after b: the pose that puts a point through b first.
 * @param {Pose} a
 * @param {Pose} b
 * @returns {Pose}
 */
export const compose = (a, b) => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
  a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
  a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
  a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
  a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
  a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
  a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
  a[0] * b[9] + a[1] * b[10] + a[2] * b[11] + a[9],
  a[3] * b[9] + a[4] * b[10] + a[5] * b[11] + a[10],
  a[6] * b[9] + a[7] * b[10] + a[8] * b[11] + a[11],
];

/**
 * @param {Pose} m
 * @returns {Pose}
 */
export const invert = (m) => [
  m[0],
  m[3],
  m[6],
  m[1],
  m[4],
  m[7],
  m[2],
  m[5],
  m[8],
  -(m[0] * m[9] + m[3] * m[10] + m[6] * m[11]),
  -(m[1] * m[9] + m[4] * m[10] + m[7] * m[11]),
  -(m[2] * m[9] + m[5] * m[10] + m[8] * m[11]),
];

/**
 * A change of frame as a pose, the one place the showcase and the swing check leave `@skelly/motion`'s `Rigid`.
 * @param {Rigid} rigid
 * @returns {Pose}
 */
const poseOf = ({ rotation: [x, y, z], shift }) => [...x, ...y, ...z, ...shift];

/**
 * Where a body's `layers` have put it at `clock`: its own motion first, then each carrier's, so a rider's motion is
 * nested inside its carrier's and both run on the one clock. The outermost layer, the first, is the furthest carrier;
 * `first` leaves out its stages before that one.
 * @param {readonly Motion[]} layers
 * @param {number} clock
 * @returns {Pose}
 */
export const poseAt = (layers, clock, first = 0) =>
  layers.reduceRight(
    (inner, motion, i) => compose(poseOf(motionPoseAt(motion, clock, i === 0 ? first : 0)), inner),
    IDENTITY,
  );

/**
 * The stow planes of what a body's `layers` move, one for each stowing slide: what the slide and the stages inside it
 * carry past `stow` along its `direction` is hidden, so it neither meets anything nor is met. The plane stays in the
 * frame just outside the slide, so its pose leaves out the layers and stages outside it.
 * @param {readonly Motion[]} layers
 * @returns {StowPlane[]}
 */
export const stowPlanesOf = (layers) =>
  layers.flatMap((motion, k) =>
    motion.stages.flatMap((stage, s) =>
      stage.kind === 'slide' && stage.stow !== undefined
        ? [{ layers: layers.slice(k), first: s, direction: stage.direction, stow: stage.stow }]
        : [],
    ),
  );

/**
 * The planes that hide what a body's `layers` stow at `clock`, as { normal, constant } in the frame the body's pose
 * carries it into: a point `p` there is shown while `normal . p + constant >= 0`.
 * @param {readonly Motion[]} layers
 * @param {number} clock
 */
export function stowClips(layers, clock) {
  const body = invert(poseAt(layers, clock));
  return stowPlanesOf(layers).map(({ layers: outer, first, direction: [dx, dy, dz], stow }) => {
    const m = compose(poseAt(outer, clock, first), body);
    return {
      normal: [
        -(m[0] * dx + m[3] * dy + m[6] * dz),
        -(m[1] * dx + m[4] * dy + m[7] * dz),
        -(m[2] * dx + m[5] * dy + m[8] * dz),
      ],
      constant: stow - (dx * m[9] + dy * m[10] + dz * m[11]),
    };
  });
}

/**
 * A part's motion for the part placed at a site: reflected across the vehicle's centre plane for a far-side twin, as
 * the part itself is, then carried to the site's position. `lateral` is the index of the axis the reflection flips,
 * and is required: the two frames flip different axes, so a default would mirror one of them wrongly without a word.
 * @param {Motion} motion
 * @param {{ at: Vec3; mirror?: boolean | undefined }} site
 * @param {number} lateral
 * @returns {Motion}
 */
export function motionAtSite(motion, { at, mirror }, lateral) {
  if (lateral !== AUTHORED_LATERAL && lateral !== MODEL_LATERAL)
    throw new Error(`motionAtSite: lateral must be AUTHORED_LATERAL or MODEL_LATERAL, not ${lateral}`);
  const across = /** @type {0 | 1 | 2} */ (lateral);
  return transformMotion(motion, { ...(mirror ? reflection(across) : IDENTITY_RIGID), shift: at });
}

/**
 * The motions that move `site`, the outermost carrier's first and its own last: a site's own motion, if it has one,
 * nested in those of the sites it rides, so a rider follows its carrier. `byId` finds a site by what `rides` names,
 * and `motionOf` gives a site's own motion (at its place), or none. A site that rides a moving carrier has the
 * carrier's layers though it does not move on its own.
 * @template {{ rides?: string | undefined }} Site
 * @param {Site} site
 * @param {ReadonlyMap<string, Site>} byId
 * @param {(site: Site) => Motion | null | undefined} motionOf
 * @returns {Motion[]}
 */
export function motionLayers(site, byId, motionOf) {
  /** @type {Site[]} */
  const chain = [];
  /** @type {Site | undefined} */
  let at = site;
  while (at) {
    chain.unshift(at);
    at = at.rides === undefined ? undefined : byId.get(at.rides);
  }
  return chain.map((at) => motionOf(at)).filter((motion) => motion !== null && motion !== undefined);
}

/**
 * The moving sites of a vehicle as the showcase draws it, [{ index, layers }] in site order: a site is { site, model,
 * at, mirror?, rides? } and `motions` maps a model's id to its motion.
 * @param {readonly { site: string; model: string; at: Vec3; mirror?: boolean; rides?: string }[]} sites
 * @param {ReadonlyMap<string, Motion>} motions
 */
export function movingSites(sites, motions) {
  const byId = new Map(sites.map((site) => [site.site, site]));
  /** @param {(typeof sites)[number]} site */
  const motionOf = (site) => {
    const motion = motions.get(site.model);
    return motion ? motionAtSite(motion, { at: site.at, mirror: site.mirror }, MODEL_LATERAL) : null;
  };
  return sites.flatMap((site, index) => {
    const layers = motionLayers(site, byId, motionOf);
    return layers.length > 0 ? [{ index, layers }] : [];
  });
}
