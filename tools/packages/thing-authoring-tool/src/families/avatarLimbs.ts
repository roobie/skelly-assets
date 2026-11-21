import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import type { BoxSolid, ExtrudedPolygonSolid, RevolvedSolid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import { array, number, optional, parse, picklist, pipe, strictObject, string, transform } from 'valibot';
import { block, cut, oval, region, taper, translate } from './body.ts';
import { json, point3, positive, requireConvex, requireJointHeights, scalar, spheroid } from './shapes.ts';

// The player's limbs hang from their joint: origin on the joint at the limb's top, y up, the limb down -y, front
// toward +z. Each limb is mirror-symmetric in x, so one model serves either side, and code poses it about its joint.
// Every solid stays within the measures a worn shell is fitted to: a segment tapers toward its lower joint and ends
// in a round cap of the lower segment's section, so a bent joint turns on a ball instead of opening a wedge.
// A body's joints need not lie on the limb's centre line, so `origins` may set them in the limb's frame: a segment's
// flesh is moved off the centre line to its bone, its ball cap sits on the joint it turns about, and the part is
// handed over about its own joint. The flesh is drawn upright, so it follows a bone that leans from joint to joint by
// standing on the bone's middle: leaning it would need slanted solids the voxel families do not draw.

type LimbSolid = ExtrudedPolygonSolid | BoxSolid | RevolvedSolid;

/** Where a segment's upright flesh stands across the limb: midway between its joints, or on its one joint. */
const boneMiddle = (head: Vec3, tail: Vec3 = head): Vec3 => [(head[0] + tail[0]) / 2, 0, (head[2] + tail[2]) / 2];

/**
 * The arm's segments, each its own part so the view can bend the arm at its joints
 * (https://github.com/roobie/skelly, `packages/deadvox/DESIGN.md`, "Models"). A segment's origin is the joint it turns about, so its part mates to the segment above at that joint.
 */
const ARM_SEGMENTS = ['upper', 'fore', 'palm', 'finger', 'thumb'] as const;

// A list param arrives as the measures' JSON text; what it holds is checked after parsing.
const numbers = pipe(
  string(),
  transform((s) => JSON.parse(s) as number[]),
  array(number()),
);
const names = pipe(
  string(),
  transform((s) => JSON.parse(s) as string[]),
  array(string()),
);

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
      /** The shoulder's, elbow's and wrist's joints in the arm's frame; without them they lie on its centre line. */
      origins: optional(json(strictObject({ upper: point3, fore: point3, palm: point3 }))),
      /**
       * Each finger's knuckle in the palm's frame, the index first, for a hand whose knuckle row the measures' slant
       * does not describe; the palm ends along it.
       */
      knuckles: optional(json(array(point3))),
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
    throw new Error(
      `finger segment needs a finger of ${d.fingers.join(' ')} and a phalanx below ${d.phalanxShares.length}, not ${d.finger} ${d.phalanx}`,
    );
  }
  if (d.segment === 'thumb' && !(phalanx >= 0 && phalanx < d.thumbShares.length)) {
    throw new Error(`thumb segment needs a phalanx below ${d.thumbShares.length}, not ${d.phalanx}`);
  }
  const phalanxLength = (k: number) => d.fingerLength * (d.fingerShares[fingerAt] ?? 1) * (d.phalanxShares[k] ?? 0);
  const phalanxTop = knuckles - d.phalanxShares.slice(0, phalanx).reduce((sum, _, k) => sum + phalanxLength(k), 0);
  const thumbLength = (k: number) => d.thumbLength * (d.thumbShares[k] ?? 0);
  const thumbTop = thumbRoot - d.thumbShares.slice(0, phalanx).reduce((sum, _, k) => sum + thumbLength(k), 0);
  const measured = { upper: 0, fore: elbow, palm: wrist };
  if (d.origins) {
    requireJointHeights(d.origins, measured, 'arm');
  }
  const joints = d.origins ?? { upper: [0, 0, 0], fore: [0, elbow, 0], palm: [0, wrist, 0] };
  // Each segment's origin in the arm frame; the segment is drawn about it. A digit is drawn about its own joint
  // already, where its socket on the palm places it, so it has no joint off the arm's centre line to be moved by.
  const origins: Record<(typeof ARM_SEGMENTS)[number], Vec3> = {
    ...joints,
    finger: [0, phalanxTop, 0],
    thumb: [0, thumbTop, 0],
  };
  const [originX, originY, originZ] = origins[d.segment];
  // The palm stands on the wrist alone: its far end is the knuckle row, which is given in its frame.
  const bones: Record<(typeof ARM_SEGMENTS)[number], Vec3> = {
    upper: boneMiddle(joints.upper, joints.fore),
    fore: boneMiddle(joints.fore, joints.palm),
    palm: boneMiddle(joints.palm),
    finger: [0, 0, 0],
    thumb: [0, 0, 0],
  };
  const flesh = <T extends LimbSolid>(solids: T[]) => translate(solids, bones[d.segment]);
  const ys = (bottom: number, top: number): [number, number] => [bottom - originY, top - originY];
  const upperHalfX = d.upperWidth / 2;
  const upperHalfZ = d.upperDepth / 2;
  const foreHalfX = d.foreWidth / 2;
  const foreHalfZ = d.foreWidth / 2 + d.foreDepthExtra;
  const wristHalfX = d.wristWidth / 2;
  const wristHalfZ = d.wristWidth / 2 + d.wristDepthExtra;
  // A palm's knuckle row in the arm frame, (y, z) for each finger.
  const knuckleRow = (): Vec2[] => {
    if (!d.knuckles) {
      return d.fingers.map((_, i): Vec2 => [knuckles + (d.knuckleBack[i] ?? 0), fingerCentre(i)]);
    }
    if (d.knuckles.length !== d.fingers.length) {
      throw new Error(`The palm has ${d.knuckles.length} knuckles for ${d.fingers.length} fingers`);
    }
    // The palm's flesh is moved onto its wrist afterwards, which carries the row's z with it.
    return d.knuckles.map(([, y, z]): Vec2 => [joints.palm[1] + y, z]);
  };
  const drawn = (): LimbSolid[] => {
    switch (d.segment) {
      case 'upper':
        return [
          ...flesh([
            // The named solid spans the whole segment at its narrow end, so the anchors on it keep their places.
            oval('upper-arm', 'skin', ys(elbow, 0), { halfX: upperHalfX * 0.82, halfZ: upperHalfZ * 0.82, power: 2.4 }),
            ...taper(
              'upper-arm-flesh',
              'skin',
              ys(elbow + d.upperLength * 0.15, 0),
              [
                { halfX: upperHalfX * 0.84, halfZ: upperHalfZ * 0.84 },
                { halfX: upperHalfX, halfZ: upperHalfZ },
              ],
              { slices: 4, power: 2.4 },
            ),
          ]),
          spheroid(
            'elbow',
            [joints.fore[0], joints.fore[1] - originY, joints.fore[2]],
            [foreHalfZ * 0.9, foreHalfX * 0.95],
            ['x', 'skin'],
          ),
        ];
      case 'fore':
        return flesh([
          oval('forearm', 'skin', ys(wristTop + d.foreLength * 0.12, elbow + d.seamOverlap), {
            halfX: foreHalfX,
            halfZ: foreHalfZ,
            power: 2.4,
          }),
          oval('forearm-low', 'skin', ys(wristTop - d.foreLength * 0.08, wristTop + d.foreLength * 0.16), {
            halfX: (foreHalfX + wristHalfX) / 2,
            halfZ: (foreHalfZ + wristHalfZ) / 2,
            power: 2.4,
          }),
          oval('wrist', 'skin', ys(wrist, wristTop + d.seamOverlap), {
            halfX: wristHalfX,
            halfZ: wristHalfZ,
            power: 2.6,
          }),
        ]);
      case 'palm': {
        // The palm ends along the knuckle row, which slants back toward the little finger; past the outer knuckles the
        // row's line carries on to either edge, so the outline stays convex. Each knuckle ridges the back of the hand, -x.
        const row = knuckleRow();
        const knuckleAt = (i: number) => row[i]![0];
        const knuckleZ = (i: number) => row[i]![1];
        const last = d.fingers.length - 1;
        const edgeY = (from: number, to: number, z: number) =>
          knuckleAt(from) +
          ((knuckleAt(to) - knuckleAt(from)) * (z - knuckleZ(from))) / (knuckleZ(to) - knuckleZ(from));
        const corner = 0.01;
        const top = wrist + d.handOverlap;
        // Counterclockwise in the x axis's (y, z) plane: down the thumb's edge, along the knuckles, up the little finger's.
        const outline: Vec2[] = [
          [top - corner, halfPalm],
          [edgeY(0, 1, halfPalm), halfPalm],
          ...Array.from({ length: last - 1 }, (_, k): Vec2 => [knuckleAt(k + 1), knuckleZ(k + 1)]),
          [edgeY(last, last - 1, -halfPalm), -halfPalm],
          [top - corner, -halfPalm],
          [top, -halfPalm + corner],
          [top, halfPalm - corner],
        ].map(([y, z]): Vec2 => [y - originY, z]);
        requireConvex(outline, 'palm');
        return flesh([
          {
            id: 'palm',
            kind: 'extruded-polygon',
            axis: 'x',
            profile: outline,
            z: [-halfThick, halfThick],
            slot: 'skin',
          },
          ...d.fingers.map((finger, i) =>
            block(
              `knuckle-${finger}`,
              'skin',
              [-halfThick - 0.002, -halfThick + 0.004],
              ys(knuckleAt(i), knuckleAt(i) + 0.014),
              [knuckleZ(i) - fingerWidth / 2, knuckleZ(i) + fingerWidth / 2],
            ),
          ),
        ]);
      }
      case 'finger': {
        // One phalanx, reaching into the one above it so the joint stays closed when it curls; the tip a shade slimmer.
        const slim = phalanx === d.phalanxShares.length - 1 ? 0.85 : 1;
        const thick = halfThick * d.fingerThicknessShare * slim;
        const half = (fingerWidth / 2) * slim;
        return [
          block(
            d.finger!,
            'skin',
            [-thick, thick],
            ys(phalanxTop - phalanxLength(phalanx), phalanxTop + d.handOverlap),
            [-half, half],
          ),
        ];
      }
      case 'thumb': {
        // The metacarpal sinks into the palm's edge; the phalanges beyond it stand clear of the edge they hang beside,
        // a shade slimmer, each reaching into the bone above it so the joint stays closed when it bends.
        const slim = phalanx === 0 ? 1 : 0.8;
        const thick = halfThick * d.thumbThicknessShare * slim;
        const zs: [number, number] =
          phalanx === 0
            ? [thumbEdge, halfPalm + d.thumbProjection]
            : [halfPalm + 0.001, halfPalm + d.thumbProjection - 0.002];
        return [
          block(
            'thumb',
            'skin',
            [-thick, thick],
            ys(thumbTop - thumbLength(phalanx), thumbTop + (phalanx === 0 ? 0 : d.handOverlap)),
            [zs[0] - thumbEdge, zs[1] - thumbEdge],
          ),
        ];
      }
      default:
        return d.segment satisfies never;
    }
  };
  return translate(drawn(), [-originX, 0, -originZ]);
};

