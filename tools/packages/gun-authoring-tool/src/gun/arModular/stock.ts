import type { PartDef, PartFamily, PortDef } from '@skelly/construct/assembly/schema.ts';
import type { ClipPlane, Solid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { box, choice, NEG_X, X, Y } from '../antiMateriel/common.ts';
import { type ArFrame, type ArFrameTable, chosen, familyName, outlineU, pick, u } from './frame.ts';
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
        roundBar('tube', -length, 0, u(buffer.radius)),
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

/** The outside radius of the extension a stock slides onto, by its pick of the buffer that extension takes. */
const tubeRadius = (frame: ArFrame, buffer: ArFrameTable['stock']['buffer']): number => u(pick(frame, buffer).radius);

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
 * The sleeve that wraps the extension from the stock's frame forward, with the detail grain its walls need: they are
 * thinner than the coarse voxel, and every stock is exported at the detail grain.
 */
const stockSleeve = (
  frontX: number,
  bore: number,
  section: readonly [number, number],
  half: number,
): Required<Pick<PartDef, 'solids' | 'tags' | 'features'>> => {
  const [bottom, top] = section;
  return {
    solids: boxSleeve('sleeve', 0, frontX, bore, section, half),
    tags: [VOXEL_DETAIL],
    features: [
      { name: 'sleeve-wall', size: Math.min(top - bore, half - bore, -bore - bottom), disposition: { kind: 'detail' } },
    ],
  };
};

/**
 * The collapsible carbine stock at its traced position on the carbine extension. Its frame is the tube's end: the body's
 * rear block closes behind it, four walls wrap the tube ahead of it with a sliding fit, and the toe hangs under both.
 */
const collapsibleStock = (frame: ArFrame): PartDef => {
  const s = frame.table.stock;
  const [frontX, rearX, topY, bottomY, half] = [u(s.frontX), u(s.rearX), u(s.topY), u(s.bottomY), u(s.halfWidth)];
  const bore = tubeRadius(frame, s.buffer) + u(s.tubeClearance);
  const toeHalf = u(s.toeHalfWidth);
  const sleeve = stockSleeve(frontX, bore, [bottomY, topY], half);
  return {
    family: 'stock',
    solids: [
      box('butt', [rearX, bottomY, -half], [0, topY, half]),
      ...sleeve.solids,
      { id: 'toe', kind: 'extruded-polygon', profile: outlineU(s.toe), z: [-toeHalf, toeHalf] },
    ],
    ports: [stockPort(s.buffer.choice)],
    keepOuts: [],
    axes: [],
    tags: sleeve.tags,
    features: sleeve.features,
  };
};

/**
 * The A2 fixed stock over the whole rifle extension. Its frame is the tube's end: the butt plate closes behind it, the
 * sleeve wraps the tube from there to the lower's tower, as thick under the tube as the comb stands over it, and the
 * body under the sleeve deepens from the tower to the butt's toe. Every piece of the side outline is whole behind the
 * tube's end and only below the sleeve ahead of it, and the tower closes the front.
 */
const a2Stock = (frame: ArFrame): PartDef => {
  const s = frame.table.stockA2;
  const [frontX, combY, half] = [u(s.frontX), u(s.combY), u(s.halfWidth)];
  const bore = tubeRadius(frame, s.buffer) + u(s.tubeClearance);
  const belly = outlineU(s.belly);
  const pieces: [string, Vec2[]][] = [
    ['butt', outlineU(s.butt)],
    ...belly.slice(1).map((front, i): [string, Vec2[]] => {
      const rear = belly[i]!;
      return [`body-${i + 1}`, [rear, front, [front[0], combY], [rear[0], combY]]];
    }),
  ];
  const ahead: ClipPlane[] = [
    { normal: NEG_X, offset: 0 },
    { normal: Y, offset: -combY },
    { normal: X, offset: frontX },
  ];
  const outlineSolids = pieces.flatMap(([id, profile]): Solid[] => {
    const xs = profile.map(([x]) => x);
    const piece = (suffix: string, clip: ClipPlane[]): Solid => ({
      id: `${id}${suffix}`,
      kind: 'extruded-polygon',
      profile,
      z: [-half, half],
      clip,
      display: { bevel: false },
    });
    return [
      ...(Math.min(...xs) < 0 ? [piece('', [{ normal: X, offset: 0 }])] : []),
      ...(Math.max(...xs) > 0 && Math.min(...xs) < frontX ? [piece('-under-sleeve', ahead)] : []),
    ];
  });
  const sleeve = stockSleeve(frontX, bore, [-combY, combY], half);
  return {
    family: 'stock',
    solids: [...outlineSolids, ...sleeve.solids],
    ports: [stockPort(s.buffer.choice)],
    keepOuts: [],
    axes: [],
    tags: sleeve.tags,
    features: sleeve.features,
  };
};

const STOCK_STYLES = { collapsible: collapsibleStock, a2: a2Stock } as const;

/** A stock by its style; each style fits the extension of the buffer its table names. */
export const arStock = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'stock'),
  params: { style: choice(...Object.keys(STOCK_STYLES)) },
  build: (params) => chosen(STOCK_STYLES, params.style)(frame),
});
