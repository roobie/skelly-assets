// A six-wheel-drive airport crash tender: 11.2 m long, 3.0 m wide, about 4 m to the top of its roof turret, on
// 14.00 R25 flotation tyres. It weighs about 21 t empty and 35 t laden with 12,500 l of water and 1,500 l of foam
// concentrate, which its tanks carry as cargo rather than as their own mass.
{
  rear: -5.6, front: 5.6, side: 1.5, face: 5.36, cabBack: 2.9, doorRear: 3.98,
  crew: [2.98, 3.9],
  floor: 1.65, waist: 2.23, roof: 3.27, lean: 0.32,
  frontAxle: 3.9, rearAxles: [-1.6, -3.2],
  wheel: 'wheel_385_95r25', r: 0.685, wheelW: 0.385,
  // An off-road truck's single flotation tyres, braked on air discs.
  wheelBrakes: 'disc',
  twinRear: false,
  // Every axle is driven, the front one through a transfer case behind the gearbox.
  frontAxlePart: 'drive_axle_wide', rearAxlePart: 'beam_axle_wide',
  // The frame stands high on the wide axles' lift blocks, so it clears rough ground off the runway. The rails stand far
  // enough apart for the V8's block, intake and exhaust manifolds to sit between them, over the axles' spring seats.
  railBottom: 1.15, railTop: 1.45, railZ: 0.72,
  engine: 'engine_v8_diesel_heavy', engineLength: 1.15, gearbox: 'gearbox_heavy', radiator: 'radiator_truck',
  // The V8 stands too tall to sit under the cab floor over the front axle, so it sits behind the front wheel wells,
  // under the cab's back and the body's front, with the front shaft passing under its block. The radiator ahead drops
  // to stay under the cab floor, the exhaust passes under the rear axles, and the fuel tank and battery hang behind the
  // engine.
  engineX: 2.35, engineY: 0.53, radiatorY: 0.63, exhaustY: 0.41, tankX: 1.35,
  // The transfer case's middle and half length, and the span of each shaft it drives: the front one to the face of the
  // front axle's differential, the rear one back to the first rear axle.
  transferX: 0.6, transferHalf: 0.2,
  frontShaft: [self.transferX + self.transferHalf, self.frontAxle - 0.2],
  rearShaft: [self.rearAxles[0], self.transferX - self.transferHalf],
  paint: 'paint-lime-yellow',
  chassisMass: 3800, shellMass: 2300,
  transferCaseMass: 160, frontShaftMass: 40, rearShaftMass: 32,
  guard: false,
  // Locker body
  bodyRear: -5.52, bodyFront: 2.82, bodyLow: 1.07, bodyFloor: 1.6, bodyTop: 3.55, bodySide: 1.5,
  // Roof turret on the cab roof and bumper turret on the front bumper, both aimed straight ahead.
  turretX: 3.62, bumperTurretX: 5.48,
  bodyMass: 5600, waterTankMass: 1600, foamTankMass: 260, pumpMass: 720, lockersMass: 520,
  turretMountMass: 140, turretMass: 210, bumperTurretMass: 70, roofRailMass: 90, ladderMass: 30,
}
