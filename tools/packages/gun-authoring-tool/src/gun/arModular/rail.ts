import type { PartFeature, PortDef } from '@skelly/construct/assembly/schema.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { box, X, Y } from '../antiMateriel/common.ts';
import { AR15, u } from './frame.ts';

const PITCH = u(AR15.rail.pitch);
const SLOT_WIDTH = u(AR15.rail.slotWidth);
const DRAWN_SLOT_DEPTH = u(AR15.rail.drawnSlotDepth);
const HALF_WIDTH = u(AR15.rail.topWidth) / 2;
const TOOTH = PITCH - SLOT_WIDTH;

/**
 * A Picatinny top rail along x from `fromX` to `toX`, standing on `baseY` with its top at `topY`: a spine with teeth
 * between the cross slots. The slots are centred on the run, so its two end teeth share what is left over. Its port
 * is the sight rail every optic mounts on, one slot per cross slot. Its teeth and slots are carried by the detail
 * grain, so the part that carries the rail takes it.
 */
export const picatinnyRail = (
  fromX: number,
  toX: number,
  baseY: number,
  topY: number,
): { readonly solids: Solid[]; readonly port: PortDef; readonly features: PartFeature[] } => {
  const slotCount = Math.floor((toX - fromX - TOOTH) / PITCH);
  const firstSlotX = (fromX + toX - (slotCount - 1) * PITCH) / 2;
  const slotEdges = Array.from({ length: slotCount }, (_, index) => {
    const centre = firstSlotX + index * PITCH;
    return [centre - SLOT_WIDTH / 2, centre + SLOT_WIDTH / 2] as const;
  });
  const toothRuns = [fromX, ...slotEdges.map(([, rear]) => rear)].map(
    (start, index) => [start, slotEdges[index]?.[0] ?? toX] as const,
  );
  const teethY = topY - DRAWN_SLOT_DEPTH;
  const detail = { kind: 'detail' } as const;
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
    features: [
      { name: 'rail-tooth', size: Math.min(...toothRuns.map(([start, end]) => end - start)), disposition: detail },
      { name: 'rail-slot', size: SLOT_WIDTH, disposition: detail },
      {
        name: 'rail-slot-depth',
        size: u(AR15.rail.slotDepth),
        disposition: { kind: 'exaggerated', reason: 'drawn two detail voxels deep, so every slot cuts evenly' },
      },
    ],
  };
};
