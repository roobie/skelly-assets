// The model frame every asset is authored in, and the directions the pages look from in it. Plain arrays, so the
// rule holds without three.js; see docs/decisions/0002-deadvox-model-frame.md.
export const FORWARD = [1, 0, 0];
export const UP = [0, 1, 0];
export const RIGHT = [0, 0, 1];

const unit = (v) => {
  const length = Math.hypot(...v);
  return v.map((x) => x / length);
};

// A direction from the model toward the camera, weighted along forward, right and up.
const from = (forward, right, up) => unit([0, 1, 2].map((i) => forward * FORWARD[i] + right * RIGHT[i] + up * UP[i]));

// The front three-quarter, from the right: the showcase's default view and the review tile's first.
export const FRONT_QUARTER = from(1.25, 0.85, 0.5);

// The review tile's views. The rear three-quarter mirrors the front through the vertical axis, so the two show both
// sides; the side view is a profile from the right, which is a vehicle's near side.
export const REVIEW_VIEWS = [
  ['front ¾', FRONT_QUARTER],
  ['rear ¾', from(-1.25, -0.85, 0.5)],
  ['side', RIGHT],
  ['top', UP],
];
