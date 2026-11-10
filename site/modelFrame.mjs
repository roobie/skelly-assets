// The model frame every asset file is written in, glTF's, and the directions the pages look from in it. Plain arrays,
// so the rule holds without three.js; see docs/decisions/0002-model-frame.md.
export const FORWARD = [0, 0, 1];
export const UP = [0, 1, 0];
export const RIGHT = [-1, 0, 0];

const unit = (v) => {
  const length = Math.hypot(...v);
  return v.map((x) => x / length);
};

// A direction from the model toward the camera, weighted along forward, right and up.
const from = (forward, right, up) => unit([0, 1, 2].map((i) => forward * FORWARD[i] + right * RIGHT[i] + up * UP[i]));

// The front three-quarter, from the right: the showcase's default view and the review tile's first.
export const FRONT_QUARTER = from(1.25, 0.85, 0.5);

// The views an exploded view looks from: the front three-quarter from either side, as its parts move out toward one.
export const EXPLODED_VIEWS = [
  ['exploded front ¾', FRONT_QUARTER],
  ['exploded front ¾, left', from(1.25, -0.85, 0.5)],
];

// The review tile's views. The rear three-quarter mirrors the front through the vertical axis, so the two show both
// sides; the side view is a profile from the right, which is a vehicle's near side.
export const REVIEW_VIEWS = [
  ['front ¾', FRONT_QUARTER],
  ['rear ¾', from(-1.25, -0.85, 0.5)],
  ['side', RIGHT],
  ['top', UP],
];

// The underside tile's views, for the parts a vehicle carries under its floor and behind it, such as an exhaust run, a
// fuel tank or a stack, which the review views hide under the body: both lower three-quarters, the rear and straight
// up from below.
export const UNDERSIDE_VIEWS = [
  ['below front ¾', from(1.25, 0.85, -0.5)],
  ['below rear ¾', from(-1.25, -0.85, -0.5)],
  ['rear', from(-1, 0, 0)],
  ['below', from(0, 0, -1)],
];

// The straight tile's views, square to the model's axes, for reading a joint's turn against its frame: a roll about a
// bone shows end-on, a swing in a plane shows square to that plane, where a three-quarter view mixes them.
export const STRAIGHT_VIEWS = [
  ['front', FORWARD],
  ['left', from(0, -1, 0)],
  ['right', RIGHT],
  ['top', UP],
];

// The view sets a look can draw a tile from, by the name a review asks for.
export const VIEW_SETS = { review: REVIEW_VIEWS, underside: UNDERSIDE_VIEWS, straight: STRAIGHT_VIEWS };
