import { GRID } from '@skelly/construct/foundation/conventions.ts';
import {
  type BoxMagazine,
  boxMagazinePieces,
  citedBarrel,
  leaningFrame,
  leaningWell,
  stockReachU,
  type TracedSmgProportions,
} from './tracedSmgProportions.ts';

const barrelTipThreadedU = 17.5;
// The photo shows only threaded muzzles; the plain cut keeps the thread's length off the tip.
const barrelTipPlainU = 16.5;
// The cited barrel length runs from the threaded muzzle tip back to the breech.
const barrel = citedBarrel(225, barrelTipThreadedU);
const receiverRearX = -24.25;
// The receiver's floor ahead of the magazine well, which the photo puts about 2 below the bore.
const receiverBottomU = -2;
// The photo's magazine bends steadily forward below the well, from about 12 degrees at the mouth to about 35 at the
// floorplate, so no straight box fits it: one leaning at its average rake would push the well into the trigger
// housing. Its straight top leans as the photo's rear face does at the mouth and runs down to the mouth, where the
// bend starts; the bend's radius and sweep are fitted to the photo's front and rear faces and its floorplate's tilt,
// all within about 0.15.
const magazine = {
  port: [-5, -3],
  leanDegrees: 12,
  body: { x: [-1.5, 1.5], y: [-2.5, 0] },
  bend: { radiusU: 28, degrees: 24.5, pieces: 4 },
  floorplate: { x: [-1.5, 1.5], y: [-3.25, -2.5] },
  halfWidthU: 1,
} as const satisfies BoxMagazine;
const magazinePieces = boxMagazinePieces(magazine);
// The well hugs the straight top down to its mouth, where the bend starts.
const magwell = {
  x: [-7, -3],
  y: [magazine.port[1] + magazine.body.y[0], receiverBottomU],
  ...leaningWell(magazine, { faceU: 0.05, sideU: 0.25 }),
} as const;
const housingBottomU = -5.75;
// The housing's front runs down the well's leaning rear face, so no gap opens between them.
const housingFront = [housingBottomU, receiverBottomU].map((y) =>
  leaningFrame(magazine.port, magazine.leanDegrees).atLevel(magwell.x[0], y),
);
// The bolt recoils, rounded up to the grid, until its face clears the magazine's rearmost corner, so the next round
// can rise in front of it.
const magazineRearX = Math.min(...magazinePieces.flat().map(([x]) => x));
const boltTravelU = Math.ceil((barrel.breechU - magazineRearX) / GRID) * GRID;

/**
 * The notched cocking tube and knob traced from the compact SMG's photo. Every SMG handle starts from it: an untraced
 * section's handle takes its knob and notch turn, and a traced gun overrides only what its reference shows differently.
 */
export const SMG_CHARGING_HANDLE = {
  tube: { centreY: 2.5, halfU: 0.75, rearX: 0 },
  // The photo shows the knob held in the notch; notchX sits one GRID ahead of the traced 0.75 so the knob's
  // hand space clears the receiver's front face.
  notchX: 1,
  // The side photo hides the knob's reach from the tube; its stem holds it clear of the handguard's side.
  // The close-up shows a short knob, about half as long as it is wide, with a rounded outer rim.
  knob: { radiusU: 0.75, radial: [2, 2.75], rimRoundU: 0.25 },
  notchTurnDegrees: 45,
  // A visual estimate for the notch turn.
  notchTurnSeconds: 0.1,
} as const satisfies TracedSmgProportions['chargingHandle'];

const stockLengthU = (overallLengthMm: number): number =>
  stockReachU(overallLengthMm, barrelTipThreadedU, receiverRearX);

/**
 * Side-photo trace estimates in the gun frame: x from the receiver's front face, y from the bore.
 * See `packages/gun-authoring-tool/docs/compact-smg-export.md`, "Reference trace". Polygons are convex pieces of the traced outline.
 */
