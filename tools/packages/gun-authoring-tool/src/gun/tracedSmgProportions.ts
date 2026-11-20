import { GRID } from '@skelly/construct/foundation/conventions.ts';
import { mmToU } from './units.ts';

type Span = readonly [number, number];
type Point = readonly [number, number];
type Polygon = readonly Point[];
type Box2 = { readonly x: Span; readonly y: Span };

const snap = (value: number): number => Math.round(value / GRID) * GRID;

/**
 * The stock's reach behind the receiver's rear face, for a published overall length from the threaded muzzle tip
 * to the butt's rear face.
 */
export const stockReachU = (overallLengthMm: number, muzzleTipU: number, receiverRearX: number): number =>
  snap(mmToU(overallLengthMm) - muzzleTipU + receiverRearX);

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
    readonly topFlatHalfWidthU: number;
    readonly endCapSlope: { readonly from: Point; readonly to: Point };
    readonly rearLug: Box2;
    /** The opening through the shell's floor; without it the section's default stands. */
    readonly magazineWellX?: Span;
    readonly rail?: TracedRail;
  };
  readonly rearSight: {
    /** Names the sight's solids, which the aperture splits into left, right, top and bottom pieces. */
    readonly name: string;
    readonly profile: Polygon;
    readonly base?: Box2;
    readonly halfWidthU: number;
    readonly aperture: { readonly eyeX: number; readonly centreY: number; readonly halfU: number };
    readonly eyeReliefU: number;
  };
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
    readonly hood: { readonly x: Span; readonly centreY: number; readonly outerRadiusU: number; readonly wallU: number };
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
    readonly tube: { readonly centreY: number; readonly halfU: number };
    readonly notchX: number;
    readonly knob: { readonly radiusU: number; readonly radial: Span; readonly rimRoundU: number };
    readonly notchTurnDegrees: number;
    readonly notchTurnSeconds: number;
  };
  readonly lower: {
    readonly halfWidthU: number;
    readonly housing: Polygon;
    readonly magwell: Box2 & { readonly wallU: number; readonly innerHalfWidthU: number };
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
