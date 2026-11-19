import type { PortDef } from '@skelly/construct/assembly/schema.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { box, X, Y } from '../antiMateriel/common.ts';
import { AR15, u } from './frame.ts';

const PITCH = u(AR15.rail.pitch);
const SLOT_WIDTH = u(AR15.rail.slotWidth);
const SLOT_DEPTH = u(AR15.rail.slotDepth);
const HALF_WIDTH = u(AR15.rail.topWidth) / 2;
const TOOTH = PITCH - SLOT_WIDTH;

/**
 * A Picatinny top rail along x from `fromX` to `toX`, standing on `baseY` with its top at `topY`: a spine with teeth
 * between the cross slots. The slots are centred on the run, so its two end teeth share what is left over. Its port
 * is the sight rail every optic mounts on, one slot per cross slot.
 */
export const picatinnyRail = (
  fromX: number,
  toX: number,
  baseY: number,
  topY: number,
): { readonly solids: Solid[]; readonly port: PortDef } => {
  const slotCount = Math.floor((toX - fromX - TOOTH) / PITCH);
  const firstSlotX = (fromX + toX - (slotCount - 1) * PITCH) / 2;
  const slotEdges = Array.from({ length: slotCount }, (_, index) => {
    const centre = firstSlotX + index * PITCH;
    return [centre - SLOT_WIDTH / 2, centre + SLOT_WIDTH / 2] as const;
  });
  const toothRuns = [fromX, ...slotEdges.map(([, rear]) => rear)].map(
    (start, index) => [start, slotEdges[index]?.[0] ?? toX] as const,
  );
  const teethY = topY - SLOT_DEPTH;
  return {
    solids: [
      box('rail', [fromX, baseY, -HALF_WIDTH], [toX, teethY, HALF_WIDTH]),
      ...toothRuns.map(([start, end], index) =>
        box(`rail-tooth-${index}`, [start, teethY, -HALF_WIDTH], [end, topY, HALF_WIDTH]),
      ),
    ],
    port: {
      id: 'rail',
      mount: 'rail-top',
      gender: 'female',
      pos: [firstSlotX, topY, 0],
      normal: Y,
      up: X,
      slots: { count: slotCount, pitch: PITCH },
    },
  };
};