export const COMPACT_SMG_PROPORTIONS = {
  receiver: {
    rearX: receiverRearX,
    frontX: 0,
    topU: 3.25,
    bottomU: receiverBottomU,
    halfWidthU: 2.25,
    chamferU: 0.25,
    // The pressed receiver narrows toward the claw-mount top. The photo's side shows the first upward-facing band at
    // about 2.25; it is side-on, so the top's width is a share of the receiver's, estimated from the MP5's section.
    taper: { fromY: 2.25, topWidthShare: 0.6 },
    // The end cap slopes forward from its rear face to the roof.
    endCapSlope: { from: [receiverRearX, 1.25], to: [-23, 3.25] },
    // The block under the receiver's rear that the trigger housing pins to.
    rearLug: { x: [-23.25, -20], y: [-3.5, receiverBottomU] },
  },
  // The drum is an inclined disc on its base; the photo shows its side.
  rearSight: {
    name: 'drum',
    profile: [
      [-18.75, 4],
      [-16, 3.5],
      [-15.5, 4.5],
      [-17, 5],
      [-18, 4.75],
    ],
    base: { x: [-19, -16.25], y: [3.25, 3.5] },
    halfWidthU: 0.75,
    // The eye looks through a square hole across the drum's thickest part, at least one gun voxel each way.
    aperture: { eyeX: -16.75, centreY: 4.25, halfU: 0.25 },
    // An estimate of the shooter's eye behind the drum with the cheek on the stock.
    eyeReliefU: 6,
  },
  // Closed on the breech, the bolt reaches back over the whole magazine opening and ejection port, a square section
  // centred on the bore that the receiver's floor just clears.
  bolt: { lengthU: 5, halfHeightU: 1.25, halfWidthU: 1.25, travelU: boltTravelU },
  // The MP5's published rate (HK MP5 specification).
  cyclicRpm: 800,
  // The photo shows the left side, which has no port, so the opening is proportioned as the polymer SMG's drawing
  // has it: its top flush with the bolt's, about two-thirds the bolt's height, over the spent case at full recoil.
  ejectionPort: { x: [-7, -3], y: [-0.5, 1.25] },
  barrel: {
    ...barrel,
    tipU: { threaded: barrelTipThreadedU, plain: barrelTipPlainU },
    radiusU: 0.625,
    collar: { x: [14.75, 15.25], radiusU: 0.875 },
  },
  // The sight housing caps the cocking tube's front; the hood ring's axis is the bore's.
  frontSight: {
    block: { x: [11, 12.75], y: [-1, 3.25], halfWidthU: 1 },
    tower: { x: [12.75, 14.25], y: [-1, 3.25], halfWidthU: 0.75 },
    hood: { x: [12.75, 14.25], centreY: 4.5, outerRadiusU: 1.4, wallU: 0.25 },
    // The knurled wheel that stands proud of the housing's front face under the hood.
    wheel: { x: [14.25, 14.5], centreY: 2.375, radiusU: 0.875 },
    // The post's tip is the drum aperture's height; see `parts.ts`, `tracedSmgBarrelDetails`.
    post: { x: [13.25, 13.75], baseY: 3.25, halfWidthU: 0.125 },
  },
  handguard: { lengthU: 11, topU: 1.75, bottomU: -1.75, halfWidthU: 1.75 },
  chargingHandle: SMG_CHARGING_HANDLE,
  lower: {
    halfWidthU: 1.5,
    // The housing's flat bottom is the grip's mount face.
    housing: [[-20, -3.75], [-18.5, housingBottomU], ...housingFront, [-20, receiverBottomU]],
    magwell,
    // The blade hangs from the guard's top bar inside the finger space.
    trigger: [
      [-13, -6],
      [-12, -8.5],
      [-11.5, -8.5],
      [-12.25, -6],
    ],
    // The finger space is the guard's inner box, one bar's clearance inside its rear and front walls.
    triggerFinger: { x: [-13.5, -10.25], y: [-9.25, -6] },
    // The guard's inner edge, rear to front; its bar lies on the outside of this path. The rear wall's
    // first two points and the front wall's last two are its sloped walls; the middle pair is its bottom.
    guard: {
      path: [
        [-14.25, -6],
        [-14.75, -8],
        [-13.75, -9.25],
        [-10, -9.25],
        [-9.25, -8.25],
        [-8.75, -6],
      ],
      halfWidthU: 0.375,
    },
  },
  grip: {
    mount: [-16.25, -5.75],
    leanDegrees: 30,
    halfWidthU: 1.25,
    pieces: [
      [
        [-18.5, -5.75],
        [-22.25, -11.25],
        [-22.25, -11.75],
        [-19.25, -13.75],
        [-18, -13.75],
        [-16.75, -11.25],
        [-16, -9.25],
        [-16.25, -8],
      ],
      // The grip's front meets the guard's rear wall along its outer edge.
      [
        [-16.25, -8],
        [-15, -8],
        [-14.4375, -5.75],
        [-18.5, -5.75],
      ],
    ],
  },
  magazine: { port: magazine.port, halfWidthU: magazine.halfWidthU, pieces: magazinePieces },
  // Overall lengths run from the muzzle tip to the butt pad's rear face. The pad and struts are traced
  // extended; collapsing slides them forward by the difference of the published lengths.
  stock: {
    overallLengthMm: { telescopingExtended: 700, telescopingCollapsed: 550, fixed: 680 },
    lengthU: {
      telescopingExtended: stockLengthU(700),
      telescopingCollapsed: stockLengthU(550),
      fixed: stockLengthU(680),
    },
    pad: [
      [
        [-42.75, -9],
        [-41.5, -8.25],
        [-40.5, -3],
        [-43.5, -8.25],
      ],
      [
        [-43.5, -8.25],
        [-40.5, -3],
        [-39.5, 1],
        [-43, 1.5],
      ],
    ],
    padHalfWidthU: 1.5,
    strut: { frontX: receiverRearX, y: [-1.75, -0.25], z: [1.25, 1.75] },
    latch: { x: [-27.25, receiverRearX], y: [-2, 0.75], halfWidthU: 1.5 },
    lever: { x: [receiverRearX, -23.25], y: [-3.75, receiverBottomU], halfWidthU: 0.25 },
  },
} as const;
