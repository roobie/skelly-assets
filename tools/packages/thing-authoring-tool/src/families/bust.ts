import type { BoxSolid, ExtrudedPolygonSolid, RevolvedSolid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import { array, integer, number, parse, picklist, pipe, strictObject, string, transform, tuple } from 'valibot';
import { block, dome, oval, ovalCut } from './body.ts';
import { positive, spheroid } from './shapes.ts';

/** The bust's segments: the head is its own part so a stance can lift it about the neck while the torso leans. */
const BUST_SEGMENTS = ['pelvis', 'torso', 'neck', 'head'] as const;

const region = <T extends ExtrudedPolygonSolid | BoxSolid | RevolvedSolid>(piece: string, solids: T[]): T[] =>
  solids.map((solid) => ({ ...solid, display: { ...solid.display, piece } }));

// The player's head and torso: origin at the pelvis base on the centre line, y up, face toward +z. Stacked rounded
// slabs taper hips to shoulders, a deltoid spheroid is centred on each shoulder joint, and the head stands on the
// neck. Every solid stays within the measures a worn shell is fitted to, so the shaping here never changes a fit. Head
// gear straps are fitted to the ring of hair drawn just above the hairline, which models/head-band.libsonnet lays out
// on the head's voxel lattice and passes here as `hairRing`.
// The head segment is drawn about the neck's top, the joint it turns about. The model's anchors name solids here, so
// a joint follows the solid that seats its limb.
export const bust = (params: Readonly<Record<string, string>>): (ExtrudedPolygonSolid | BoxSolid | RevolvedSolid)[] => {
  const d = parse(
    strictObject({
      segment: picklist(BUST_SEGMENTS),
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
      torsoChamfer: positive,
      chestChamfer: positive,
      shoulderWidth: positive,
      shoulderHeight: positive,
      shoulderDepth: positive,
      /** How far each deltoid sets into the chest's side, and how far its top sits below the chest's. */
      deltoidInset: positive,
      deltoidDrop: positive,
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
    }),
    params,
  );
  const waist = d.pelvisHeight;
  const ribs = waist + d.waistHeight;
  const chest = ribs + d.ribHeight;
  const shoulders = chest + d.chestHeight;
  const crown = shoulders + d.neckHeight;
  const top = crown + d.headHeight;
  const halfX = d.headWidth / 2;
  const halfZ = d.headDepth / 2;
  const origin = d.segment === 'head' ? crown + d.neckOverlap : 0;
  const ys = (bottom: number, topY: number): [number, number] => [bottom - origin, topY - origin];
  const eyeY = crown + d.headHeight * d.eyeShare;
  const brow = crown + d.jawHeight;
  const deltoidX = d.chestWidth / 2 + d.shoulderWidth / 2 - d.deltoidInset;
  const deltoidY = shoulders - d.shoulderHeight / 2 - d.deltoidDrop;
  // The shoulder: a spheroid filling the deltoid's box, so the arm hangs from a round cap rather than a cube.
  const deltoid = (id: string, side: 1 | -1) =>
    spheroid(id, [side * deltoidX, deltoidY - origin, 0], [d.shoulderWidth / 2, Math.min(d.shoulderHeight, d.shoulderDepth) / 2], ['x', 'skin']);
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
      block(`${name}-eye`, 'white', [Math.min(inner, outer), Math.max(inner, outer)], ys(eyeY - 0.011, eyeY + 0.011), [surface - 0.006, surface + 0.006]),
      block(`${name}-iris`, 'eye', [centre - 0.008, centre + 0.008], ys(eyeY - 0.008, eyeY + 0.008), [surface, surface + 0.01]),
      block(`${name}-brow`, 'hair', [Math.min(inner, outer) - 0.002, Math.max(inner, outer) + 0.004], ys(eyeY + 0.02, eyeY + 0.026), [surface - 0.004, surface + 0.006]),
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
  if (d.segment === 'torso') {
    const chestHalfX = d.chestWidth / 2;
    const chestHalfZ = d.chestDepth / 2;
    const trapRise = 0.008;
    // The trapezius: a low wedge from the neck's foot out to each shoulder, within the yoke a shell draws there.
    const trapezius = (id: string, side: 1 | -1): ExtrudedPolygonSolid => {
      const inner = side * 0.055;
      const outer = side * (chestHalfX - 0.02);
      const corners: Vec2[] = [
        [inner, shoulders - 0.03 - origin],
        [outer, shoulders - 0.03 - origin],
        [outer, shoulders - origin],
        [inner, shoulders + trapRise - origin],
      ];
      return {
        id,
        kind: 'extruded-polygon',
        axis: 'z',
        profile: side > 0 ? corners : corners.reverse(),
        z: [-d.neckWidth / 2, d.neckWidth / 2],
        slot: 'skin',
      };
    };
    // A pectoral: a lens on the chest's front plane, its lower edge the visible fold.
    const pec = (id: string, side: 1 | -1) =>
      oval(id, 'skin', ys(chest + d.chestHeight * 0.3, chest + d.chestHeight * 0.72), { halfX: chestHalfX * 0.36, halfZ: 0.011, cx: side * chestHalfX * 0.46, cz: chestHalfZ - 0.011, power: 2 });
    // Regions a worn shell's `covers` names, so a garment hides the skin it encloses: the trunk below the armpit,
    // and the girdle above it, which stays drawn under a garment that leaves the shoulders bare.
    return [
      ...region('trunk', [
        oval('waist', 'skin', ys(waist, ribs), { halfX: d.waistWidth / 2, halfZ: d.waistDepth / 2, power: 3, cz: 0.002 }),
        oval('ribs', 'skin', ys(ribs, chest), { halfX: d.ribWidth / 2, halfZ: d.ribDepth / 2, power: 3 }),
        // The chest widens from the ribs over a short step, then carries the plane of the pectorals. Below the armpit
        // it stays inside the hanging arm, so a sleeveless shell can enclose it without passing through the arm.
        oval('chest-low', 'skin', ys(chest, chest + d.chestHeight * d.armpit), { halfX: chestHalfX * 0.94, halfZ: chestHalfZ - 0.002, power: 3.2 }),
      ]),
      ...region('shoulders', [
        oval('chest', 'skin', ys(chest + d.chestHeight * d.armpit, shoulders), { halfX: chestHalfX, halfZ: chestHalfZ - 0.006, power: 3.6 }),
        pec('pec-left', 1),
        pec('pec-right', -1),
        trapezius('trap-left', 1),
        trapezius('trap-right', -1),
        deltoid('shoulder-left', 1),
        deltoid('shoulder-right', -1),
      ]),
    ];
  }
  if (d.segment === 'neck') {
    return [
      oval('neck', 'skin', ys(shoulders, crown + d.neckOverlap), { halfX: d.neckWidth / 2, halfZ: d.neckWidth / 2, power: 2.4 }),
    ];
  }
  // The head: a skull domed toward the crown, cheeks narrowing to a chin, and hair: a domed mass with a swept fringe
  // that stays within the box the old cap filled, which hats are fitted round.
  const hairTop = top + d.hairRise;
  const hairLine = top - d.hairCover;
  const skullFull = { halfX, halfZ, cz: 0 };
  const skull = [
    oval('brow', 'skin', ys(eyeY - 0.03, brow + (top - brow) * 0.45), { ...skullFull, power: facePower }),
    ...dome('cranium', 'skin', ys(brow + (top - brow) * 0.45, top), [skullFull, { halfX: halfX * 0.6, halfZ: halfZ * 0.62, cz: -0.012 }], { slices: 4, power: 2.6 }),
    oval('cheeks', 'skin', ys(crown + d.jawHeight * 0.7, eyeY - 0.025), { halfX: halfX * 0.96, halfZ: halfZ * 0.96, power: facePower, cz: -halfZ * 0.02 }),
    oval('jaw', 'skin', ys(crown + d.jawHeight * 0.32, crown + d.jawHeight * 0.75), { halfX: halfX * 0.86, halfZ: halfZ * 0.88, power: 2.6, cz: -halfZ * 0.04 }),
    oval('chin', 'skin', ys(crown, crown + d.jawHeight * 0.36), { halfX: halfX * 0.6, halfZ: halfZ * 0.66, power: 2.6, cz: halfZ * 0.04 }),
    ear('left-ear', 1),
    ear('right-ear', -1),
  ];
  // The hair below the dome lies on the skull a hair's breadth out, cut square at the hairline, nape and parting, so
  // it has no corners wider than the skull for a hat's foot to catch on.
  const pelt = { halfX: halfX + d.hairThickness, halfZ: halfZ + d.hairThickness, power: facePower };
  const hairBack = -halfZ + d.hairCover * 0.9;
  const hair = [
    ...dome('hair', 'hair', ys(hairLine, hairTop), [{ halfX: halfX + d.hairThickness, halfZ: halfZ + d.hairThickness, cz: -d.hairSweep }, { halfX: halfX * d.hairCrownShare, halfZ: halfZ * d.hairCrownShare, cz: -d.hairCrownBack }], { slices: d.hairLayerCount, power: facePower }),
    ovalCut('back-hair', 'hair', ys(brow + 0.03, hairLine + 0.01), pelt, { z: [undefined, hairBack] }),
    ovalCut('nape-hair', 'hair', ys(brow - 0.005, brow + 0.035), { ...pelt, halfX: halfX * 0.82 }, { z: [undefined, -halfZ + 0.03] }),
    ovalCut('side-hair-left', 'hair', ys(eyeY + 0.012, hairLine + 0.01), pelt, { x: [halfX - 0.004, undefined], z: [hairBack, 0.025] }),
    ovalCut('side-hair-right', 'hair', ys(eyeY + 0.012, hairLine + 0.01), pelt, { x: [undefined, -halfX + 0.004], z: [hairBack, 0.025] }),
    // The fringe sweeps: lower and fuller on the figure's left, lifted on the right.
    ovalCut('fringe-left', 'hair', ys(hairLine - 0.012, hairLine + 0.02), pelt, { x: [-0.01, undefined], z: [halfZ - 0.03, undefined] }),
    ovalCut('fringe-right', 'hair', ys(hairLine + 0.004, hairLine + 0.02), pelt, { x: [undefined, 0], z: [halfZ - 0.03, undefined] }),
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
    block('mouth', 'mouth', [-halfX * 0.3, halfX * 0.3], ys(crown + d.jawHeight * 0.52, crown + d.jawHeight * 0.6), [mouthZ - 0.004, mouthZ + 0.002]),
  ];
};
