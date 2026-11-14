// A two-axle fire engine: 8.1 m long, 2.5 m wide, with a four-door crew cab, roller-shutter lockers and a roof ladder.
{
  rear: -4.1, front: 4.0, side: 1.24, face: 3.92, cabBack: 0.85, doorRear: 2.22,
  doorFront: 3.6, crew: [0.95, 2.12],
  floor: 1.22, waist: 2.14, roof: 2.92, lean: 0.14,
  frontAxle: 3.0, rearAxles: [-1.95],
  wheel: 'wheel_295_80r22_5', r: 0.522, wheelW: 0.295,
  // A modern European fire engine brakes on air discs.
  wheelBrakes: 'disc',
  railBottom: 0.74, railTop: 0.99,
  engine: 'engine_i6_heavy_diesel', engineLength: 1.12, gearbox: 'gearbox_heavy', radiator: 'radiator_truck',
  paint: 'paint-red',
  bumperPaint: 'paint-white',
  chassisMass: 1200, shellMass: 2200,
  guard: false,
  // Locker body
  bodyRear: -3.85, bodyFront: 0.85, bodyLow: 0.72, bodyFloor: 1.15, bodyTop: 3.0, bodySide: 1.24, ladderY: 3.26,
  // The roller-shutter lockers along each side and their shutters' titles: each shutter is a part that opens on its own.
  lockers: {
    fore: 'Fire engine fore locker shutter',
    mid: 'Fire engine mid locker shutter',
    wheel: 'Fire engine wheel locker shutter',
    aft: 'Fire engine aft locker shutter',
  },
  lockersMass: 450,
  // The rear wheel arch's ends, which the lockers beside it stop short of.
  archRear: self.rearAxles[0] - self.r - 0.1,
  archFront: self.rearAxles[0] + self.r + 0.1,
  // Each locker's span along the body; its shutter sits in the wall's skin depth.
  lockerSpans: {
    fore: [-0.5, $.bodyFront - 0.08],
    mid: [$.archFront + 0.02, -0.6],
    wheel: [$.archRear + 0.02, $.archFront - 0.02],
    aft: [$.bodyRear + 0.08, $.archRear - 0.02],
  },
  // The lockers' back wall stands outboard of the water tank and the rescue truck's racking, which fill the middle.
  lockerBack: 0.86,
  // What each locker stows, a part on each side: its title and mass.
  stowage: {
    fore: { title: 'Fire engine breathing apparatus stowage', mass: 140 },
    mid: { title: 'Fire engine hand tool stowage', mass: 45 },
    wheel: { title: 'Fire engine hose stowage', mass: 170 },
    aft: { title: 'Fire engine portable pump stowage', mass: 120 },
  },
  rearWallMass: 120,
}
