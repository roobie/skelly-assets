// A forward-control 4x4 hard-top on portal axles: 4.35 m long with its spare, 1.93 m wide, 2.17 m high, on a 2.3 m
// wheelbase and about 2.3 t empty. The crew sit behind the front axle with the six between them under a cover.
local six = (import 'engines.libsonnet').i6_petrol;
{
  frontAxle: 1.165, rearAxle: -1.135, hub: 0.431, wheelZ: 0.775,
  tyreWidth: 0.285, tyreOuter: 0.431, rimRadius: 0.2032,

  // The body's outline: the side leans in from the belt to the eaves, and the front and rear lean in above the belt.
  nose: 2.095, front: 2.175, rear: -1.86, rearDrip: -1.765, rearBumper: -2.005,
  cowl: 1.965, head: 1.705,
  side: 0.92, eaves: 0.85, bumperHalf: 0.965, skin: 0.04, voxel: 0.03125, leanBands: 3,
  sill: 0.76, noseLow: 0.96, rearLow: 0.885, belt: 1.43, drip: 2.05, roofUnder: 2.13, roof: 2.17,
  windowLow: 1.62, windowHigh: 2.0, screenLow: 1.55, screenHigh: 2.02, screenHalf: 0.82, seal: 0.03125,

  // Each arch is a trapezoid, as [x, y] corners; the sill rises diagonally into it.
  frontArch: { foreBase: [1.705, 0.8], foreHead: [1.475, 1.08], aftHead: [0.995, 1.08], aftBase: [0.695, 0.76] },
  rearArch: { foreBase: [-0.725, 0.76], foreHead: [-0.885, 1.11], aftHead: [-1.435, 1.11], aftBase: [-1.575, 0.885] },
  wellIn: 0.63,

  // Side openings, front to back.
  cabDoor: { rear: 0.945, fore: 1.925, low: 0.84, step: 1.12, stepFore: 1.5, stepAft: 1.0, stepAftTop: 1.18, foot: 1.73, split: 1.32 },
  pillarWindow: [0.655, 0.885],
  sideDoor: { rear: -0.455, fore: 0.335, low: 0.97, window: [-0.415, 0.295], strip: [-0.375, 0.245] },
  rearCorner: -1.645, swages: [1.66, 1.86], stripY: 1.23, rearStrip: [-1.735, -0.535],

  // The single rear door between its corner panels.
  rearDoor: { half: 0.525, low: 0.93, top: 2.0, windowLow: 1.65, windowHigh: 1.94, stile: 0.06 },
  spareY: 1.33,

  // The face, as heights and half widths.
  grille: { low: 0.98, high: 1.33, half: 0.28, slots: 4, frame: 0.03125 },
  lampZ: 0.7, headlampY: 1.08, indicatorY: 1.27, blackoutAt: [1.49, 0.63],
  bumper: { low: 0.84, high: 0.95, gussetZ: 0.38, gussetDrop: 0.25 },
  rearBumperY: [0.76, 0.89], tailLampY: 0.89, flapZ: [0.565, 0.955], flapLow: 0.36,

  // Underneath. The half shafts run above the hubs in drop boxes, so the differentials stand well off the ground.
  shaftHigh: 0.59, diffLow: 0.39, diffHigh: 0.75, diffHalf: 0.12, portalZ: [0.54, 0.625],
  springZ: 0.46, springBase: 0.65, springHalf: 0.55,
  railZ: [0.42, 0.5], railLow: 0.74, railTop: 0.86, railFore: 2.0, crossmembers: [-1.78, -0.85, 1.75],
  driveY: 0.5, shaftRadius: 0.04, engineX: 0.62, engineY: 0.56, gearboxLength: 0.62, gearboxHeight: 0.3,
  airBoxAt: [1.32, 0.76, 0],
  transferLow: 0.44, transferHeight: 0.4, transferHalf: 0.2,

  // The driveline in line behind the engine, so each part's end is where the next begins.
  crankY: self.engineY + six.height * 0.2,
  gearboxX: self.engineX - six.length / 2 - self.gearboxLength / 2,
  transferX: self.gearboxX - self.gearboxLength / 2 - self.transferHalf,
  frontShaft: [self.transferX + self.transferHalf, self.frontAxle - self.diffHalf],
  rearShaft: [self.rearAxle + self.diffHalf, self.transferX - self.transferHalf],

  // The silencer's pipe ends ahead of its site, where the downpipe drops to meet it; the downpipe runs in the gap
  // over the rails and under the cab floor, across to the manifold on the block's far side.
  exhaustAt: [-0.38, 0.6, -0.54], exhaustReach: 1.4, exhaustPipeTop: 0.1,
  downpipe: { half: 0.03, x: [0.85, 0.91], low: 0.875, high: 0.935, manifoldTop: 0.94, manifoldZ: [-0.272, -0.222] },

  // Inside.
  rearFloor: 0.91, floorUnder: 0.88, cabFloor: 0.98, cabFloorUnder: 0.95, floorStep: 0.36,
  coverBack: 0.1, coverFore: 1.16, coverHalf: 0.34, coverTop: 1.32,
  tunnelBack: 1.56, tunnelHalf: 0.42, tunnelTop: 1.38,
  seatX: 0.62, seatZ: 0.59, wheelX: 1.24, wheelY: 1.5, crewSeatX: -1.15, crewSeatZ: 0.64,

  dashboard: { back: 1.6, top: 1.6, half: 0.86 },
  hinges: { cab: [0.98, 1.36], side: [1.07, 1.36], rear: [1.0, 1.42] },

  mass: {
    hull: 640, frame: 230, axle: 170, wheel: 58, spare: 68, transfer: 45, frontShaft: 12, rearShaft: 5, downpipe: 3,
    cabDoor: 42, sideDoor: 45, rearDoor: 40, frontBumper: 34, rearBumper: 34, grille: 6, windscreen: 22,
    dashboard: 15, engineCover: 14, crewSeat: 12, jerryCan: 22, headlamp: 1.5, blackoutLamp: 0.8, tailLamp: 1.2,
    wiper: 0.3, mirror: 1.5,
  },
}
