// The modelling assumptions a metallic round is drawn with, read from their content table. See
// `models/guns/tables/roundShapes.jsonnet` for what each measure is.

import {
  finite,
  type InferOutput,
  integer,
  minValue,
  nullable,
  number,
  parse,
  pipe,
  record,
  strictObject,
  string,
} from 'valibot';
import content from '../../../../../models/guns/tables/roundShapes.json' with { type: 'json' };

const Positive = pipe(number(), finite(), minValue(Number.MIN_VALUE));
const NonNegative = pipe(number(), finite(), minValue(0));

const PrimerShapeSchema = strictObject({
  diameter: Positive,
  pocketDepth: Positive,
  recess: Positive,
  clearance: Positive,
  chamfer: Positive,
  cup: nullable(strictObject({ diameter: Positive, depth: Positive })),
});

const RoundShapeSchema = strictObject({
  case: strictObject({ baseChamfer: Positive, wall: Positive, firedFloor: Positive }),
  primer: PrimerShapeSchema,
  projectile: strictObject({
    seatingCalibres: Positive,
    ogive: strictObject({
      calibres: Positive,
      meplatCalibres: NonNegative,
      segments: pipe(number(), integer(), minValue(2)),
    }),
    band: nullable(strictObject({ diameter: Positive, width: Positive, fromMouth: NonNegative })),
  }),
});

export type PrimerShape = InferOutput<typeof PrimerShapeSchema>;
export type RoundShape = InferOutput<typeof RoundShapeSchema>;

const shapes = parse(
  strictObject({
    default: RoundShapeSchema,
    cartridges: record(string(), RoundShapeSchema),
    shotshellPrimer: nullable(PrimerShapeSchema),
  }),
  content,
);

/** The shape a metallic cartridge's round is drawn with: its own entry, or the default. */
export const roundShape = (cartridgeId: string): RoundShape =>
  Object.hasOwn(shapes.cartridges, cartridgeId) ? shapes.cartridges[cartridgeId]! : shapes.default;

/** The primer every shotshell's head is drawn with, or null to draw the head without one. */
export const SHOTSHELL_PRIMER: PrimerShape | null = shapes.shotshellPrimer;
