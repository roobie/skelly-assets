import { GRID } from '@skelly/construct/foundation/conventions.ts';
import { mmToU, snap } from './units.ts';

type Span = readonly [number, number];
type Point = readonly [number, number];
type Polygon = readonly Point[];
type Box2 = { readonly x: Span; readonly y: Span };

/** A barrel of a published length, measured back from its threaded muzzle tip to the breech. */
export const citedBarrel = (citedLengthMm: number, threadedTipU: number) => {
  const citedLengthU = snap(mmToU(citedLengthMm));
  return { breechU: threadedTipU - citedLengthU, citedLengthU };
};

/**
 * The stock's reach behind the receiver's rear face, for a published overall length from the threaded muzzle tip
 * to the butt's rear face.
 */
export const stockReachU = (overallLengthMm: number, muzzleTipU: number, receiverRearX: number): number =>
  snap(mmToU(overallLengthMm) - muzzleTipU + receiverRearX);

/** How far a straight edge traced from `top` down to `bottom` leans forward of upright, in degrees. */
export const forwardLeanDegrees = ([topX, topY]: Point, [bottomX, bottomY]: Point): number =>
  (Math.atan2(bottomX - topX, topY - bottomY) * 180) / Math.PI;

/**
 * A disc's side profile as a regular polygon of `sides` corners around `centre`, counter-clockwise. As on a turned
 * solid with sides, `radiusU` is the distance to each flat, and with a multiple of four sides the flats face up, down,
 * forward and back, so the disc stands on its bottom flat.
 */
export const discProfile = ([centreX, centreY]: Point, radiusU: number, sides: number): Polygon => {
  const cornerRadius = radiusU / Math.cos(Math.PI / sides);
  return Array.from({ length: sides }, (_, index): Point => {
    const angle = (Math.PI * (2 * index + 1)) / sides;
    return [centreX + cornerRadius * Math.cos(angle), centreY + cornerRadius * Math.sin(angle)];
  });
};

/**
 * A frame that leans forward by `leanDegrees` about `pivot`, for shapes authored upright: `leaned` turns an upright
 * point into the gun frame, `across` reads a gun-frame point's upright x, and `atLevel` is where the leaning line
 * through upright `x` crosses the level gun-frame height `y`.
 */
export const leaningFrame = ([pivotX, pivotY]: Point, leanDegrees: number) => {
  const lean = (leanDegrees * Math.PI) / 180;
  const [cos, sin] = [Math.cos(lean), Math.sin(lean)];
  const leaned = (x: number, y: number): Point => [
    pivotX + cos * (x - pivotX) - sin * (y - pivotY),
    pivotY + sin * (x - pivotX) + cos * (y - pivotY),
  ];
  return {
    cos,
    leaned,
    across: ([x, y]: Point): number => pivotX + cos * (x - pivotX) + sin * (y - pivotY),
    atLevel: (x: number, y: number): Point => leaned(x, pivotY + (y - pivotY - sin * (x - pivotX)) / cos),
  };
};

/**
 * A box magazine authored upright in its own frame, x forward and y up its axis from the port, and leaned forward by
 * `leanDegrees` about the port. Its straight `body` is the top the well hugs. Below the body it may `bend` forward
 * through `degrees`, about a centre `radiusU` in front of its front face, in `pieces` straight pieces whose joints run
 * square across it. The `floorplate` is authored as if the bend were straightened, and turns with the bend's end, so the
 * body and floorplate stay square at every corner.
 */
export interface BoxMagazine {
  readonly port: Point;
  readonly leanDegrees: number;
  readonly body: Box2;
  readonly bend?: { readonly radiusU: number; readonly degrees: number; readonly pieces: number };
  readonly floorplate: Box2;
  readonly halfWidthU: number;
}

