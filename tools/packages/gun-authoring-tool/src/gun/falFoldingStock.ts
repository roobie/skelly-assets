// The FAL Para folding stock, built from its content table. See `models/guns/tables/falFoldingStock.jsonnet` for what
// each measure is.

import type { PartMotion } from '@skelly/construct/assembly/schema.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { check, finite, type InferOutput, minValue, number, parse, pipe, strictObject, tuple } from 'valibot';
import content from '../../../../../models/guns/tables/falFoldingStock.json' with { type: 'json' };
import { EXTENDED_STOP } from './stockStops.ts';

/** The stop of a folding stock where it lies along the receiver's right side. */
export const FOLDED_STOP = 'folded';

const Positive = pipe(number(), finite(), minValue(Number.MIN_VALUE));
const RangeSchema = pipe(
  tuple([pipe(number(), finite()), pipe(number(), finite())]),
  check(([low, high]) => low < high, 'a range must rise from its low end to its high end'),
);
type Range = Readonly<InferOutput<typeof RangeSchema>>;

const FalFoldingStockSchema = strictObject({
  hingeZU: Positive,
  block: strictObject({ depthU: Positive, yU: RangeSchema, halfWidthU: Positive }),
  arm: strictObject({ depthU: Positive, pastPinU: Positive }),
  tube: strictObject({ halfWidthU: Positive, upperYU: RangeSchema, lowerYU: RangeSchema }),
  buttplate: strictObject({ thicknessU: Positive, yU: RangeSchema, halfWidthU: Positive }),
});

/** The folding stock's measures, checked: each is finite and positive, each range rises. */
export const parseFalFoldingStock = (table: unknown) => parse(FalFoldingStockSchema, table);

export const FAL_FOLDING_STOCK = parseFalFoldingStock(content);

const box = (id: string, [x0, x1]: Range, [y0, y1]: Range, [z0, z1]: Range): Solid => ({
  id,
  kind: 'box',
  box: boxFromMinMax([x0, y0, z0], [x1, y1, z1]),
});

/**
 * The stock in the stock frame, whose origin is the receiver's rear face on the bore: a hinge block flush with the face
 * and the arm that carries it out to the pin, two tubes and a buttplate, `length` behind the face.
 */
export const falFoldingStockSolids = (length: number): Solid[] => {
  const { hingeZU, block, arm, tube, buttplate } = FAL_FOLDING_STOCK;
  const blockX: Range = [-block.depthU, 0];
  return [
    box('hinge-block', blockX, block.yU, [-block.halfWidthU, block.halfWidthU]),
    box('hinge-arm', [-arm.depthU, 0], block.yU, [block.halfWidthU, hingeZU + arm.pastPinU]),
    box('tube-upper', [-length, blockX[0]], tube.upperYU, [-tube.halfWidthU, tube.halfWidthU]),
    box('tube-lower', [-length, blockX[0]], tube.lowerYU, [-tube.halfWidthU, tube.halfWidthU]),
    box('buttplate', [-length - buttplate.thicknessU, -length], buttplate.yU, [
      -buttplate.halfWidthU,
      buttplate.halfWidthU,
    ]),
  ];
};

/** The fold: the stock swings half a turn about the hinge pin, from out behind the receiver to along its right side. */
export const falFoldMotion = (): PartMotion => ({
  stages: [
    {
      kind: 'hinge',
      axis: { from: [0, 0, FAL_FOLDING_STOCK.hingeZU], to: [0, 1, FAL_FOLDING_STOCK.hingeZU] },
      angle: 180,
    },
  ],
  stops: [
    { name: EXTENDED_STOP, stage: 0, at: 0 },
    { name: FOLDED_STOP, stage: 0 },
  ],
});
