import { OPEN_STOP } from '@skelly/construct/assembly/motion.ts';
import type { PartMotion } from '@skelly/construct/assembly/schema.ts';
import { GRID } from '@skelly/construct/foundation/conventions.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';

/** The stop of a folding stock where it lies along the receiver's right side. */
export const FOLDED_STOP = 'folded';

/** The FAL Para stock's hinge: a vertical pin on the right of the receiver's rear face, clear of its side wall. */
const HINGE = { x: 0, z: 2.75 } as const;

/** The gap between the open stock and the receiver's rear face, so that the sweep finds the stock clear there. */
const CLEARANCE = GRID;

type Range = readonly [number, number];

/** The hinge block behind the rear face, the arm that carries it out to the pin, the tubes and the buttplate. */
const BLOCK = { x: [-2.5, -CLEARANCE], y: [-1.75, 1], z: [-1.5, 1.5] } as const;
const ARM = { x: [-1, -CLEARANCE], y: BLOCK.y, z: [BLOCK.z[1], HINGE.z + 0.5] } as const;
const TUBE = { z: [-0.5, 0.5], upperY: [0, 1], lowerY: [-3.5, -2.5] } as const;
const BUTTPLATE = { thickness: 1, y: [-4.5, 1.5], z: [-1.75, 1.75] } as const;

const box = (id: string, [x0, x1]: Range, [y0, y1]: Range, [z0, z1]: Range): Solid => ({
  id,
  kind: 'box',
  box: boxFromMinMax([x0, y0, z0], [x1, y1, z1]),
});

/**
 * The FAL Para stock in the stock frame, whose origin is the receiver's rear face on the bore: a hinge block with its
 * arm, two tubes and a buttplate, `length` behind the face.
 */
export const falFoldingStockSolids = (length: number): Solid[] => [
  box('hinge-block', BLOCK.x, BLOCK.y, BLOCK.z),
  box('hinge-arm', ARM.x, ARM.y, ARM.z),
  box('tube-upper', [-length, BLOCK.x[0]], TUBE.upperY, TUBE.z),
  box('tube-lower', [-length, BLOCK.x[0]], TUBE.lowerY, TUBE.z),
  box('buttplate', [-length - BUTTPLATE.thickness, -length], BUTTPLATE.y, BUTTPLATE.z),
];

/** The fold: the stock swings half a turn about the hinge pin, from open behind the receiver to folded along its side. */
export const falFoldMotion = (): PartMotion => ({
  stages: [
    {
      kind: 'hinge',
      axis: { from: [HINGE.x, 0, HINGE.z], to: [HINGE.x, 1, HINGE.z] },
      angle: 180,
    },
  ],
  stops: [
    { name: OPEN_STOP, stage: 0, at: 0 },
    { name: FOLDED_STOP, stage: 0 },
  ],
});
