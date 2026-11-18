// What a species row gives the growth model (grow.ts). Every number that shapes a tree is content, authored in Jsonnet
// beside the woodland kit (models/nature/grown.species.libsonnet), so a new tree or shrub is a new row, never new code.
// Lengths are metres and angles degrees. The model is Palubicki et al. 2009, "Self-organizing tree models for image
// synthesis": the comments name its symbols where a field is one.
import {
  check,
  finite,
  type InferOutput,
  integer,
  literal,
  maxValue,
  minValue,
  nullable,
  number,
  picklist,
  pipe,
  strictObject,
  tuple,
  variant,
} from 'valibot';

const scalar = pipe(number(), finite());
const positive = pipe(scalar, minValue(Number.MIN_VALUE));
const share = pipe(scalar, minValue(0), maxValue(1));
const count = pipe(number(), integer(), minValue(1));
const angle = pipe(scalar, minValue(0), maxValue(180));
const point = tuple([scalar, scalar, scalar]);

/** An ellipsoid a crown or a bush may fill, cut flat at `floor` so a bush can be a dome. */
const Envelope = strictObject({ centre: point, radii: tuple([positive, positive, positive]), floor: scalar });

const Light = variant('model', [
  // Shadow propagation: each bud darkens a pyramid of cells below it by a·b^−q at depth q (1 ≤ q ≤ depth), and a
  // bud's exposure is Q = max(1 − s, 0); light.ts says why its own layer is spared. The cell is one internode across.
  strictObject({
    model: literal('shadow'),
    depth: count,
    a: positive,
    b: pipe(scalar, minValue(1)),
    perception: angle,
  }),
  // Space colonization: `markers` points fill the envelope; a bud deletes those within `occupancy` and claims those
  // within `reach` (both in internodes, ρ and r) inside its perception cone; Q is 1 for a bud that claims any.
  strictObject({
    model: literal('colonize'),
    envelope: Envelope,
    markers: count,
    occupancy: positive,
    reach: positive,
    perception: angle,
  }),
]);

export const SpeciesSchema = strictObject({
  seasons: count,
  /** One metamer's internode length, which is also the light grid's cell. */
  internode: positive,
  /** The most metamers one bud's shoot can add in a season. */
  shootCap: count,
  /** v_base = α·Q_base. */
  alpha: positive,
  /** Borchert-Honda bias: above 0.5 favours the main axis (a leader), below it the laterals (a spreading crown). */
  lambda: share,
  /** Upright axes rising from the ground: one for a tree, several for a shrub, each tilted `spread` off vertical. */
  leaders: strictObject({ count, spread: angle }),
  branching: strictObject({
    /** Between a lateral bud and its parent axis. */
    angle,
    phyllotaxis: picklist(['spiral', 'opposite', 'whorl']),
    /** The turn about the axis from one node to the next for a spiral, ignored otherwise. */
    divergence: angle,
    /** Buds per node of a whorl. */
    whorl: count,
    /** A dormant lateral bud dies after this many seasons. */
    budLife: count,
    /** Lateral buds below this height never break, so a trunk can stand clear like a bole. */
    bole: pipe(scalar, minValue(0)),
  }),
  /** The new metamer's direction is the normalized sum previous + light·V + tropism·up + noise, then `flatten` pulls
   * a lateral toward the horizontal so tiers can form. Tropism is set apart for leaders and laterals, so a birch's
   * leader can climb while its laterals hang. */
  direction: strictObject({
    previous: positive,
    light: scalar,
    tropism: strictObject({ leader: scalar, lateral: scalar }),
    noise: pipe(scalar, minValue(0)),
    flatten: share,
  }),
  light: Light,
  /** A lateral branch is shed when its light per metamer falls under `threshold`, once older than `grace` seasons. */
  shedding: nullable(strictObject({ threshold: share, grace: pipe(number(), integer(), minValue(0)) })),
  /** r^n = Σ r_i^n from `tip` radii; `flare` widens the trunk's foot and `sink` sinks it below ground. */
  pipe: strictObject({
    exponent: pipe(scalar, minValue(1)),
    tip: positive,
    flare: pipe(scalar, minValue(1)),
    sink: pipe(scalar, minValue(0)),
  }),
  bark: strictObject({
    /** Axes thinner than this are left to the foliage instead of drawn as bark. */
    cull: pipe(scalar, minValue(0)),
    /** Consecutive internodes bending less than this are drawn as one straight tube. */
    merge: angle,
  }),
  foliage: strictObject({
    /** Shoots younger than this many seasons bear leaves. */
    age: count,
    /** A clump's radius; leaves within a clump's cell are gathered into one. */
    clump: positive,
    /** A clump's thickness across its facing, as a share of its radius. */
    squash: pipe(
      share,
      check((value) => value > 0, 'a clump needs thickness'),
    ),
    /** How far a clump turns from facing up toward facing out of the crown's ellipsoid. */
    crown: share,
  }),
});

export type Species = InferOutput<typeof SpeciesSchema>;
export type Envelope = InferOutput<typeof Envelope>;
export type LightModel = Species['light'];
