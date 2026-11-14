// A six-wheel-drive airport crash tender: 11.2 m long, 3.0 m wide, about 4 m to the top of its roof turret, on
// 14.00 R25 flotation tyres. It weighs about 21 t empty and 35 t laden with 12,500 l of water and 1,500 l of foam
// concentrate, which its tanks carry as cargo rather than as their own mass.
{
  rear: -5.6, front: 5.6, side: 1.5, face: 5.36, cabBack: 2.9, doorRear: 3.98,
  crew: [2.98, 3.9],
  floor: 1.5, waist: 2.08, roof: 3.12, lean: 0.32,
  frontAxle: 3.9, rearAxles: [-1.6, -3.2],
  wheel: 'wheel_385_95r25', r: 0.685, wheelW: 0.385,
  // An off-road truck's single flotation tyres, braked on air discs.
  wheelBrakes: 'disc',
  twinRear: false,
  frontAxlePart: 'steered_axle_wide', rearAxlePart: 'beam_axle_wide',
  // The rails stand far enough apart for the V8's block and heads to sit between them.
  railBottom: 1.0, railTop: 1.3, railZ: 0.55,
  engine: 'engine_v8_diesel_heavy', engineLength: 1.15, gearbox: 'gearbox_heavy', radiator: 'radiator_truck',
  // The V8 stands too tall to sit under the cab floor over the front axle, so it sits low behind the front wheel wells,
  // under the cab's back and the body's front, with its gearbox between the same two crossmembers. The radiator ahead
  // and the exhaust beneath drop to stay under the floors, and the fuel tank and battery hang behind the engine.
  engineX: 2.35, engineY: 0.33, radiatorY: 0.48, exhaustY: 0.2, tankX: 1.35,
  paint: 'paint-lime-yellow',
  chassisMass: 3800, shellMass: 2300,
  guard: false,
  // Locker body
  bodyRear: -5.52, bodyFront: 2.82, bodyLow: 0.92, bodyFloor: 1.45, bodyTop: 3.4, bodySide: 1.5,
  // The roller-shutter lockers along each side and their shutters' titles: each shutter is a part that opens on its own.
  lockers: {
    fore: 'Airport crash tender fore locker shutter',
    mid: 'Airport crash tender mid locker shutter',
    wheel_fore: 'Airport crash tender fore wheel locker shutter',
    wheel_aft: 'Airport crash tender aft wheel locker shutter',
    aft: 'Airport crash tender aft locker shutter',
  },
  // Roof turret on the cab roof and bumper turret on the front bumper, both aimed straight ahead.
  turretX: 3.62, bumperTurretX: 5.48,
  bodyMass: 5600, waterTankMass: 1600, foamTankMass: 260, pumpMass: 720, lockersMass: 520,
  turretMountMass: 140, turretMass: 210, bumperTurretMass: 70, roofRailMass: 90, ladderMass: 30,
  // The lockers' back wall stands just outboard of the water and foam tanks, which fill the middle.
  lockerBack: 0.94,
  // What each locker stows, a part on each side: its title and mass.
  stowage: {
    fore: { title: 'Airport crash tender breathing apparatus stowage', mass: 150 },
    mid: { title: 'Airport crash tender hose stowage', mass: 160 },
    wheel_fore: { title: 'Airport crash tender rescue tool stowage', mass: 70 },
    wheel_aft: { title: 'Airport crash tender extinguisher stowage', mass: 140 },
    aft: { title: 'Airport crash tender pump panel', mass: 60 },
  },
}
