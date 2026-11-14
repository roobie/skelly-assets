// How the moving parts of a vehicle stand at a point of their clock, shared by the showcase's "Open" view and the swing
// check (tools/swingClearance.mjs), so what the viewer draws open is what the check proved clear. Plain arrays, no
// three.js. A motion is thing-core's `Motion`; a pose is one rigid motion as twelve numbers: a row-major 3x3 turn, then
// the shift. The reason for the model is in docs/decisions/0015-motion-as-content.md.

export const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];

// The vehicle frame's lateral axis, which a far-side twin is reflected across: the swing check works in the authored
// frame, the showcase in the glTF model frame.
export const AUTHORED_LATERAL = 2;
export const MODEL_LATERAL = 0;

export function apply(m, [x, y, z], out) {
  out[0] = m[0] * x + m[1] * y + m[2] * z + m[9];
  out[1] = m[3] * x + m[4] * y + m[5] * z + m[10];
  out[2] = m[6] * x + m[7] * y + m[8] * z + m[11];
  return out;
}

// a after b: the pose that puts a point through b first.
export const compose = (a, b) => [
  ...[0, 3, 6].flatMap((row) => [0, 1, 2].map((col) => a[row] * b[col] + a[row + 1] * b[col + 3] + a[row + 2] * b[col + 6])),
  a[0] * b[9] + a[1] * b[10] + a[2] * b[11] + a[9],
  a[3] * b[9] + a[4] * b[10] + a[5] * b[11] + a[10],
  a[6] * b[9] + a[7] * b[10] + a[8] * b[11] + a[11],
];

export const invert = (m) => [
  m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8],
  -(m[0] * m[9] + m[3] * m[10] + m[6] * m[11]),
  -(m[1] * m[9] + m[4] * m[10] + m[7] * m[11]),
  -(m[2] * m[9] + m[5] * m[10] + m[8] * m[11]),
];

// One stage of a motion once it has run `fraction` of its way.
function stageMotion(stage, fraction) {
  if (stage.kind === 'slide') {
    const step = stage.travel * fraction;
    return [1, 0, 0, 0, 1, 0, 0, 0, 1, ...stage.direction.map((d) => d * step)];
  }
  const { from, to } = stage.axis;
  const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const [ux, uy, uz] = [0, 1, 2].map((i) => (to[i] - from[i]) / length);
  const turn = (stage.angle * fraction * Math.PI) / 180;
  const [c, s, t] = [Math.cos(turn), Math.sin(turn), 1 - Math.cos(turn)];
  const turned = [
    c + ux * ux * t, ux * uy * t - uz * s, ux * uz * t + uy * s,
    uy * ux * t + uz * s, c + uy * uy * t, uy * uz * t - ux * s,
    uz * ux * t - uy * s, uz * uy * t + ux * s, c + uz * uz * t,
  ];
  const shift = [0, 1, 2].map((row) => from[row] - (turned[3 * row] * from[0] + turned[3 * row + 1] * from[1] + turned[3 * row + 2] * from[2]));
  return [...turned, ...shift];
}

// Where one motion (thing-core `Motion`) has put its part at `clock`, from 0 at rest to 1 at the stop, as one rigid
// motion. Stages run in turn through their shares of the clock, and the first is the outermost, as `posePoint`. From
// stage `first` on, the stages outside it are left out.
function stagesAt(motion, clock, first = 0) {
  const starts = motion.map((_, i) => motion.slice(0, i).reduce((sum, { share }) => sum + share, 0));
  const fraction = (i) => Math.min(1, Math.max(0, (clock - starts[i]) / motion[i].share));
  let pose = IDENTITY;
  for (let i = motion.length - 1; i >= first; i--) pose = compose(stageMotion(motion[i], fraction(i)), pose);
  return pose;
}

