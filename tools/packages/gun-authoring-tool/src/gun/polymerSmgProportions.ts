import { SMG_CHARGING_HANDLE } from './compactSmgProportions.ts';
import {
  type BoxMagazine,
  boxMagazinePieces,
  citedBarrel,
  forwardLeanDegrees,
  leaningWell,
  stockReachU,
} from './tracedSmgProportions.ts';

const barrelTipThreadedU = 16;
// The reference shows only a threaded muzzle; the plain cut keeps the thread's length off the tip.
const barrelTipPlainU = 15;
const receiverRearX = -22.5;
const receiverTopU = 3.5;
const receiverBottomU = -2.5;
const receiverHalfWidthU = 2;
const receiverChamferU = 0.25;
// The handguard and the nose block it runs into are much narrower than the receiver behind them.
const frontHalfWidthU = 1.5;
// The cited barrel length runs from the threaded muzzle tip back to the breech.
const barrel = citedBarrel(200, barrelTipThreadedU);
// A straight box tilted forward along the reference's rear face, square at every corner: its top hides in the well,
// which hugs it in thin walls down to about the guard's depth, and its floorplate stands proud of the body where the
// reference's lands.
const magazine = {
  port: [-7, -3],
  leanDegrees: forwardLeanDegrees([-9, -3], [-5.25, -20]),
  body: { x: [-2, 1.75], y: [-17, 0] },
  floorplate: { x: [-2.25, 2], y: [-17.75, -17] },
  halfWidthU: 1,
} as const satisfies BoxMagazine;
const magwell = {
  x: [-9.5, -4.75],
  y: [-5.5, receiverBottomU],
  ...leaningWell(magazine, { faceU: 0.05, sideU: 0.25 }),
} as const;

/**
 * Side-reference trace estimates in the gun frame: x from the receiver's front face, y from the bore. The
 * reference is a drawing scaled to the published 690 mm extended length; see
 * `packages/gun-authoring-tool/docs/polymer-smg-export.md`. Polygons are convex pieces of the traced outline.
 */
