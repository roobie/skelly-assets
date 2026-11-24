// @ts-check
// The model frame every asset file is written in, glTF's, and the directions the pages look from in it. Plain arrays,
// so the rule holds without three.js; see docs/decisions/0002-model-frame.md.
/** @import { Vec3 } from '../tools/packages/construct/src/foundation/math.ts' */
/** @typedef {[name: string, from: Vec3]} View A view's name and the direction from the model toward its camera. */

/** @type {Vec3} */
export const FORWARD = [0, 0, 1];
/** @type {Vec3} */
export const UP = [0, 1, 0];
/** @type {Vec3} */
export const RIGHT = [-1, 0, 0];
// The axis a mirrored site reflects its model across, so a far-side twin stands on the other side of the vehicle.
export const MIRRORED_AXIS = RIGHT.findIndex((x) => x !== 0);

/**
 * @param {Vec3} v
 * @returns {Vec3}
 */
const unit = ([x, y, z]) => {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
};
/**
 * @param {(axis: 0 | 1 | 2) => number} of
 * @returns {Vec3}
 */
const perAxis = (of) => [of(0), of(1), of(2)];

// A direction from the model toward the camera, weighted along forward, right and up.
/**
 * @param {number} forward
 * @param {number} right
 * @param {number} up
 */
const from = (forward, right, up) => unit(perAxis((i) => forward * FORWARD[i] + right * RIGHT[i] + up * UP[i]));

// The front three-quarter, from the right: the showcase's default view and the review tile's first.
export const FRONT_QUARTER = from(1.25, 0.85, 0.5);

// The views an exploded view looks from: the front three-quarter from either side, as its parts move out toward one.
/** @type {View[]} */
export const EXPLODED_VIEWS = [
  ['exploded front ¾', FRONT_QUARTER],
  ['exploded front ¾, left', from(1.25, -0.85, 0.5)],
];

// The review tile's views. The rear three-quarter mirrors the front through the vertical axis, so the two show both
// sides; the side view is a profile from the right, which is a vehicle's near side.
/** @type {View[]} */
export const REVIEW_VIEWS = [
  ['front ¾', FRONT_QUARTER],
  ['rear ¾', from(-1.25, -0.85, 0.5)],
  ['side', RIGHT],
  ['top', UP],
];

// The underside tile's views, for the parts a vehicle carries under its floor and behind it, such as an exhaust run, a
// fuel tank or a stack, which the review views hide under the body: both lower three-quarters, the rear and straight
// up from below.
/** @type {View[]} */
export const UNDERSIDE_VIEWS = [
  ['below front ¾', from(1.25, 0.85, -0.5)],
  ['below rear ¾', from(-1.25, -0.85, -0.5)],
  ['rear', from(-1, 0, 0)],
  ['below', from(0, 0, -1)],
];

// The straight tile's views, square to the model's axes, for reading a joint's turn against its frame: a roll about a
// bone shows end-on, a swing in a plane shows square to that plane, where a three-quarter view mixes them.
/** @type {View[]} */
export const STRAIGHT_VIEWS = [
  ['front', FORWARD],
  ['left', from(0, -1, 0)],
  ['right', RIGHT],
  ['top', UP],
];

// The fit tile's views, for a garment on the doll: straight on from the front and the side, where a hem, a cuff or an
// armhole lies edge-on, the front three-quarter, and from above, where a shoulder or a collar meets the body.
/** @type {View[]} */
export const FIT_VIEWS = [
  ['front', FORWARD],
  ['side', RIGHT],
  ['front ¾', FRONT_QUARTER],
  ['top', UP],
];

// Where the overhead view's sun shines from. That view looks straight down with the front at the bottom of the picture
// and the model's right at its left, so this sun, tilted back and to the right, lights from the picture's upper left,
// the usual convention for a lit picture; tilted only a little off vertical, it lights every top surface while a dome
// or a pack's top still shades across its pixels from lit to dark.
export const OVERHEAD_SUN = from(-0.45, 0.45, 1);

// The view sets a look can draw a tile from, by the name a review asks for.
/** @type {Readonly<Record<string, View[]>>} */
export const VIEW_SETS = { review: REVIEW_VIEWS, underside: UNDERSIDE_VIEWS, straight: STRAIGHT_VIEWS, fit: FIT_VIEWS };