// Where a body's `layers` have put it at `clock`: its own motion first, then each carrier's, so a rider's motion is
// nested inside its carrier's and both run on the one clock. The outermost layer, the first, is the furthest carrier;
// `first` leaves out its stages before that one.
export const poseAt = (layers, clock, first = 0) =>
  layers.reduceRight((inner, motion, i) => compose(stagesAt(motion, clock, i === 0 ? first : 0), inner), IDENTITY);

// The stow planes of what a body's `layers` move, one for each stowing slide: what the slide and the stages inside it
// carry past `stow` along its `direction` is hidden, so it neither meets anything nor is met. The plane stays in the
// frame just outside the slide, so its pose leaves out the layers and stages outside it.
export const stowPlanesOf = (layers) => layers.flatMap((motion, k) => motion.flatMap((stage, s) =>
  stage.kind === 'slide' && stage.stow !== undefined ? [{ layers: layers.slice(k), first: s, direction: stage.direction, stow: stage.stow }] : []));

// The planes that hide what a body's `layers` stow at `clock`, as { normal, constant } in the frame the body's pose
// carries it into: a point `p` there is shown while `normal . p + constant >= 0`.
export function stowClips(layers, clock) {
  const body = invert(poseAt(layers, clock));
  return stowPlanesOf(layers).map(({ layers: outer, first, direction, stow }) => {
    const m = compose(poseAt(outer, clock, first), body);
    return {
      normal: [0, 1, 2].map((col) => -(m[col] * direction[0] + m[3 + col] * direction[1] + m[6 + col] * direction[2])),
      constant: stow - (direction[0] * m[9] + direction[1] * m[10] + direction[2] * m[11]),
    };
  });
}

// A part's motion for the part placed at a site: reflected across the vehicle's centre plane for a far-side twin, as the
// part itself is, then carried to the site's position. `lateral` is the index of the axis the reflection flips, and is
// required: the two frames flip different axes, so a default would mirror one of them wrongly without a word.
export function motionAtSite(motion, { at, mirror }, lateral) {
  if (lateral !== AUTHORED_LATERAL && lateral !== MODEL_LATERAL) throw new Error(`motionAtSite: lateral must be AUTHORED_LATERAL or MODEL_LATERAL, not ${lateral}`);
  const reflect = (point) => point.map((value, axis) => (axis === lateral ? 0 - value : value));
  const shift = (point) => [point[0] + at[0], point[1] + at[1], point[2] + at[2]];
  const along = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return motion.map((stage) => {
    if (stage.kind === 'slide') {
      const direction = mirror ? reflect(stage.direction) : stage.direction;
      return { ...stage, direction, ...(stage.stow === undefined ? {} : { stow: stage.stow + along(at, direction) }) };
    }
    const [from, to] = [stage.axis.from, stage.axis.to].map((point) => shift(mirror ? reflect(point) : point));
    return { ...stage, axis: { from, to }, angle: mirror ? -stage.angle : stage.angle };
  });
}

// The motions that move `site`, the outermost carrier's first and its own last: a site's own motion, if it has one, nested
// in those of the sites it rides, so a rider follows its carrier. `byId` finds a site by what `rides` names, and
// `motionOf` gives a site's own motion (at its place), or null. A site that rides a moving carrier has the carrier's layers
// though it does not move on its own.
export function motionLayers(site, byId, motionOf) {
  const chain = [];
  for (let at = site; at; at = byId.get(at.rides)) chain.unshift(at);
  return chain.map(motionOf).filter(Boolean);
}

// The moving sites of a vehicle as the showcase draws it, [{ index, layers }] in site order: a site is { site, model, at,
// mirror?, rides? } and `motions` maps a model's id to its motion.
export function movingSites(sites, motions) {
  const byId = new Map(sites.map((site) => [site.site, site]));
  const motionOf = (site) => (motions.get(site.model) ? motionAtSite(motions.get(site.model), { at: site.at, mirror: site.mirror }, MODEL_LATERAL) : null);
  return sites.flatMap((site, index) => {
    const layers = motionLayers(site, byId, motionOf);
    return layers.length > 0 ? [{ index, layers }] : [];
  });
}
