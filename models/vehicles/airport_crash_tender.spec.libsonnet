// A six-wheel-drive airport crash tender: 11.2 m long, 3.0 m wide, 3.6 m to the roof turret, on 14.00 R25 flotation
// tyres. It weighs about 21 t empty and 35 t laden with 12,500 l of water and 1,500 l of foam concentrate, which its
// tanks carry as cargo rather than as their own mass.
{
  rear: -5.6, front: 5.6, side: 1.5, face: 5.36, cabBack: 2.9, doorRear: 3.98,
  crew: [2.98, 3.9],
  floor: 1.5, waist: 2.08, roof: 3.12, lean: 0.32,
  frontAxle: 3.9, rearAxles: [-1.6, -3.2],
  wheel: 'wheel_385_95r25', r: 0.685, wheelW: 0.385,
  // An off-road truck's single flotation tyres, braked on air discs, on driven axles front and rear.
  wheelBrakes: 'disc',
  twinRear: false,
  frontAxlePart: 'beam_axle_wide', rearAxlePart: 'beam_axle_wide',
  railBottom: 1.0, railTop: 1.3,
  engine: 'engine_v8_diesel_heavy', engineLength: 1.15, gearbox: 'gearbox_heavy', gearboxLength: 0.95, radiator: 'radiator_truck',
  // The sump clears the front axle's differential below it.
  engineY: 0.84,
  paint: 'paint-lime-yellow',
  chassisMass: 3800, shellMass: 2300,
  guard: false,
  // Locker body
  bodyRear: -5.52, bodyFront: 2.82, bodyLow: 0.92, bodyFloor: 1.45, bodyTop: 3.4, bodySide: 1.5,
  // Roof turret on the cab roof and bumper turret on the front bumper, both aimed straight ahead.
  turretX: 3.62, bumperTurretX: 5.48,
  bodyMass: 5600, waterTankMass: 1600, foamTankMass: 260, pumpMass: 720,
}
