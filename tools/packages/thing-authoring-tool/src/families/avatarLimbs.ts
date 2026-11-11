import type { BoxSolid, ExtrudedPolygonSolid, RevolvedSolid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import { array, number, optional, parse, picklist, pipe, strictObject, string, transform } from 'valibot';
import { block, oval, taper } from './body.ts';
import { positive, requireConvex, scalar, spheroid } from './shapes.ts';

// The player's limbs hang from their joint: origin on the joint at the limb's top, y up, the limb down -y, front
// toward +z. Each limb is mirror-symmetric in x, so one model serves either side, and code poses it about its joint.
// Every solid stays within the measures a worn shell is fitted to: a segment tapers toward its lower joint and ends
// in a round cap of the lower segment's section, so a bent joint turns on a ball instead of opening a wedge.

type LimbSolid = ExtrudedPolygonSolid | BoxSolid | RevolvedSolid;

/**
 * The arm's segments, each its own part so the view can bend the arm at its joints
 * (https://github.com/roobie/skelly, `packages/deadvox/DESIGN.md`, "Models"). A segment's origin is the joint it turns about, so its part mates to the segment above at that joint.
 */
const ARM_SEGMENTS = ['upper', 'fore', 'palm', 'finger', 'thumb'] as const;

// A list param arrives as the measures' JSON text; what it holds is checked after parsing.
const numbers = pipe(string(), transform((s) => JSON.parse(s) as number[]), array(number()));
const names = pipe(string(), transform((s) => JSON.parse(s) as string[]), array(string()));

/**
 * One segment of a bare arm, the hand edge-on to the thigh with its
 * thumb forward. The whole arm's measures come in, so every segment is drawn from the same figures. A `finger` segment
 * is one phalanx: `finger` names which and `phalanx` counts from the knuckle.
 */
export const avatarArm = (params: Readonly<Record<string, string>>): LimbSolid[] => {
  const d = parse(
    strictObject({
      segment: picklist(ARM_SEGMENTS),
      finger: optional(string()),
      phalanx: optional(scalar),
      /** The fingers from the thumb's side, their lengths as shares of `fingerLength`, and the gap between them. */
      fingers: names,
      fingerShares: numbers,
      fingerGap: positive,
      /** Each finger's phalanges as shares of its length, knuckle first; the thumb's bones as shares of its length. */
      phalanxShares: numbers,
      thumbShares: numbers,
      upperLength: positive,
      upperWidth: positive,
      upperDepth: positive,
      foreLength: positive,
      foreWidth: positive,
      wristWidth: positive,
      palmLength: positive,
      palmWidth: positive,
      palmThickness: positive,
      fingerLength: positive,
      thumbLength: positive,
      /** How far each arm segment reaches into the one above it, so no gap opens between them. */
      seamOverlap: positive,
      /** How far the palm reaches into the wrist and the fingers into the palm. */
      handOverlap: positive,
      armChamfer: positive,
      wristChamfer: positive,
      /** How much deeper than wide the forearm and the wrist are, on each side. */
      foreDepthExtra: positive,
      wristDepthExtra: positive,
      /** The share of the forearm, from the wrist up, drawn at wrist width. */
      wristShare: positive,
      /** Finger and thumb thickness as a share of the palm's. */
      fingerThicknessShare: positive,
      thumbThicknessShare: positive,
      /** How far forward the fingers reach, as a share of the palm's half width. */
      fingerFrontShare: positive,
      /** Where the thumb's root sits down the palm, as a share of the palm length. */
      thumbRootShare: positive,
      /** How far the thumb sinks into the palm's front edge, and how far past it the thumb stands out. */
      thumbInset: positive,
      thumbProjection: positive,
      /** How far the thumb's root sits toward the palm's face; the palm segment does not draw it, the thumb's socket does. */
      thumbVolar: positive,
      /** How far each finger's knuckle sits back from the palm's length toward the wrist, the index first. */
      knuckleBack: numbers,
      /** How far the knuckles sit toward the palm's face; the fingers' sockets place them, the palm only ends there. */
      knuckleVolar: positive,
    }),
    params,
  );
  const elbow = -d.upperLength;
  const wrist = elbow - d.foreLength;
  const knuckles = wrist - d.palmLength;
  const halfPalm = d.palmWidth / 2;
  const halfThick = d.palmThickness / 2;
  const wristTop = wrist + d.foreLength * d.wristShare;
  const thumbRoot = wrist - d.palmLength * d.thumbRootShare;
  const thumbEdge = halfPalm - d.thumbInset;
  // The fingers across the palm, the index at the thumb's side, +z, each a shade shorter toward the little one.
  const span = halfPalm + halfPalm * d.fingerFrontShare;
  const fingerWidth = (span - (d.fingers.length - 1) * d.fingerGap) / d.fingers.length;
  const fingerCentre = (i: number) => halfPalm * d.fingerFrontShare - i * (fingerWidth + d.fingerGap) - fingerWidth / 2;
  const fingerAt = d.fingers.indexOf(d.finger ?? '');
  const phalanx = d.phalanx ?? 0;
  if (d.segment === 'finger' && (fingerAt < 0 || !(phalanx >= 0 && phalanx < d.phalanxShares.length))) {
    throw new Error(`finger segment needs a finger of ${d.fingers.join(' ')} and a phalanx below ${d.phalanxShares.length}, not ${d.finger} ${d.phalanx}`);
  }
  if (d.segment === 'thumb' && !(phalanx >= 0 && phalanx < d.thumbShares.length)) {
    throw new Error(`thumb segment needs a phalanx below ${d.thumbShares.length}, not ${d.phalanx}`);
  }
  const phalanxLength = (k: number) => d.fingerLength * (d.fingerShares[fingerAt] ?? 1) * (d.phalanxShares[k] ?? 0);
  const phalanxTop = knuckles - d.phalanxShares.slice(0, phalanx).reduce((sum, _, k) => sum + phalanxLength(k), 0);
  const thumbLength = (k: number) => d.thumbLength * (d.thumbShares[k] ?? 0);
  const thumbTop = thumbRoot - d.thumbShares.slice(0, phalanx).reduce((sum, _, k) => sum + thumbLength(k), 0);
  // Each segment's joint in the arm frame; the segment is drawn about it as its own origin.
  const origins: Record<(typeof ARM_SEGMENTS)[number], readonly [number, number]> = {
    upper: [0, 0],
    fore: [elbow, 0],
    palm: [wrist, 0],
    finger: [phalanxTop, fingerCentre(fingerAt)],
    thumb: [thumbTop, thumbEdge],
  };
  const [originY, originZ] = origins[d.segment];
  const ys = (bottom: number, top: number): [number, number] => [bottom - originY, top - originY];
  const upperHalfX = d.upperWidth / 2;
  const upperHalfZ = d.upperDepth / 2;
  const foreHalfX = d.foreWidth / 2;
  const foreHalfZ = d.foreWidth / 2 + d.foreDepthExtra;
  const wristHalfX = d.wristWidth / 2;
  const wristHalfZ = d.wristWidth / 2 + d.wristDepthExtra;
  switch (d.segment) {
    case 'upper':
      return [
        // The named solid spans the whole segment at its narrow end, so the anchors on it keep their places.
        oval('upper-arm', 'skin', ys(elbow, 0), { halfX: upperHalfX * 0.82, halfZ: upperHalfZ * 0.82, power: 2.4 }),
        ...taper('upper-arm-flesh', 'skin', ys(elbow + d.upperLength * 0.15, 0), [{ halfX: upperHalfX * 0.84, halfZ: upperHalfZ * 0.84 }, { halfX: upperHalfX, halfZ: upperHalfZ }], { slices: 4, power: 2.4 }),
        spheroid('elbow', [0, elbow - originY, 0], [foreHalfZ * 0.9, foreHalfX * 0.95], ['x', 'skin']),
      ];
    case 'fore':
      return [
        oval('forearm', 'skin', ys(wristTop + d.foreLength * 0.12, elbow + d.seamOverlap), { halfX: foreHalfX, halfZ: foreHalfZ, power: 2.4 }),
        oval('forearm-low', 'skin', ys(wristTop - d.foreLength * 0.08, wristTop + d.foreLength * 0.16), { halfX: (foreHalfX + wristHalfX) / 2, halfZ: (foreHalfZ + wristHalfZ) / 2, power: 2.4 }),
        oval('wrist', 'skin', ys(wrist, wristTop + d.seamOverlap), { halfX: wristHalfX, halfZ: wristHalfZ, power: 2.6 }),
      ];
    case 'palm': {
      // The palm ends along the knuckle row, which slants back toward the little finger; past the outer knuckles the
      // row's line carries on to either edge, so the outline stays convex. Each knuckle ridges the back of the hand, -x.
      const knuckleAt = (i: number) => knuckles + (d.knuckleBack[i] ?? 0);
      const last = d.fingers.length - 1;
      const edgeY = (from: number, to: number, z: number) =>
        knuckleAt(from) + ((knuckleAt(to) - knuckleAt(from)) * (z - fingerCentre(from))) / (fingerCentre(to) - fingerCentre(from));
      const corner = 0.01;
      const top = wrist + d.handOverlap;
      // Counterclockwise in the x axis's (y, z) plane: down the thumb's edge, along the knuckles, up the little finger's.
      const outline: Vec2[] = [
        [top - corner, halfPalm],
        [edgeY(0, 1, halfPalm), halfPalm],
        ...Array.from({ length: last - 1 }, (_, k): Vec2 => [knuckleAt(k + 1), fingerCentre(k + 1)]),
        [edgeY(last, last - 1, -halfPalm), -halfPalm],
        [top - corner, -halfPalm],
        [top, -halfPalm + corner],
        [top, halfPalm - corner],
      ].map(([y, z]): Vec2 => [y - originY, z]);
      requireConvex(outline, 'palm');
      return [
        { id: 'palm', kind: 'extruded-polygon', axis: 'x', profile: outline, z: [-halfThick, halfThick], slot: 'skin' },
        ...d.fingers.map((finger, i) => block(`knuckle-${finger}`, 'skin', [-halfThick - 0.002, -halfThick + 0.004], ys(knuckleAt(i), knuckleAt(i) + 0.014), [fingerCentre(i) - fingerWidth / 2, fingerCentre(i) + fingerWidth / 2])),
      ];
    }
    case 'finger': {
      // One phalanx, reaching into the one above it so the joint stays closed when it curls; the tip a shade slimmer.
      const slim = phalanx === d.phalanxShares.length - 1 ? 0.85 : 1;
      const thick = halfThick * d.fingerThicknessShare * slim;
      const half = (fingerWidth / 2) * slim;
      return [block(d.finger!, 'skin', [-thick, thick], ys(phalanxTop - phalanxLength(phalanx), phalanxTop + d.handOverlap), [-half, half])];
    }
    case 'thumb': {
      // The metacarpal sinks into the palm's edge; the phalanges beyond it stand clear of the edge they hang beside,
      // a shade slimmer, each reaching into the bone above it so the joint stays closed when it bends.
      const slim = phalanx === 0 ? 1 : 0.8;
      const thick = halfThick * d.thumbThicknessShare * slim;
      const zs: [number, number] = phalanx === 0 ? [thumbEdge, halfPalm + d.thumbProjection] : [halfPalm + 0.001, halfPalm + d.thumbProjection - 0.002];
      return [block('thumb', 'skin', [-thick, thick], ys(thumbTop - thumbLength(phalanx), thumbTop + (phalanx === 0 ? 0 : d.handOverlap)), [zs[0] - originZ, zs[1] - originZ])];
    }
    default:
      return d.segment satisfies never;
  }
};

/**
 * The leg's segments, each its own part so a stance can bend the leg at the knee and ankle
 * (https://github.com/roobie/skelly, `packages/deadvox/DESIGN.md`, "Crouching and lying prone"). Like the arm's, each segment is drawn about the joint it turns about.
 */
const LEG_SEGMENTS = ['thigh', 'shin', 'foot'] as const;

/**
 * One segment of a bare leg whose foot lies `length` below the hip joint.
 * The whole leg's measures come in, so every segment is drawn from the same figures.
 */
export const avatarLeg = (params: Readonly<Record<string, string>>): LimbSolid[] => {
  const d = parse(
    strictObject({
      segment: picklist(LEG_SEGMENTS),
      length: positive,
      thighLength: positive,
      thighWidth: positive,
      thighDepth: positive,
      shinWidth: positive,
      shinDepth: positive,
      shoeHeight: positive,
      shoeWidth: positive,
      toeReach: positive,
      heelReach: positive,
      thighChamfer: positive,
      shinChamfer: positive,
      shoeChamfer: positive,
      /** How far the shin reaches up into the thigh, and the shin and cuff down into the shoe. */
      kneeOverlap: positive,
      ankleOverlap: positive,
      /** How far the upper sits in from the sole: at each side, over its length, and back from the toe. */
      upperSideInset: positive,
      upperLengthInset: positive,
      upperBackShift: positive,
    }),
    params,
  );
  const knee = -d.thighLength;
  const sole = -d.length;
  const ankle = sole + d.shoeHeight;
  const halfShoe = d.shoeWidth / 2 - d.upperSideInset;
  const origin = { thigh: 0, shin: knee, foot: ankle }[d.segment];
  const ys = (bottom: number, top: number): [number, number] => [bottom - origin, top - origin];
  const thighHalfX = d.thighWidth / 2;
  const thighHalfZ = d.thighDepth / 2;
  const shinHalfX = d.shinWidth / 2;
  const shinHalfZ = d.shinDepth / 2;
  switch (d.segment) {
    case 'thigh':
      return [
        // The named solid spans the whole segment at the knee's section, so the anchors on it keep their places.
        oval('thigh', 'skin', ys(knee, 0), { halfX: shinHalfX * 1.05, halfZ: shinHalfZ * 1.05, power: 2.6 }),
        ...taper('thigh-flesh', 'skin', ys(knee + d.thighLength * 0.12, 0), [{ halfX: shinHalfX * 1.1, halfZ: shinHalfZ * 1.1 }, { halfX: thighHalfX, halfZ: thighHalfZ }], { slices: 5, power: 2.6 }),
        spheroid('knee', [0, knee - origin, 0], [shinHalfZ, shinHalfX * 1.08], ['x', 'skin']),
      ];
    case 'shin': {
      const shinLength = knee - ankle;
      return [
        oval('shin', 'skin', ys(ankle - d.ankleOverlap, knee + d.kneeOverlap), { halfX: shinHalfX * 0.74, halfZ: shinHalfZ * 0.76, power: 2.6 }),
        oval('calf', 'skin', ys(knee - shinLength * 0.55, knee + d.kneeOverlap), { halfX: shinHalfX, halfZ: shinHalfZ, power: 2.6, cz: -0.004 }),
        oval('shin-mid', 'skin', ys(knee - shinLength * 0.75, knee - shinLength * 0.5), { halfX: shinHalfX * 0.88, halfZ: shinHalfZ * 0.9, power: 2.6, cz: -0.002 }),
      ];
    }
    case 'foot': {
      // A bare foot: a round heel under the ankle, an instep wedge sloping down to a row of toes.
      const heelBack = -d.heelReach + d.upperLengthInset;
      const toeFront = d.toeReach - d.upperLengthInset - d.upperBackShift;
      const toeTop = sole + d.shoeHeight * 0.3;
      // In the x-axis profile's (y, z) plane, counterclockwise runs instep top, toe root, sole, heel.
      const instep: Vec2[] = [
        [ankle + 0.008 - origin, 0.045],
        [toeTop - origin, toeFront - 0.04],
        [sole - origin, toeFront - 0.045],
        [sole - origin, heelBack + 0.01],
        [ankle + 0.008 - origin, heelBack + 0.02],
      ];
      requireConvex(instep, 'instep');
      const toeWidths = [0.018, 0.015, 0.014, 0.013, 0.012];
      const toeGap = (2 * halfShoe - toeWidths.reduce((sum, w) => sum + w, 0)) / (toeWidths.length - 1);
      let edge = halfShoe;
      const toes = toeWidths.map((width, i) => {
        const toe = block(['big', 'second', 'third', 'fourth', 'little'][i]!, 'skin', [edge - width, edge], ys(sole, sole + d.shoeHeight * 0.28 - i * 0.002), [toeFront - 0.045, toeFront - i * 0.004]);
        edge -= width + toeGap;
        return toe;
      });
      return [
        oval('heel', 'skin', ys(sole, ankle - 0.015), { halfX: halfShoe * 0.95, halfZ: 0.05, power: 2.6, cz: heelBack + 0.05 }),
        spheroid('ankle', [0, 0, 0], [shinHalfZ * 0.8, shinHalfX * 0.8], ['x', 'skin']),
        { id: 'instep', kind: 'extruded-polygon', axis: 'x', profile: instep, z: [-halfShoe, halfShoe], slot: 'skin' },
        // The model is the right foot, so the big toe is on its inner side, +x; the left foot is its mirror.
        ...toes,
      ];
    }
    default:
      return d.segment satisfies never;
  }
};
