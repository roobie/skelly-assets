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
  string,
  strictObject,
} from 'valibot';
import content from '../../../../../models/guns/tables/roundShapes.json' with { type: 'json' };

const Positive = pipe(number(), finite(), minValue(Number.MIN_VALUE));
const NonNegative = pipe(number(), finite(), minValue(0));

const RoundShapeSchema = strictObject({
  case: strictObject({ baseChamfer: Positive, wall: Positive, firedFloor: Positive }),
  primer: strictObject({
    diameter: Positive,
    pocketDepth: Positive,
    recess: Positive,
    clearance: Positive,
    chamfer: Positive,
  }),
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

export type RoundShape = InferOutput<typeof RoundShapeSchema>;

const shapes = parse(strictObject({ default: RoundShapeSchema, cartridges: record(string(), RoundShapeSchema) }), content);

/** The shape a cartridge's round is drawn with: its own entry, or the default. */
export const roundShape = (cartridgeId: string): RoundShape =>
  Object.hasOwn(shapes.cartridges, cartridgeId) ? shapes.cartridges[cartridgeId]! : shapes.default;
