import type { BoxSolid, ExtrudedPolygonSolid, RevolvedSolid } from '@skelly/construct/shapes/solid.ts';
import {
  array,
  type InferOutput,
  integer,
  number,
  optional,
  parse,
  picklist,
  pipe,
  strictObject,
  string,
  transform,
  tuple,
} from 'valibot';
import { block, cut, dome, oval, ovalCut, region, translate } from './body.ts';
import { jointOrigins, MEASURE_TOLERANCE, positive, requireJointHeights, spheroid } from './shapes.ts';

/**
 * The segments a trunk bending along its spine is cut into: the waist, the ribs and the chest, each cut where its
 * joint stands, and each shoulder girdle, which a clavicle lifts on its own from `clavicleCut`.
 */
const SPINE_SEGMENTS = ['waist', 'ribs', 'chest', 'clavicle_l', 'clavicle_r'] as const;
/** The bust's segments: the head is its own part so a stance can lift it about the neck while the torso leans. */
const BUST_SEGMENTS = ['pelvis', 'torso', 'neck', 'head', ...SPINE_SEGMENTS] as const;

const BustParams = strictObject({
  segment: picklist(BUST_SEGMENTS),
  /**
   * Each segment's joint in the bust's frame; without it every joint lies on the centre line. The ribs' and the
   * chest's joints are where the trunk is cut for a spine that bends in three, and the chest's is the armpit, so the
   * trunk and the shoulders a garment covers are each whole parts.
   */
  origins: optional(jointOrigins(BUST_SEGMENTS)),
  /**
   * The height the clavicles lift the shoulder girdles from, for a bust whose clavicles are parts of their own: a torso
   * given it leaves them the girdle's sides.
   */
  clavicleCut: optional(positive),
  /** How far the neck reaches up into the head; its top is the head's joint. */
  neckOverlap: positive,
  pelvisWidth: positive,
  pelvisDepth: positive,
  pelvisHeight: positive,
  waistWidth: positive,
  waistDepth: positive,
  waistHeight: positive,
  ribWidth: positive,
  ribDepth: positive,
  ribHeight: positive,
  chestWidth: positive,
  chestDepth: positive,
  chestHeight: positive,
  /** How far up the chest the armpit lies, as a share of its height: the trunk region's top. */
  armpit: positive,
  /** The lower chest's width as a share of the chest's, so it stays inside the hanging arm and a sleeveless shell can enclose it. */
  chestLowShare: positive,
  torsoChamfer: positive,
  chestChamfer: positive,
  /**
   * The trapezius' clip planes, one per side, and the left deltoid's centre, plan radius and half height. The centre
   * lies on the trunk's centre line, front to back, unless it gives its `z`.
   */
  girdle: pipe(
    string(),
    transform((text): unknown => JSON.parse(text)),
    strictObject({
      trapezius: array(strictObject({ normal: tuple([number(), number(), number()]), offset: number() })),
      deltoid: strictObject({
        x: number(),
        y: number(),
        z: optional(number(), 0),
        radius: number(),
        halfHeight: number(),
      }),
    }),
  ),
  neckWidth: positive,
  neckHeight: positive,
  headWidth: positive,
  headHeight: positive,
  headDepth: positive,
  jawHeight: positive,
  /** How far up the head the eyes lie, as a share of its height. */
  eyeShare: positive,
  hairCover: positive,
  hairThickness: positive,
  facePower: positive,
  hairSweep: positive,
  hairRise: positive,
  hairCrownShare: positive,
  hairCrownBack: positive,
  hairLayerCount: pipe(positive, integer()),
  hairRing: pipe(
    string(),
    transform((text): unknown => JSON.parse(text)),
    strictObject({ bottom: number(), top: number(), rows: array(tuple([number(), number(), number()])) }),
  ),
});
type Bust = InferOutput<typeof BustParams>;

