import type { PartDef, PartFamily, PortDef } from '@skelly/construct/assembly/schema.ts';
import type { Vec2 } from '@skelly/construct/shapes/solid.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { box, choice, NEG_X, X, Y } from '../antiMateriel/common.ts';
import { type ArFrame, chosen, familyName, outlineU, u } from './frame.ts';
import { boxSleeve, roundBar } from './shapes.ts';

/** The stock standard of an extension that takes the named buffer. */
const tubeStandard = (buffer: string): string => `ar-tube-${buffer}`;

/**
 * The receiver extension, by the buffer it takes: the buffer tube threaded into the lower's tower, and on the carbine
 * extension the castle nut that locks it. Its frame is the tower's rear face, and it runs back from there on the bore
 * line.
 */
export const arReceiverExtension = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'receiver-extension'),
  params: { buffer: choice(...Object.keys(frame.table.receiverExtension.buffers)) },
  build(params): PartDef {
    const tube = frame.table.receiverExtension;
    const buffer = chosen(tube.buffers, params.buffer);
    const length = u(buffer.length);
    return {
      family: 'receiver-extension',
      solids: [
        roundBar('tube', -length, 0, u(tube.radius)),
        ...(buffer.castleNut
          ? [roundBar('castle-nut', -u(buffer.castleNut.length), 0, u(buffer.castleNut.radius))]
          : []),
      ],
      ports: [
        {
          id: 'lower',
          mount: 'receiver-extension',
          standard: 'ar-tube-thread',
          gender: 'male',
          pos: [0, 0, 0],
          normal: X,
          up: Y,
          required: true,
        },
        {
          id: 'stock',
          mount: 'stock',
          standard: tubeStandard(params.buffer!),
          gender: 'female',
          pos: [-length, 0, 0],
          normal: NEG_X,
          up: Y,
        },
      ],
      keepOuts: [],
      axes: [],
    };
  },
});

/** The port a stock slides onto its extension by, at its frame: the end of the extension. */
const stockPort = (buffer: string): PortDef => ({
  id: 'front',
  mount: 'stock',
  standard: tubeStandard(buffer),
  gender: 'male',
  pos: [0, 0, 0],
  normal: X,
  up: Y,
  required: true,
});

/**
 * The collapsible carbine stock at its traced position on the carbine extension. Its frame is the tube's end: the body's
 * rear block closes behind it, four walls wrap the tube ahead of it with a sliding fit, and the toe hangs under both.
 */
const collapsibleStock = (frame: ArFrame): PartDef => {
  const s = frame.table.stock;
  const [frontX, rearX, topY, bottomY, half] = [u(s.frontX), u(s.rearX), u(s.topY), u(s.bottomY), u(s.halfWidth)];
  const bore = u(frame.table.receiverExtension.radius) + u(s.tubeClearance);
  const toeHalf = u(s.toeHalfWidth);
  return {
    family: 'stock',
    solids: [
      box('butt', [rearX, bottomY, -half], [0, topY, half]),
      ...boxSleeve('sleeve', 0, frontX, bore, [bottomY, topY], half),
      { id: 'toe', kind: 'extruded-polygon', profile: outlineU(s.toe), z: [-toeHalf, toeHalf] },
    ],
    ports: [stockPort(stockBuffer('collapsible'))],
    keepOuts: [],
    axes: [],
    tags: [VOXEL_DETAIL],
    features: [
      {
        name: 'sleeve-wall',
        size: Math.min(topY - bore, half - bore, -bore - bottomY),
        disposition: { kind: 'detail' },
      },
    ],
  };
};

/**
 * The A2 fixed stock over the whole rifle extension. Its frame is the tube's end: the butt plate closes behind it, the
 * sleeve wraps the tube from there to the lower's tower, and the body under the sleeve deepens from the tower to the
 * butt's toe.
 */
const a2Stock = (frame: ArFrame): PartDef => {
  const s = frame.table.stockA2;
  const [frontX, rearX, topY, frontBottomY, toeY, half] = [
    u(s.frontX),
    u(s.rearX),
    u(s.topY),
    u(s.frontBottomY),
    u(s.toeY),
    u(s.halfWidth),
  ];
  const bore = u(frame.table.receiverExtension.radius) + u(frame.table.stock.tubeClearance);
  const belly: Vec2[] = [
    [frontX, frontBottomY],
    [0, frontBottomY],
    [0, toeY],
  ];
  return {
    family: 'stock',
    solids: [
      box('butt', [rearX, toeY, -half], [0, topY, half]),
      ...boxSleeve('sleeve', 0, frontX, bore, [frontBottomY, topY], half),
      { id: 'belly', kind: 'extruded-polygon', profile: belly, z: [-half, half] },
    ],
    ports: [stockPort(stockBuffer('a2'))],
    keepOuts: [],
    axes: [],
  };
};

/** Each stock style, with the buffer of the extension it is made to slide on. */
const STOCK_STYLES = {
  collapsible: { buffer: 'carbine', build: collapsibleStock },
  a2: { buffer: 'rifle', build: a2Stock },
} as const;

/** The buffer of the extension a stock of the named style slides on. */
export const stockBuffer = (style: string): string => chosen(STOCK_STYLES, style).buffer;

/** A stock by its style; each style fits the extension of the buffer it is made for. */
export const arStock = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'stock'),
  params: { style: choice(...Object.keys(STOCK_STYLES)) },
  build: (params) => chosen(STOCK_STYLES, params.style).build(frame),
});
