import type { PartFeature, PortDef } from '@skelly/construct/assembly/schema.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { box, X, Y } from '../antiMateriel/common.ts';
import { type ArFrameTable, u } from './frame.ts';

/**
 * What a rail stands on: a spine of its own down to `spineBaseY` under its teeth, or its teeth alone, on a part whose top is
 * cut to the slots' depth.
 */
type RailFoot = { readonly spineBaseY: number } | 'teeth-only';

/**
 * A Picatinny top rail of the frame's `rail` along x from `fromX` to `toX` with its top at `topY`: teeth between the
 * cross slots, standing on `foot`. The slots are centred on the run, so its two end teeth share what is left over. Its
 * port is the sight rail every optic mounts on, one slot per cross slot. Its teeth and slots are carried by the detail
 * grain, so the part that carries the rail takes it.
 */
export const picatinnyRail = (
  rail: ArFrameTable['rail'],
  fromX: number,
  toX: number,
  topY: number,
  foot: RailFoot,
): { readonly solids: Solid[]; readonly port: PortDef; readonly features: PartFeature[] } => {
  const pitch = u(rail.pitch);
  const slotWidth = u(rail.slotWidth);
  const halfWidth = u(rail.topWidth) / 2;
  const slotCount = Math.floor((toX - fromX - (pitch - slotWidth)) / pitch);
  const firstSlotX = (fromX + toX - (slotCount - 1) * pitch) / 2;
  const slotEdges = Array.from({ length: slotCount }, (_, index) => {
    const centre = firstSlotX + index * pitch;
    return [centre - slotWidth / 2, centre + slotWidth / 2] as const;
  });
  const toothRuns = [fromX, ...slotEdges.map(([, rear]) => rear)].map(
    (start, index) => [start, slotEdges[index]?.[0] ?? toX] as const,
  );
  const teethY = topY - u(rail.drawnSlotDepth);
  const detail = { kind: 'detail' } as const;
  return {
    solids: [
      ...(foot === 'teeth-only' ? [] : [box('rail', [fromX, foot.spineBaseY, -halfWidth], [toX, teethY, halfWidth])]),
      ...toothRuns.map(([start, end], index) =>
        box(`rail-tooth-${index}`, [start, teethY, -halfWidth], [end, topY, halfWidth]),
      ),
    ],
    port: {
      id: 'rail',
      mount: 'rail-top',
      gender: 'female',
      pos: [firstSlotX, topY, 0],
      normal: Y,
      up: X,
      slots: { count: slotCount, pitch },
    },
    features: [
      { name: 'rail-tooth', size: Math.min(...toothRuns.map(([start, end]) => end - start)), disposition: detail },
      { name: 'rail-slot', size: slotWidth, disposition: detail },
      {
        name: 'rail-slot-depth',
        size: u(rail.slotDepth),
        disposition: { kind: 'exaggerated', reason: 'drawn two detail voxels deep, so every slot cuts evenly' },
      },
    ],
  };
};