/** The box magazine's body, bend and floorplate, top to bottom, leaned into the gun frame. */
export const boxMagazinePieces = ({ port, leanDegrees, body, bend, floorplate }: BoxMagazine): Polygon[] => {
  const { leaned } = leaningFrame(port, leanDegrees);
  const [portX, portY] = port;
  const inGun = (points: Polygon): Polygon => points.map(([x, y]) => leaned(portX + x, portY + y));
  const box = ({ x: [x0, x1], y: [y0, y1] }: Box2): Polygon => [
    [x0, y1],
    [x0, y0],
    [x1, y0],
    [x1, y1],
  ];
  if (bend === undefined) {
    return [box(body), box(floorplate)].map(inGun);
  }
  const { radiusU, degrees, pieces } = bend;
  const [rearX, frontX] = body.x;
  const centre: Point = [frontX + radiusU, body.y[0]];
  /** A point of the straightened magazine turned through `turn` radians about the bend's centre. */
  const turned = (turn: number, [x, y]: Point): Point => {
    const [dx, dy] = [x - centre[0], y - centre[1]];
    return [
      centre[0] + Math.cos(turn) * dx - Math.sin(turn) * dy,
      centre[1] + Math.sin(turn) * dx + Math.cos(turn) * dy,
    ];
  };
  const turnAt = (piece: number) => (((degrees * piece) / pieces) * Math.PI) / 180;
  const bendPieces = Array.from({ length: pieces }, (_, piece): Polygon => {
    const [above, below] = [turnAt(piece), turnAt(piece + 1)];
    return [
      turned(above, [rearX, body.y[0]]),
      turned(below, [rearX, body.y[0]]),
      turned(below, [frontX, body.y[0]]),
      turned(above, [frontX, body.y[0]]),
    ];
  });
  const plate = box(floorplate).map((point) => turned(turnAt(pieces), point));
  return [box(body), ...bendPieces, plate].map(inGun);
};

/**
 * The lean and opening of a well that hugs a box magazine's straight body: it leans with the magazine about the port,
 * and its opening clears the body by `faceU` front and rear and by `sideU` at each side.
 */
export const leaningWell = (
  { port: [portX], leanDegrees, body, halfWidthU }: BoxMagazine,
  clearance: { readonly faceU: number; readonly sideU: number },
) => ({
  leanDegrees,
  opening: {
    x: [portX + body.x[0] - clearance.faceU, portX + body.x[1] + clearance.faceU] as const,
    halfWidthU: halfWidthU + clearance.sideU,
  },
});

/** Where a leaning well's opening crosses the level height `y`, rear to front, rounded out to the grid. */
export const wellOpeningAtLevel = (
  { leanDegrees, opening }: Pick<TracedSmgProportions['lower']['magwell'], 'leanDegrees' | 'opening'>,
  port: Point,
  y: number,
): Span => {
  const { atLevel } = leaningFrame(port, leanDegrees);
  return [Math.floor(atLevel(opening.x[0], y)[0] / GRID) * GRID, Math.ceil(atLevel(opening.x[1], y)[0] / GRID) * GRID];
};

/**
 * A toothed accessory rail on one face of a part: a base strip standing off the face and a row of teeth on it.
 * `centreU` is the rail's middle across the face: z on the top or bottom, y on a side.
 */
export interface TracedRail {
  readonly face: 'top' | 'bottom' | 'left' | 'right';
  readonly x: Span;
  readonly centreU: number;
  readonly halfWidthU: number;
  readonly baseU: number;
  readonly toothU: number;
  readonly pitchU: number;
  readonly toothLengthU: number;
}

/**
 * An open-frame stock traced extended in the gun frame: a hinge block on the receiver's rear face, a butt plate,
 * and convex bars between them. `lengthU` is the plate's rear face behind the receiver's.
 */
export interface SkeletonStockProportions {
  readonly lengthU: number;
  readonly frameHalfWidthU: number;
  readonly hinge: Box2 & { readonly halfWidthU: number };
  readonly plate: { readonly points: Polygon; readonly halfWidthU: number };
  readonly bars: Readonly<Record<string, Polygon>>;
}

/**
 * A side-traced submachine gun in the gun frame: x from the receiver's front face, y from the bore. Polygons are
 * convex pieces of the traced outline. The shared builders read only this shape; a gun's stock is its own style's.
 */
