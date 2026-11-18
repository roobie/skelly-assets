// Revolve profiles (axial, radius) in millimetres, derived from sourced metallic-cartridge data.
// What the data does not give, the round's modelling assumptions do; see roundShape.ts.

import type { Measure, MetallicCartridge } from './cartridge.ts';
import { type RoundShape, roundShape } from './roundShape.ts';

type ProfilePoint = readonly [axialMm: number, radiusMm: number];

export interface RoundProfiles {
  /** Case closed around its seated projectile. */
  readonly loadedCase: readonly ProfilePoint[];
  /** Open fired case with a visible wall and closed internal floor. */
  readonly firedCase: readonly ProfilePoint[];
  readonly bullet: readonly ProfilePoint[];
  /** The projectile's driving band, on a round whose shape gives it one. */
  readonly band?: readonly ProfilePoint[];
  readonly primer: readonly ProfilePoint[];
}

const required = (measure: Measure, label: string): number => {
  if (measure.value === null) {
    throw new Error(`cartridge has no ${label}`);
  }
  return measure.value;
};

/** Sourced outer case outline, from the head face toward the mouth. */
const caseOutline = (cartridge: MetallicCartridge, baseChamfer: number): ProfilePoint[] => {
  const cartridgeCase = cartridge.case;
  const rimRadius = required(cartridgeCase.rim.diameter, 'rim diameter') / 2;
  const rimThickness = required(cartridgeCase.rim.thickness, 'rim thickness');
  const bodyRadius = required(cartridgeCase.body.diameterAtHead, 'body diameter at head') / 2;
  const length = required(cartridgeCase.length, 'case length');
  const head: ProfilePoint[] = [
    [0, rimRadius - baseChamfer],
    [baseChamfer, rimRadius],
    [rimThickness, rimRadius],
  ];
  if (cartridgeCase.head.type === 'rimless') {
    const groove = cartridgeCase.head.extractorGroove;
    const grooveRadius = required(groove.diameter, 'extractor groove diameter') / 2;
    head.push(
      [rimThickness, grooveRadius],
      [rimThickness + required(groove.width, 'extractor groove width'), grooveRadius],
      [required(cartridgeCase.bodyStart, 'body start'), bodyRadius],
    );
  } else {
    head.push([rimThickness, bodyRadius]);
  }
  if (cartridgeCase.body.type === 'bottleneck') {
    const { shoulder, neck } = cartridgeCase.body;
    return [
      ...head,
      [
        required(shoulder.startPosition, 'shoulder start'),
        required(cartridgeCase.body.diameterAtShoulderStart, 'shoulder-start diameter') / 2,
      ],
      [required(shoulder.endPosition, 'shoulder end'), required(neck.diameterAtBase, 'neck diameter at base') / 2],
      [length, required(neck.diameterAtMouth, 'neck diameter at mouth') / 2],
    ];
  }
  return [...head, [length, required(cartridgeCase.body.diameterAtMouth, 'diameter at mouth') / 2]];
};

/** Linear outer-wall radius at axial position; undefined gaps indicate malformed source geometry. */
const radiusAt = (outline: readonly ProfilePoint[], axial: number): number => {
  for (let i = 1; i < outline.length; i++) {
    const [a0, r0] = outline[i - 1]!;
    const [a1, r1] = outline[i]!;
    if (a1 > a0 && axial >= a0 && axial <= a1) {
      return r0 + ((r1 - r0) * (axial - a0)) / (a1 - a0);
    }
  }
  throw new Error(`no case wall at axial position ${axial} mm`);
};

/** Primer pocket floor, pocket wall, head face, then the external outline. */
const caseBase = (outline: readonly ProfilePoint[], primer: RoundShape['primer']): ProfilePoint[] => {
  const pocketRadius = primer.diameter / 2 + primer.clearance;
  return [[primer.pocketDepth, 0], [primer.pocketDepth, pocketRadius], [0, pocketRadius], ...outline];
};

const loadedCaseProfile = (outline: readonly ProfilePoint[], mouth: number, shape: RoundShape): ProfilePoint[] => [
  ...caseBase(outline, shape.primer),
  [mouth, 0],
];

const firedCaseProfile = (outline: readonly ProfilePoint[], mouth: number, shape: RoundShape): ProfilePoint[] => {
  const { wall, firedFloor } = shape.case;
  const [, mouthRadius] = outline.at(-1)!;
  const inner = outline
    .filter(([axial]) => axial > firedFloor)
    .map(([axial, radius]): ProfilePoint => [axial, Math.max(radius - wall, 0)])
    .reverse();
  const floorRadius = radiusAt(outline, firedFloor) - wall;
  return [
    ...caseBase(outline, shape.primer),
    [mouth, mouthRadius - wall],
    ...inner.slice(1),
    [firedFloor, floorRadius],
    [firedFloor, 0],
  ];
};