/**
 * The leg's segments, each its own part so a stance can bend the leg at the knee and ankle
 * (https://github.com/roobie/skelly, `packages/deadvox/DESIGN.md`, "Crouching and lying prone"). Like the arm's, each segment is drawn about the joint it turns about.
 */
const LEG_SEGMENTS = ['thigh', 'shin', 'foot', 'ball'] as const;

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
      /** The hip's, knee's and ankle's joints in the leg's frame; without them they lie on its centre line. */
      origins: optional(json(strictObject({ thigh: point3, shin: point3, foot: point3 }))),
      /**
       * The joint the toes bend about, in the leg's frame, for a foot that bends there: the foot is cut across at it,
       * and its front, with the toes, is the `ball` segment.
       */
      ballJoint: optional(json(point3)),
    }),
    params,
  );
  const knee = -d.thighLength;
  const sole = -d.length;
  const ankle = sole + d.shoeHeight;
  const halfShoe = d.shoeWidth / 2 - d.upperSideInset;
  if (d.origins) {
    requireJointHeights(d.origins, { thigh: 0, shin: knee, foot: ankle }, 'leg');
  }
  const joints = d.origins ?? { thigh: [0, 0, 0], shin: [0, knee, 0], foot: [0, ankle, 0] };
  const joint = d.segment === 'ball' ? d.ballJoint : joints[d.segment];
  if (!joint) {
    throw new Error('The ball segment is the front of a foot cut at its ballJoint, which the leg does not give');
  }
  const [originX, origin, originZ] = joint;
  // The foot stands on the ankle alone: the ball's joint lies along the foot, not across it, and the ball is cut
  // from the foot's own flesh.
  const bones: Record<(typeof LEG_SEGMENTS)[number], Vec3> = {
    thigh: boneMiddle(joints.thigh, joints.shin),
    shin: boneMiddle(joints.shin, joints.foot),
    foot: boneMiddle(joints.foot),
    ball: boneMiddle(joints.foot),
  };
  const flesh = <T extends LimbSolid>(solids: T[]) => translate(solids, bones[d.segment]);
  const ys = (bottom: number, top: number): [number, number] => [bottom - origin, top - origin];
  const thighHalfX = d.thighWidth / 2;
  const thighHalfZ = d.thighDepth / 2;
  const shinHalfX = d.shinWidth / 2;
  const shinHalfZ = d.shinDepth / 2;
  const drawn = (): LimbSolid[] => {
    switch (d.segment) {
      case 'thigh':
        return [
          ...flesh([
            // The named solid spans the whole segment at the knee's section, so the anchors on it keep their places.
            oval('thigh', 'skin', ys(knee, 0), { halfX: shinHalfX * 1.05, halfZ: shinHalfZ * 1.05, power: 2.6 }),
            ...taper(
              'thigh-flesh',
              'skin',
              ys(knee + d.thighLength * 0.12, 0),
              [
                { halfX: shinHalfX * 1.1, halfZ: shinHalfZ * 1.1 },
                { halfX: thighHalfX, halfZ: thighHalfZ },
              ],
              { slices: 5, power: 2.6 },
            ),
          ]),
          spheroid(
            'knee',
            [joints.shin[0], joints.shin[1] - origin, joints.shin[2]],
            [shinHalfZ, shinHalfX * 1.08],
            ['x', 'skin'],
          ),
        ];
      case 'shin': {
        const shinLength = knee - ankle;
        return flesh([
          oval('shin', 'skin', ys(ankle - d.ankleOverlap, knee + d.kneeOverlap), {
            halfX: shinHalfX * 0.74,
            halfZ: shinHalfZ * 0.76,
            power: 2.6,
          }),
          oval('calf', 'skin', ys(knee - shinLength * 0.55, knee + d.kneeOverlap), {
            halfX: shinHalfX,
            halfZ: shinHalfZ,
            power: 2.6,
            cz: -0.004,
          }),
          oval('shin-mid', 'skin', ys(knee - shinLength * 0.75, knee - shinLength * 0.5), {
            halfX: shinHalfX * 0.88,
            halfZ: shinHalfZ * 0.9,
            power: 2.6,
            cz: -0.002,
          }),
        ]);
      }
      case 'foot':
      case 'ball': {
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
          const toe = block(
            ['big', 'second', 'third', 'fourth', 'little'][i]!,
            'skin',
            [edge - width, edge],
            ys(sole, sole + d.shoeHeight * 0.28 - i * 0.002),
            [toeFront - 0.045, toeFront - i * 0.004],
          );
          edge -= width + toeGap;
          return toe;
        });
        const heel = flesh([
          oval('heel', 'skin', ys(sole, ankle - 0.015), {
            halfX: halfShoe * 0.95,
            halfZ: 0.05,
            power: 2.6,
            cz: heelBack + 0.05,
          }),
        ]);
        const front = flesh([
          {
            id: 'instep',
            kind: 'extruded-polygon',
            axis: 'x',
            profile: instep,
            z: [-halfShoe, halfShoe],
            slot: 'skin',
          } satisfies ExtrudedPolygonSolid,
          // The model is the right foot, so the big toe is on its inner side, +x; the left foot is its mirror.
          ...toes,
        ]);
        if (d.segment === 'ball') {
          // A whole part of the sole, so it needs no region of its own.
          return cut([...heel, ...front], 'z', originZ, 1);
        }
        const behindBall = <T extends LimbSolid>(solids: T[]) =>
          d.ballJoint ? cut(solids, 'z', d.ballJoint[2], -1) : solids;
        // Regions a worn shell's `covers` names, so footwear hides the skin it encloses: the ankle's cap, which rises
        // above a shoe's vamp into the shaft that rides the shin, and the sole below it, heel, instep and toes.
        return [
          ...region('sole', behindBall(heel)),
          ...region('ankle', [
            spheroid(
              'ankle',
              [joints.foot[0], joints.foot[1] - origin, joints.foot[2]],
              [shinHalfZ * 0.8, shinHalfX * 0.8],
              ['x', 'skin'],
            ),
          ]),
          ...region('sole', behindBall(front)),
        ];
      }
      default:
        return d.segment satisfies never;
    }
  };
  return translate(drawn(), [-originX, 0, -originZ]);
};
