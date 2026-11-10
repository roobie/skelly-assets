import type { PartDef } from '@skelly/construct/assembly/schema.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import type { Solid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import {
  array,
  boolean,
  check,
  finite,
  minLength,
  minValue,
  number,
  parse,
  pipe,
  strictObject,
  string,
  tuple,
} from 'valibot';
import content from '../../../../../models/guns/tables/pipeRifle.json' with { type: 'json' };
import { type SectionPocket, subtractAxialPockets } from './receiverSection.ts';

const Finite = pipe(number(), finite());
const Positive = pipe(number(), finite(), minValue(Number.MIN_VALUE));
const Point = tuple([Finite, Finite]);
const Span = pipe(
  tuple([Finite, Finite]),
  check(([min, max]) => min < max),
);
const Board = strictObject({ id: string(), profile: pipe(array(Point), minLength(3)), halfWidthU: Positive });
const Strap = strictObject({ x: Finite, widthU: Positive, housing: boolean() });

const P = parse(
  strictObject({
    stock: strictObject({
      boards: pipe(array(Board), minLength(1)),
      tape: strictObject({ board: string(), wraps: array(Span), thicknessU: Positive }),
      palm: tuple([Finite, Finite, Finite]),
      cheek: tuple([Finite, Finite, Finite]),
    }),
    foreEnd: strictObject({
      bedTopU: Finite,
      board: strictObject({ topU: Finite, bottomU: Finite, frontInsetU: Positive }),
      halfWidthU: Positive,
      straps: array(Strap),
      strapThicknessU: Positive,
      housing: strictObject({ lengthU: Positive, heightU: Positive, depthU: Positive }),
    }),
  }),
  content,
);

const accentBox = (id: string, min: Vec3, max: Vec3): Solid => ({
  id,
  kind: 'box',
  box: boxFromMinMax(min, max),
  slot: 'accent',
});

/** Four flat bands closing a loop round the box section y × ±halfZ, from x over width. */
const bandRing = (
  id: string,
  x: number,
  width: number,
  [bottom, top]: readonly [number, number],
  halfZ: number,
  t: number,
): Solid[] => [
  accentBox(`${id}-top`, [x, top, -halfZ - t], [x + width, top + t, halfZ + t]),
  accentBox(`${id}-bottom`, [x, bottom - t, -halfZ - t], [x + width, bottom, halfZ + t]),
  accentBox(`${id}-far`, [x, bottom, -halfZ - t], [x + width, top, -halfZ]),
  accentBox(`${id}-near`, [x, bottom, halfZ], [x + width, top, halfZ + t]),
];

/** The plank stock's boards and tape wraps, in the stock frame; the boards are furniture so the tang cut finds them. */
export const plankStockSolids = (): Solid[] => {
  const { boards, tape } = P.stock;
  const taped = boards.find(({ id }) => id === tape.board);
  if (!taped) {
    throw new Error(`pipe rifle tape: no board "${tape.board}".`);
  }
  const ys = taped.profile.map(([, y]) => y);
  const span = [Math.min(...ys), Math.max(...ys)] as const;
  return [
    ...boards.map(
      ({ id, profile, halfWidthU }): Solid => ({
        id: `plank-${id}`,
        kind: 'extruded-polygon',
        profile: profile as Vec2[],
        z: [-halfWidthU, halfWidthU],
        slot: 'furniture',
      }),
    ),
    ...tape.wraps.flatMap(([x0, x1], index) =>
      bandRing(`plank-tape-${index}`, x0, x1 - x0, span, taped.halfWidthU, tape.thicknessU),
    ),
  ];
};

/** The plank stock's cheek rest and palm datum, in the stock frame. */
export const plankStockAxes = (): PartDef['axes'] => [
  { kind: 'cheek', origin: P.stock.cheek, dir: [1, 0, 0] },
  { kind: 'firing-grip', origin: P.stock.palm, dir: [1, 0, 0] },
];

interface PlankBed {
  /** The lower's plate under the action, as x and bottom stations. */
  readonly floor: readonly (readonly [x: number, bottom: number])[];
  readonly pockets: readonly SectionPocket[];
}

/** The plank cut down to the action: one cell per floor span, its underside following the plate, clear of the pockets. */
const plankBedSolids = ({ floor, pockets }: PlankBed): Solid[] => {
  const { bedTopU, halfWidthU } = P.foreEnd;
  return floor.slice(1).flatMap(([x1, bottom1], index): Solid[] => {
    const [x0, bottom0] = floor[index]!;
    const slope = (bottom1 - bottom0) / (x1 - x0);
    const cell: Solid = {
      id: `plank-bed-${index}`,
      kind: 'extruded-polygon',
      axis: 'x',
      z: [x0, x1],
      profile: [
        [Math.min(bottom0, bottom1), -halfWidthU],
        [bedTopU, -halfWidthU],
        [bedTopU, halfWidthU],
        [Math.min(bottom0, bottom1), halfWidthU],
      ],
      clip: [{ normal: [slope, -1, 0], offset: -bottom0 + slope * x0 }],
      slot: 'furniture',
      display: { bevel: false },
    };
    return subtractAxialPockets(cell, pockets);
  });
};

/**
 * The plank fore-end in the receiver frame (front face at x = 0): a board under the pipe ending `length` ahead, the
 * straps round pipe and board and, when the action sits on the plank, its `bed`. The board is the `bottom` solid,
 * which the support hand holds.
 */
export const plankForeEndSolids = ({
  length,
  barrelRadius,
  bed,
}: {
  readonly length: number;
  readonly barrelRadius: number;
  readonly bed?: PlankBed;
}): Solid[] => {
  const { board, halfWidthU, straps, strapThicknessU: t, housing } = P.foreEnd;
  const boardEnd = length - board.frontInsetU;
  return [
    ...(bed ? plankBedSolids(bed) : []),
    {
      id: 'bottom',
      kind: 'box',
      box: boxFromMinMax([0, board.bottomU, -halfWidthU], [boardEnd, board.topU, halfWidthU]),
      slot: 'furniture',
    },
    ...straps.flatMap(({ x, widthU, housing: hasHousing }, index) => [
      ...bandRing(`plank-strap-${index}`, x, widthU, [board.bottomU, barrelRadius], halfWidthU, t),
      ...(hasHousing
        ? [
            accentBox(
              `plank-strap-${index}-housing`,
              [x + (widthU - housing.lengthU) / 2, -housing.heightU / 2, halfWidthU + t],
              [x + (widthU + housing.lengthU) / 2, housing.heightU / 2, halfWidthU + t + housing.depthU],
            ),
          ]
        : []),
    ]),
  ];
};