/**
 * Tangent-ogive points after a cylindrical section of `radius` ending at `start`, up to the nose of `noseRadius` at
 * `tip`: an arc whose centre lies on the radius through `start`, so it leaves the body without a crease.
 */
const ogive = (start: number, tip: number, radius: number, noseRadius: number, segments: number): ProfilePoint[] => {
  const length = tip - start;
  const fall = radius - noseRadius;
  const circleRadius = (fall * fall + length * length) / (2 * fall);
  const maximumAngle = Math.asin(length / circleRadius);
  const points: ProfilePoint[] = [];
  for (let step = 1; step < segments; step++) {
    const angle = (maximumAngle * step) / segments;
    points.push([start + circleRadius * Math.sin(angle), circleRadius * Math.cos(angle) + radius - circleRadius]);
  }
  return [...points, [tip, noseRadius]];
};

/** Where the projectile sits: its base, the start of its ogive and its tip. */
interface ProjectileStations {
  readonly radius: number;
  readonly base: number;
  readonly ogiveStart: number;
  readonly tip: number;
}

const projectileStations = (
  cartridge: MetallicCartridge,
  projectile: RoundShape['projectile'],
): ProjectileStations => {
  const radius = required(cartridge.payload.diameter, 'bullet diameter') / 2;
  const tip = required(
    cartridge.overallLength.typical.value === null ? cartridge.overallLength.max : cartridge.overallLength.typical,
    'overall length for presentation',
  );
  const caseLength = required(cartridge.case.length, 'case length');
  const sourcedLength = cartridge.payload.length.min.value;
  const bulletLength = sourcedLength ?? tip - caseLength + projectile.seatingCalibres * radius * 2;
  return { radius, base: tip - bulletLength, ogiveStart: tip - projectile.ogive.calibres * radius * 2, tip };
};

const bulletProfile = (stations: ProjectileStations, ogiveShape: RoundShape['projectile']['ogive']): ProfilePoint[] => {
  const { radius, base, ogiveStart, tip } = stations;
  const noseRadius = ogiveShape.meplatCalibres * radius;
  if (noseRadius >= radius) {
    throw new Error('projectile meplat is as wide as its body');
  }
  return [
    [base, 0],
    [base, radius],
    [ogiveStart, radius],
    ...ogive(ogiveStart, tip, radius, noseRadius, ogiveShape.segments),
    ...(noseRadius > 0 ? [[tip, 0] as const] : []),
  ];
};

/** A ring standing proud of the projectile body ahead of the case mouth, its inside on the body. */
const bandProfile = (
  stations: ProjectileStations,
  mouth: number,
  band: NonNullable<RoundShape['projectile']['band']>,
): ProfilePoint[] => {
  const outer = band.diameter / 2;
  const rear = mouth + band.fromMouth;
  const front = rear + band.width;
  if (outer <= stations.radius) {
    throw new Error('driving band is no wider than the projectile body');
  }
  if (front > stations.ogiveStart) {
    throw new Error('driving band runs onto the ogive');
  }
  return [
    [rear, stations.radius],
    [rear, outer],
    [front, outer],
    [front, stations.radius],
    [rear, stations.radius],
  ];
};

const primerProfile = (primer: RoundShape['primer']): ProfilePoint[] => {
  const radius = primer.diameter / 2;
  const { recess: face, chamfer, pocketDepth } = primer;
  return [
    [face, 0],
    [face, radius - chamfer],
    [face + chamfer, radius],
    [pocketDepth, radius],
    [pocketDepth, 0],
  ];
};

/** Build sourced outer profiles plus the round's modelling assumptions, all in millimetres. */
export const roundProfiles = (
  cartridge: MetallicCartridge,
  shape: RoundShape = roundShape(cartridge.id),
): RoundProfiles => {
  const outline = caseOutline(cartridge, shape.case.baseChamfer);
  const [mouth, mouthRadius] = outline.at(-1)!;
  const stations = projectileStations(cartridge, shape.projectile);
  if (mouthRadius <= stations.radius) {
    throw new Error('bullet is as wide as the case mouth');
  }
  const { band } = shape.projectile;
  return {
    loadedCase: loadedCaseProfile(outline, mouth, shape),
    firedCase: firedCaseProfile(outline, mouth, shape),
    bullet: bulletProfile(stations, shape.projectile.ogive),
    ...(band === null ? {} : { band: bandProfile(stations, mouth, band) }),
    primer: primerProfile(shape.primer),
  };
};