// The player's head and torso: origin at the pelvis base on the centre line, y up, face toward +z. Stacked rounded
// slabs taper hips to shoulders, the girdle's top slopes off the neck, a deltoid spheroid is centred on each shoulder
// joint, and the head stands on the neck. The girdle's slope and deltoids come drawn by models/girdle.libsonnet as
// `girdle`, which worn shells fit to as well. Every solid stays within the measures a worn shell is fitted to, so the
// shaping here never changes a fit. Head gear straps are fitted to the ring of hair drawn just above the hairline,
// which models/head-band.libsonnet lays out on the head's voxel lattice and passes here as `hairRing`.
// The head segment is drawn about the neck's top, the joint it turns about. The model's anchors name solids here, so
// a joint follows the solid that seats its limb.
export const bust = (params: Readonly<Record<string, string>>): (ExtrudedPolygonSolid | BoxSolid | RevolvedSolid)[] => {
  const d = parse(BustParams, params);
  const heights = levels(d);
  if (d.origins) {
    // The pelvis is the root, and a clavicle turns where its bone does, below the girdle it lifts; the ribs and the
    // chest are cut where their joints stand, so none of those has a height of the measures' to meet.
    requireJointHeights(
      d.origins,
      { torso: heights.waist, waist: heights.waist, neck: heights.shoulders, head: heights.crown + d.neckOverlap },
      'bust',
    );
  }
  const joint = d.origins
    ? d.origins[d.segment]
    : ([0, d.segment === 'head' ? heights.crown + d.neckOverlap : 0, 0] as const);
  if (!joint) {
    throw new Error(`The bust's origins give no joint for its ${d.segment}`);
  }
  // Heights are drawn about the joint as they are laid out, so a segment's own frame needs no second pass for them.
  return translate(drawn(d, joint[1]), [-joint[0], 0, -joint[2]]);
};
const levels = (d: Bust) => {
  const waist = d.pelvisHeight;
  const ribs = waist + d.waistHeight;
  const chest = ribs + d.ribHeight;
  const shoulders = chest + d.chestHeight;
  const crown = shoulders + d.neckHeight;
  return { waist, ribs, chest, shoulders, crown, armpit: chest + d.chestHeight * d.armpit };
};
/** Where the clavicles lift the shoulder girdles: above the armpit, which the trunk ends at, and below the shoulders. */
const girdleCut = (d: Bust) => {
  const clavicle = d.clavicleCut;
  if (clavicle === undefined) {
    throw new Error(`The bust's ${d.segment} is cut where its clavicles lift the girdle, which needs clavicleCut`);
  }
  const at = levels(d);
  if (!(at.armpit < clavicle && clavicle < at.shoulders)) {
    throw new Error(`The bust's clavicleCut, ${clavicle}, must lie between its armpit and its shoulders`);
  }
  return clavicle;
};
/** Where a trunk bending in three is cut: at its ribs' and its chest's joints, and where its clavicles lift. */
const spineCuts = (d: Bust) => {
  const ribs = d.origins?.ribs?.[1];
  const chest = d.origins?.chest?.[1];
  if (ribs === undefined || chest === undefined) {
    throw new Error(`The bust's ${d.segment} is a cut of the trunk, which needs its ribs' and chest's joints`);
  }
  const at = levels(d);
  // The trunk and the shoulders are regions a garment hides, and a region is whole parts only when it ends at a cut.
  if (Math.abs(at.armpit - chest) > MEASURE_TOLERANCE) {
    throw new Error(`The bust's armpit, ${at.armpit}, is not at its chest's joint, ${chest}`);
  }
  if (!(at.waist < ribs && ribs < chest)) {
    throw new Error("The bust's spine cuts must rise from its waist to its chest in turn");
  }
  return { ribs, clavicle: girdleCut(d) };
};
const drawn = (d: Bust, origin: number): (ExtrudedPolygonSolid | BoxSolid | RevolvedSolid)[] => {
  const { waist, ribs, chest, shoulders, crown } = levels(d);
  const top = crown + d.headHeight;
  const halfX = d.headWidth / 2;
  const halfZ = d.headDepth / 2;
  const ys = (bottom: number, topY: number): [number, number] => [bottom - origin, topY - origin];
  const eyeY = crown + d.headHeight * d.eyeShare;
  const brow = crown + d.jawHeight;
  // The shoulder: an upright spheroid, so the arm hangs from a cap round from above and from the front.
  const deltoid = (id: string, side: 1 | -1) => {
    const { x, y, z, radius, halfHeight } = d.girdle.deltoid;
    return spheroid(id, [side * x, y - origin, z], [halfHeight, radius], ['y', 'skin']);
  };
  const facePower = d.facePower;
  /** Where the face's rounded front lies at `x`, so a feature can sit on the surface rather than stand off it. */
  const faceZ = (x: number) => halfZ * (1 - Math.abs(x / halfX) ** facePower) ** (1 / facePower);
  // The face: whites set into the skull with an iris standing proud, a brow bar over each, a bridged nose and lips.
  const eye = (side: 1 | -1) => {
    const name = side > 0 ? 'left' : 'right';
    const inner = side * halfX * 0.24;
    const outer = side * halfX * 0.64;
    const centre = (inner + outer) / 2;
    const surface = faceZ(outer);
    // Each feature stands a voxel proud of the face so the drawn surface keeps it.
    return [
      block(`${name}-eye`, 'white', [Math.min(inner, outer), Math.max(inner, outer)], ys(eyeY - 0.011, eyeY + 0.011), [
        surface - 0.006,
        surface + 0.006,
      ]),
      block(`${name}-iris`, 'eye', [centre - 0.008, centre + 0.008], ys(eyeY - 0.008, eyeY + 0.008), [
        surface,
        surface + 0.01,
      ]),
      block(
        `${name}-brow`,
        'hair',
        [Math.min(inner, outer) - 0.002, Math.max(inner, outer) + 0.004],
        ys(eyeY + 0.02, eyeY + 0.026),
        [surface - 0.004, surface + 0.006],
      ),
    ];
  };
  // An ear: a rounded lobe standing off the side of the skull, extruded across x.
  const ear = (id: string, side: 1 | -1): ExtrudedPolygonSolid => ({
    id,
    kind: 'extruded-polygon',
    axis: 'x',
    profile: Array.from({ length: 12 }, (_, i) => {
      const a = (2 * Math.PI * i) / 12;
      return [eyeY - 0.012 - origin + 0.03 * Math.cos(a), -0.004 + 0.022 * Math.sin(a)] as const;
    }),
    z: side > 0 ? [halfX - 0.004, halfX + 0.012] : [-halfX - 0.012, -halfX + 0.004],
    slot: 'skin',
  });
  if (d.segment === 'pelvis') {
    return [
      oval('pelvis', 'underwear', ys(0, waist), { halfX: d.pelvisWidth / 2, halfZ: d.pelvisDepth / 2, power: 3 }),
    ];
  }
  if (d.segment !== 'neck' && d.segment !== 'head') {
    const chestHalfX = d.chestWidth / 2;
    const chestHalfZ = d.chestDepth / 2;
    // The trapezius: the girdle's top falls from the neck's foot to the chest's side. The girdle's planes are given in
    // the bust's frame, so they rise with the segment's joint as its heights do.
    const sloped = (solid: ExtrudedPolygonSolid): ExtrudedPolygonSolid => ({
      ...solid,
      clip: d.girdle.trapezius.map(({ normal, offset }) => ({ normal, offset: offset - normal[1] * origin })),
      display: { ...solid.display, bevel: false },
    });
    // A pectoral: a lens on the chest's front plane, its lower edge the visible fold.
    const pec = (id: string, side: 1 | -1) =>
      oval(id, 'skin', ys(chest + d.chestHeight * 0.3, chest + d.chestHeight * 0.72), {
        halfX: chestHalfX * 0.36,
        halfZ: 0.011,
        cx: side * chestHalfX * 0.46,
        cz: chestHalfZ - 0.011,
        power: 2,
      });
    const trunk = [
      oval('waist', 'skin', ys(waist, ribs), {
        halfX: d.waistWidth / 2,
        halfZ: d.waistDepth / 2,
        power: 3,
        cz: 0.002,
      }),
      oval('ribs', 'skin', ys(ribs, chest), { halfX: d.ribWidth / 2, halfZ: d.ribDepth / 2, power: 3 }),
      // The chest widens from the ribs over a short step, then carries the plane of the pectorals. Below the armpit
      // it stays inside the hanging arm, so a sleeveless shell can enclose it without passing through the arm.
      oval('chest-low', 'skin', ys(chest, chest + d.chestHeight * d.armpit), {
        halfX: chestHalfX * d.chestLowShare,
        halfZ: chestHalfZ - 0.002,
        power: 3.2,
      }),
    ];
    const slope = [
      sloped(
        oval('chest', 'skin', ys(chest + d.chestHeight * d.armpit, shoulders), {
          halfX: chestHalfX,
          halfZ: chestHalfZ - 0.006,
          power: 3.6,
        }),
      ),
      sloped(pec('pec-left', 1)),
      sloped(pec('pec-right', -1)),
    ];
    const deltoids = { left: deltoid('shoulder-left', 1), right: deltoid('shoulder-right', -1) };
    const at = (height: number) => height - origin;
    // A clavicle lifts the girdle's slope off the neck's foot; the neck hangs from the chest, so the chest keeps the
    // girdle's top under the neck for it to stand on. The deltoid caps the arm the clavicle carries, so it rides the
    // clavicle whole, however low it reaches.
    const neckFoot = d.neckWidth / 2;
    const girdle = (clavicle: number) => cut(slope, 'y', at(clavicle), 1);
    const chestGirdle = (clavicle: number) => [
      ...cut(slope, 'y', at(clavicle), -1),
      ...cut(cut(girdle(clavicle), 'x', -neckFoot, 1), 'x', neckFoot, -1),
    ];
    if (d.segment === 'torso') {
      // Regions a worn shell's `covers` names, so a garment hides the skin it encloses: the trunk below the armpit,
      // and the girdle above it, which stays drawn under a garment that leaves the shoulders bare. A torso given its
      // clavicles' cut leaves them the girdle's sides.
      return [
        ...region('trunk', trunk),
        ...region(
          'shoulders',
          d.clavicleCut === undefined ? [...slope, deltoids.left, deltoids.right] : chestGirdle(girdleCut(d)),
        ),
      ];
    }
    // A spine segment is a whole part of one region, so it needs no region of its own.
    switch (d.segment) {
      case 'waist':
        return cut(trunk, 'y', at(spineCuts(d).ribs), -1);
      case 'ribs':
        return cut(trunk, 'y', at(spineCuts(d).ribs), 1);
      case 'chest':
        return chestGirdle(spineCuts(d).clavicle);
      case 'clavicle_l':
        return [...cut(girdle(girdleCut(d)), 'x', neckFoot, 1), deltoids.left];
      case 'clavicle_r':
        return [...cut(girdle(girdleCut(d)), 'x', -neckFoot, -1), deltoids.right];
    }
  }
  if (d.segment === 'neck') {
    return [
      oval('neck', 'skin', ys(shoulders, crown + d.neckOverlap), {
        halfX: d.neckWidth / 2,
        halfZ: d.neckWidth / 2,
        power: 2.4,
      }),
    ];
  }
  // The head: a skull domed toward the crown, cheeks narrowing to a chin, and hair: a domed mass with a swept fringe
  // that stays within the box the old cap filled, which hats are fitted round.
  const hairTop = top + d.hairRise;
  const hairLine = top - d.hairCover;
  const skullFull = { halfX, halfZ, cz: 0 };
  const skull = [
    oval('brow', 'skin', ys(eyeY - 0.03, brow + (top - brow) * 0.45), { ...skullFull, power: facePower }),
    ...dome(
      'cranium',
      'skin',
      ys(brow + (top - brow) * 0.45, top),
      [skullFull, { halfX: halfX * 0.6, halfZ: halfZ * 0.62, cz: -0.012 }],
      { slices: 4, power: 2.6 },
    ),
    oval('cheeks', 'skin', ys(crown + d.jawHeight * 0.7, eyeY - 0.025), {
      halfX: halfX * 0.96,
      halfZ: halfZ * 0.96,
      power: facePower,
      cz: -halfZ * 0.02,
    }),
    oval('jaw', 'skin', ys(crown + d.jawHeight * 0.32, crown + d.jawHeight * 0.75), {
      halfX: halfX * 0.86,
      halfZ: halfZ * 0.88,
      power: 2.6,
      cz: -halfZ * 0.04,
    }),
    oval('chin', 'skin', ys(crown, crown + d.jawHeight * 0.36), {
      halfX: halfX * 0.6,
      halfZ: halfZ * 0.66,
      power: 2.6,
      cz: halfZ * 0.04,
    }),
    ear('left-ear', 1),
    ear('right-ear', -1),
  ];
  // The hair below the dome lies on the skull a hair's breadth out, cut square at the hairline, nape and parting, so
  // it has no corners wider than the skull for a hat's foot to catch on.
  const pelt = { halfX: halfX + d.hairThickness, halfZ: halfZ + d.hairThickness, power: facePower };
  const hairBack = -halfZ + d.hairCover * 0.9;
  const hair = [
    ...dome(
      'hair',
      'hair',
      ys(hairLine, hairTop),
      [
        { halfX: halfX + d.hairThickness, halfZ: halfZ + d.hairThickness, cz: -d.hairSweep },
        { halfX: halfX * d.hairCrownShare, halfZ: halfZ * d.hairCrownShare, cz: -d.hairCrownBack },
      ],
      { slices: d.hairLayerCount, power: facePower },
    ),
    ovalCut('back-hair', 'hair', ys(brow + 0.03, hairLine + 0.01), pelt, { z: [undefined, hairBack] }),
    ovalCut(
      'nape-hair',
      'hair',
      ys(brow - 0.005, brow + 0.035),
      { ...pelt, halfX: halfX * 0.82 },
      { z: [undefined, -halfZ + 0.03] },
    ),
    ovalCut('side-hair-left', 'hair', ys(eyeY + 0.012, hairLine + 0.01), pelt, {
      x: [halfX - 0.004, undefined],
      z: [hairBack, 0.025],
    }),
    ovalCut('side-hair-right', 'hair', ys(eyeY + 0.012, hairLine + 0.01), pelt, {
      x: [undefined, -halfX + 0.004],
      z: [hairBack, 0.025],
    }),
    // The fringe sweeps: lower and fuller on the figure's left, lifted on the right.
    ovalCut('fringe-left', 'hair', ys(hairLine - 0.012, hairLine + 0.02), pelt, {
      x: [-0.01, undefined],
      z: [halfZ - 0.03, undefined],
    }),
    ovalCut('fringe-right', 'hair', ys(hairLine + 0.004, hairLine + 0.02), pelt, {
      x: [undefined, 0],
      z: [halfZ - 0.03, undefined],
    }),
    ...d.hairRing.rows.map(([back, front, half], i) =>
      block(`hair-ring-${i}`, 'hair', [-half, half], ys(d.hairRing.bottom, d.hairRing.top), [back, front]),
    ),
  ];
  // The lips lie on the jaw's front, which sits back from the brow's.
  const mouthZ = halfZ * 0.88 - halfZ * 0.04;
  return [
    ...skull,
    ...hair,
    ...eye(1),
    ...eye(-1),
    block('nose-bridge', 'skin', [-0.008, 0.008], ys(eyeY - 0.034, eyeY + 0.004), [halfZ - 0.003, halfZ + 0.009]),
    block('nose', 'skin', [-0.013, 0.013], ys(eyeY - 0.05, eyeY - 0.03), [halfZ - 0.003, halfZ + 0.017]),
    block('mouth', 'mouth', [-halfX * 0.3, halfX * 0.3], ys(crown + d.jawHeight * 0.52, crown + d.jawHeight * 0.6), [
      mouthZ - 0.004,
      mouthZ + 0.002,
    ]),
  ];
};
