import type { PartDef } from '@skelly/construct/assembly/schema.ts';
import type { Solid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import type { GunPartFamily } from '../actionRoles.ts';
import { X } from '../antiMateriel/common.ts';
import { FIRING_GRIP } from '../firingGrip.ts';
import { SKS_PROPORTIONS as P } from '../sksProportions.ts';
import { inletWood, type StockContour, tracedLine, type WoodInlet, woodCell, woodRegion } from '../stockWood.ts';
import { mountPort } from './joints.ts';

const S = P.stock;
const MERGE_GROUP = 'sks-stock-wood';

type Inlet = (typeof S.inlets)[keyof typeof S.inlets];

/** A metal part's channel through the wood's side profile, wherever a cell reaches into its span. */
const channel = (name: string, inlet: Inlet): WoodInlet => ({
  name,
  halfWidth: inlet.halfWidthU,
  opening: (profile) => {
    const xs = profile.map(([x]) => x);
    const ys = profile.map(([, y]) => y);
    const [rear, front] = inlet.x;
    if (Math.max(...xs) <= rear || Math.min(...xs) >= front) {
      return undefined;
    }
    // An open side reaches past the cell, so the cut runs out through the wood's face.
    const low = 'above' in inlet ? inlet.above : Math.min(...ys) - 1;
    const high = 'below' in inlet ? inlet.below : Math.max(...ys) + 1;
    return [
      [rear, low],
      [front, low],
      [front, high],
      [rear, high],
    ];
  },
});

/**
 * The one-piece wooden stock, from the steel butt plate to the nose under the handguard's band: a raised comb and a
 * straight wrist behind the receiver, and channels for the receiver, the trigger group, the barrel and the folded
 * bayonet's blade. The firing hand takes the wrist.
 */
export const sksStock: GunPartFamily = {
  name: 'sks-stock',
  params: {},
  build(): PartDef {
    const contour: StockContour = {
      top: tracedLine(S.top),
      bottom: tracedLine(S.bottom),
      halfWidth: tracedLine(S.halfWidth),
      segments: 1,
      mergeGroup: MERGE_GROUP,
    };
    const { top, bottom, halfWidth } = contour;
    const { heelX, toeX, plateU } = S.butt;
    // The plate's front face is raked like its back; the wood behind the toe's station is one wedge against it.
    const plateHeelX = heelX + plateU;
    const woodRearX = toeX + plateU;
    const noseX = S.top[S.top.length - 1]![0];
    const stations = [...S.top, ...S.bottom, ...S.halfWidth].map(([x]) => x).filter((x) => x > woodRearX && x < noseX);
    const plate: readonly Vec2[] = [
      [toeX, bottom(toeX)],
      [woodRearX, bottom(woodRearX)],
      [plateHeelX, top(plateHeelX)],
      [heelX, top(heelX)],
    ];
    const wood: Solid[] = [
      ...woodRegion(contour, 'stock', [noseX, woodRearX], stations),
      woodCell(
        { mergeGroup: MERGE_GROUP, id: 'stock-heel', role: 'stock-heel' },
        [
          [woodRearX, bottom(woodRearX)],
          [woodRearX, top(woodRearX)],
          [plateHeelX, top(plateHeelX)],
        ],
        [woodRearX, halfWidth(woodRearX), plateHeelX, halfWidth(plateHeelX)],
      ),
    ];
    const inlets = Object.entries(S.inlets).map(([name, inlet]) => channel(name, inlet));
    return {
      family: 'stock',
      solids: [
        ...inlets.reduce<Solid[]>((solids, inlet) => inletWood(solids, inlet), wood),
        {
          id: 'butt-plate',
          kind: 'extruded-polygon',
          profile: plate,
          z: [-halfWidth(heelX), halfWidth(heelX)],
          slot: 'metal',
        },
      ],
      ports: [mountPort('stock')],
      keepOuts: [],
      axes: [
        { kind: 'cheek', origin: [S.combX, top(S.combX), 0], dir: X },
        { kind: 'firing-grip', origin: S.palm, dir: X },
      ],
      tags: [FIRING_GRIP],
    };
  },
};