export interface TracedSmgProportions {
  readonly receiver: {
    readonly rearX: number;
    readonly frontX: number;
    readonly topU: number;
    readonly bottomU: number;
    readonly halfWidthU: number;
    readonly chamferU: number;
    /**
     * A receiver that narrows toward its top: its sides run straight up to `fromY`, then lean in to a top flat
     * `topWidthShare` of the receiver's width. Without it, the top corners are chamfered as the bottom ones are.
     */
    readonly taper?: { readonly fromY: number; readonly topWidthShare: number };
    readonly endCapSlope: { readonly from: Point; readonly to: Point };
    readonly rearLug: Box2;
    readonly rail?: TracedRail;
  };
  readonly rearSight: {
    /** Names the sight's solids, which the aperture splits into left, right, top and bottom pieces. */
    readonly name: string;
    /** The side profile of the body the aperture pierces, standing `halfWidthU` either side of the bore's plane. */
    readonly profile: Polygon;
    readonly halfWidthU: number;
    readonly aperture: { readonly eyeX: number; readonly centreY: number; readonly halfU: number };
    readonly eyeReliefU: number;
    /**
     * A base clamped across the receiver's top: a `plateU` thick plate over the top flat and, `jawU` thick, a jaw down
     * each of the receiver's shoulders to `jawToY`.
     */
    readonly clamp?: { readonly x: Span; readonly plateU: number; readonly jawU: number; readonly jawToY: number };
    /** Guards rising either side of the body: their side profile, standing `z` out from the bore's plane. */
    readonly ears?: { readonly profile: Polygon; readonly z: Span };
    /**
     * The axle the body turns on, across the gun. It stands out of the body's sides to `halfLengthU` and not through
     * the body, where the aperture crosses its line.
     */
    readonly axle?: { readonly centre: Point; readonly radiusU: number; readonly halfLengthU: number };
  };
  /** The bolt, centred on the bore: its length, its section's half-sizes and how far it recoils. */
  readonly bolt: {
    readonly lengthU: number;
    readonly halfHeightU: number;
    readonly halfWidthU: number;
    readonly travelU: number;
  };
  /** The published cyclic rate, which bounds how long the bolt's travel may take. */
  readonly cyclicRpm: number;
  /** The ejection port's opening through the port-side wall. */
  readonly ejectionPort: Box2;
  readonly barrel: {
    readonly breechU: number;
    readonly citedLengthU: number;
    readonly tipU: { readonly threaded: number; readonly plain: number };
    readonly radiusU: number;
    readonly collar: { readonly x: Span; readonly radiusU: number };
  };
  readonly frontSight: {
    readonly block: Box2 & { readonly halfWidthU: number };
    readonly tower: Box2 & { readonly halfWidthU: number };
    readonly hood: {
      readonly x: Span;
      readonly centreY: number;
      readonly outerRadiusU: number;
      readonly wallU: number;
    };
    readonly wheel?: { readonly x: Span; readonly centreY: number; readonly radiusU: number };
    readonly post: { readonly x: Span; readonly baseY: number; readonly halfWidthU: number };
  };
  readonly handguard: {
    readonly lengthU: number;
    readonly topU: number;
    readonly bottomU: number;
    readonly halfWidthU: number;
    readonly rails?: readonly TracedRail[];
  };
  readonly chargingHandle: {
    /** `rearX` is the tube's rear end from the receiver's front face; a negative one runs it back into the receiver. */
    readonly tube: { readonly centreY: number; readonly halfU: number; readonly rearX: number };
    readonly notchX: number;
    readonly knob: { readonly radiusU: number; readonly radial: Span; readonly rimRoundU: number };
    readonly notchTurnDegrees: number;
    readonly notchTurnSeconds: number;
  };
  readonly lower: {
    readonly halfWidthU: number;
    readonly housing: Polygon;
    /**
     * The well, stood upright about the magazine port: `x` spans its outer faces and `opening` the slot the
     * magazine rides in. It leans forward with the magazine by `leanDegrees`, turned about the port, so its walls
     * run along the magazine; its mouth at `y[0]` stays square to the lean, and its top at `y[1]` stays level where
     * it meets the receiver.
     */
    readonly magwell: Box2 & {
      readonly leanDegrees: number;
      readonly opening: { readonly x: Span; readonly halfWidthU: number };
    };
    readonly trigger: Polygon;
    readonly triggerFinger: Box2;
    /** The guard's inner edge, rear to front: two rear-wall points, the bottom pair, two front-wall points. */
    readonly guard: { readonly path: readonly [Point, Point, Point, Point, Point, Point]; readonly halfWidthU: number };
  };
  readonly grip: {
    readonly mount: Point;
    readonly leanDegrees: number;
    readonly halfWidthU: number;
    readonly pieces: readonly Polygon[];
  };
  readonly magazine: { readonly port: Point; readonly halfWidthU: number; readonly pieces: readonly Polygon[] };
}