export const POLYMER_SMG_PROPORTIONS = {
  receiver: {
    rearX: receiverRearX,
    frontX: 0,
    topU: receiverTopU,
    bottomU: receiverBottomU,
    halfWidthU: receiverHalfWidthU,
    chamferU: receiverChamferU,
    topFlatHalfWidthU: receiverHalfWidthU - receiverChamferU,
    // A short chamfer rounds the slab's top rear edge into the stock hinge.
    endCapSlope: { from: [receiverRearX, 3], to: [-22, receiverTopU] },
    rearLug: { x: [receiverRearX, -22], y: [-3.25, -2.5] },
    // A full-length top rail on a riser, ahead of the rear sight.
    rail: {
      face: 'top',
      x: [-18.25, -1.5],
      centreU: 0,
      halfWidthU: 1,
      baseU: 1,
      toothU: 0.5,
      pitchU: 1,
      toothLengthU: 0.5,
    },
  },
  // The sight is a hump on the rail's rear end; its aperture clears the rail along the sight line.
  rearSight: {
    name: 'hump',
    profile: [
      [-22, receiverTopU],
      [-21.75, 4.5],
      [-20.5, 6.25],
      [-18.25, 6.25],
      [-18.25, receiverTopU],
    ],
    halfWidthU: 1,
    aperture: { eyeX: -19.5, centreY: 5.5, halfU: 0.25 },
    eyeReliefU: 6,
  },
  // Closed on the breech, the bolt fills the whole ejection port, as the reference shows it through the opening.
  // It is centred on the bore, so it stands as far below the bore as the port's top stands above it. It recoils no
  // further than the cocking handle can pull it, which takes its face behind the magazine's opening and leaves the
  // spent case under the port.
  bolt: { lengthU: 9.25, halfHeightU: 1.5, halfWidthU: 1.25, travelU: 8.25 },
  // The UMP9's published rate (Heckler & Koch UMP, Wikipedia): slower than the compact SMG's, as its long travel needs.
  cyclicRpm: 700,
  // The reference's dark opening inside the port's frame, which stands a little above the bore.
  ejectionPort: { x: [-10.5, -5.75], y: [-0.5, 1.5] },
  barrel: {
    ...barrel,
    tipU: { threaded: barrelTipThreadedU, plain: barrelTipPlainU },
    radiusU: 0.625,
    collar: { x: [12, 14.75], radiusU: 1 },
  },
  // The handguard's nose block caps the cocking tube; a tall hood ring guards the post.
  frontSight: {
    block: { x: [8.25, 12], y: [-2.75, 2.75], halfWidthU: frontHalfWidthU },
    tower: { x: [8.75, 11.25], y: [2.75, 4.5], halfWidthU: 1 },
    hood: { x: [8.75, 11.25], centreY: 5.5, outerRadiusU: 1, wallU: 0.25 },
    post: { x: [9.75, 10.25], baseY: 4.5, halfWidthU: 0.125 },
  },
  // The reference runs the handguard on flush with the receiver's top and bottom, the cocking tube sunk in its top;
  // slotted rails run along both sides and the bottom, ahead of the receiver and behind the nose block.
  handguard: {
    lengthU: 8.25,
    topU: receiverTopU,
    bottomU: receiverBottomU,
    halfWidthU: frontHalfWidthU,
    rails: (['left', 'right', 'bottom'] as const).map((face) => ({
      face,
      x: [0.75, 7.5] as const,
      centreU: face === 'bottom' ? 0 : -0.5,
      halfWidthU: 1,
      baseU: 0.25,
      toothU: 0.25,
      pitchU: 1,
      toothLengthU: 0.5,
    })),
  },
  // The same notched tube and knob as the compact SMG's, lower on the receiver. The reference's slot reaches back to
  // about -2, into the receiver; the tube stops at the closed bolt's face on the breech, which it would otherwise
  // overlap, and the notch's stem slot sits one wall ahead of that. The knob stands off the receiver's wider side far
  // enough to turn up into that notch clear of its top edge.
  chargingHandle: {
    ...SMG_CHARGING_HANDLE,
    tube: { ...SMG_CHARGING_HANDLE.tube, centreY: 2, rearX: barrel.breechU },
    notchX: barrel.breechU + 0.5,
    knob: { ...SMG_CHARGING_HANDLE.knob, radial: [2.5, 3.25] },
  },
  // One polymer piece: the housing, the large guard and the well, with the grip's front as the guard's rear.
  lower: {
    halfWidthU: 1.75,
    // The housing's flat bottom is the grip's mount face and the guard's top.
    housing: [
      [-22, -2.5],
      [-22, -3.25],
      [-21.25, -4],
      [-9.5, -4],
      [-9.5, -2.5],
    ],
    magwell,
    trigger: [
      [-15, -4.25],
      [-14.5, -6.25],
      [-14, -6.25],
      [-14.25, -4.25],
    ],
    triggerFinger: { x: [-15.5, -11], y: [-7, -4.25] },
    guard: {
      path: [
        [-16.5, -4.25],
        [-16.5, -6],
        [-15.75, -7],
        [-10.75, -7],
        [-10, -6.25],
        [-9.75, -4.25],
      ],
      halfWidthU: 0.5,
    },
  },
  grip: {
    mount: [-19, -4],
    leanDegrees: 20,
    halfWidthU: 1.25,
    pieces: [
      [
        [-21, -4],
        [-16.75, -4],
        [-19.75, -13],
        [-23.25, -11.5],
        [-23.75, -10.25],
      ],
      // The grip's front fills forward to the guard's upright rear wall, which it meets along its outer face.
      [
        [-16.75, -4],
        [-16.75, -6],
        [-17.75, -7],
      ],
    ],
  },
  magazine: {
    port: magazine.port,
    halfWidthU: magazine.halfWidthU,
    pieces: boxMagazinePieces(magazine),
  },
  // The side-folding skeleton stock, traced extended: an open frame of bars between a hinge block on the
  // receiver's rear face and the butt plate. The overall length runs from the muzzle tip to the plate's rear face.
  stock: {
    overallLengthMm: 690,
    lengthU: stockReachU(690, barrelTipThreadedU, receiverRearX),
    frameHalfWidthU: 0.75,
    hinge: { x: [-25.5, receiverRearX], y: [-2, 3.25], halfWidthU: 1.5 },
    plate: {
      points: [
        [-44, 1.75],
        [-42, 1.75],
        [-42, -7.5],
        [-43.75, -7.5],
        [-44, -7.25],
      ],
      halfWidthU: 1.5,
    },
    bars: {
      top: [
        [-42, 1.5],
        [-29, 1.5],
        [-29, 0],
        [-42, 0],
      ],
      neck: [
        [-29, 1.5],
        [-27, 2.5],
        [-25.5, 2.75],
        [-25.5, -1],
        [-29, 0],
      ],
      lower: [
        [-42, -7.5],
        [-42, -6],
        [-25.5, -1],
        [-25.5, -2.5],
      ],
      strut: [
        [-35.25, 0],
        [-33.75, 0],
        [-34.5, -4],
        [-36, -4.25],
      ],
    },
  },
} as const;
