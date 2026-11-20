import { GRID } from '@skelly/construct/foundation/conventions.ts';
import { mmToU } from './units.ts';

const snap = (value: number): number => Math.round(value / GRID) * GRID;

// The muzzle is traced; the cited barrel and overall lengths then place the breech and the butt's heel.
const muzzleX = 36.75;
const citedBarrelLengthU = snap(mmToU(520));
const citedOverallLengthU = snap(mmToU(1021));

/**
 * Side-photo trace estimates in the gun frame: x from the receiver's front face, y from the bore.
 * See `packages/gun-authoring-tool/docs/sks-export.md`. Polylines run rear to front; polygons are convex and wound
 * counter-clockwise in the side view.
 */
export const SKS_PROPORTIONS = {
  receiver: {
    x: [-27.25, 0],
    y: [-1.25, 2],
    halfWidthU: 1,
    chamferU: 0.25,
    wallU: 0.5,
    cavity: { y: [-0.75, 1.5], halfWidthU: 0.5 },
    // Ahead of the top cover the receiver is open over the carrier and down its right wall, where the knob runs.
    window: { x: [-18, -6.5], y: [0.25, 2.5], z: [-0.5, 1.5] },
    // Cases leave to the right through the window, from its right wall outwards.
    ejection: { x: [-16, -11], y: [0.25, 1.5], reachU: 1.5 },
    triggerGroupX: -16,
    // The rear sight's base stands on the receiver's front roof.
    rearSightX: -3.5,
  },
  carrier: {
    x: [-18, -8.75],
    y: [-0.5, 1.25],
    halfWidthU: 0.25,
    // Its rear runs under the top cover at full stroke, short of the receiver's rear wall.
    travelU: 7,
    // The knob stands off the carrier's right side; it reaches past the cut-away wall, not over the roof.
    knob: { centre: [-9.25, 1.5], radiusU: 0.5, z: [0.25, 1.5] },
  },
  barrel: {
    muzzleX,
    breechX: muzzleX - citedBarrelLengthU,
    citedLengthU: citedBarrelLengthU,
    radiusU: 0.5,
    gasBlock: { x: [20.5, 21.75], y: [-1, 2], halfWidthU: 0.75 },
    // The clamp the folded bayonet hinges on.
    lug: { x: [30.25, 31.75], y: [-1.25, 0.75], halfWidthU: 0.5 },
    sightBase: { x: [33.5, 36], y: [-1, 0.75], halfWidthU: 0.75 },
  },
  handguard: {
    // The wooden cover rides on the gas tube from the receiver's front to the band.
    cover: { x: [0, 12], y: [0.5, 2.25], halfWidthU: 0.875, chamferU: 0.25 },
    band: { x: [12, 12.5], y: [0.5, 2.25], halfWidthU: 1 },
    gasTube: { x: [12.5, 20.5], centreY: 1.25, radiusU: 0.625 },
  },
  frontSight: {
    post: { x: [34.625, 34.875], y: [0.75, 2.75], halfWidthU: 0.125 },
    hood: { x: [33.75, 35.75], y: [0.75, 3.5], wallZ: [0.5, 0.75], roofU: 0.25 },
  },
  rearSight: {
    base: { x: [-6.25, -0.5], y: [2, 2.25], halfWidthU: 0.625 },
    // The tangent leaf lies along the base, rising back to its notch block.
    leaf: [
      [-4.75, 2.25],
      [-0.75, 2.25],
      [-4.25, 2.5],
      [-4.75, 2.5],
    ],
    leafHalfWidthU: 0.5,
    notch: { x: [-4.75, -4.25], y: [2.5, 2.75], gapHalfU: 0.125 },
  },
  lower: {
    housing: { x: [-26, -6.5], y: [-4.25, -1.25], halfWidthU: 0.75 },
    finger: { x: [-25, -20.75], y: [-7.25, -4.5], halfWidthU: 0.75 },
    // A corner rounds off at most twice the wall, or the loop's bars would stand clear of its sides.
    guard: { wallU: 0.25, clearanceU: 0.25, cornerU: 0.5, halfWidthU: 0.375 },
    trigger: [
      [-23.75, -6.25],
      [-23.25, -6.5],
      [-22.75, -4.5],
      [-23.25, -4.5],
    ],
    triggerHalfWidthU: 0.25,
    // The fixed magazine hangs ahead of the guard, deepest at its rear.
    magazine: [
      [-14.25, -4.25],
      [-14.25, -6.75],
      [-13.75, -7.25],
      [-6.5, -5],
      [-6.5, -4.25],
    ],
    magazineHalfWidthU: 1,
  },
  stock: {
    // The steel butt plate is raked: the heel stands behind the toe.
    butt: { heelX: muzzleX - citedOverallLengthU, toeX: -51, plateU: 0.25 },
    top: [
      [-52, -3],
      [-36, -2.25],
      [-32.5, -3],
      [-29.5, -2],
      [-28, -1.25],
      [-27.25, -0.75],
      [-26.5, -0.25],
      [0, -0.25],
      [1, 0.5],
      [12, 0.5],
    ],
    bottom: [
      [-51, -12.25],
      [-35.25, -8.25],
      [-33.5, -8],
      [-31.5, -7],
      [-30.25, -6],
      [-28, -4.75],
      [-26, -4.25],
      [-6.5, -4.25],
      [3, -3.25],
      [12, -2],
    ],
    halfWidth: [
      [-52, 1.5],
      [-36, 1.5],
      [-32, 1.25],
      [-28, 1.375],
      [0, 1.375],
      [12, 1.125],
    ],
    combX: -36,
    // The palm wraps the straight wrist behind the guard.
    palm: [-31, -4.5, 0],
    // Each metal part's channel: cut down from the stock's top to `above`, or up from its belly to `below`.
    inlets: {
      receiver: { x: [-27.25, 0], above: -1.25, halfWidthU: 1 },
      triggerGroup: { x: [-26, -6.5], below: -1.25, halfWidthU: 0.75 },
      barrel: { x: [0, 12], above: -0.75, halfWidthU: 0.625 },
      bayonet: { x: [6.25, 12], below: -1.25, halfWidthU: 0.375 },
    },
  },
  // The bayonet is drawn folded back under the barrel, its blade let into the fore-end.
  bayonet: {
    hinge: { x: [30.25, 31.75], y: [-2.5, -1.25] },
    handle: { x: [26.5, 30.25], y: [-2.75, -1.5] },
    crossguard: { x: [25.25, 26.5], y: [-5.25, -1.25] },
    blade: [
      [6.5, -3],
      [25.25, -3.375],
      [25.25, -1.5],
      [8.75, -1.75],
    ],
    halfWidthU: 0.25,
    hingeHalfWidthU: 0.5,
  },
} as const;
