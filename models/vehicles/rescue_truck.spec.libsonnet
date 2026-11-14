// A heavy rescue truck on the fire engine's cab and locker body, its tank and ladder swapped for stowed rescue gear.
(import 'fire_engine.spec.libsonnet') + {
  rackY: 3.12, rackRear: -3.4, rackFront: 0.62, rackSide: 1.06,
  // The racking's rear face inside the body; the rear compartment runs back from it to the shutter.
  rackingRear: -3.3,
  mastX: 0.78, mastTop: 3.66,
  shutterSide: 0.84, shutterLow: 1.18, shutterTop: 2.82,
  // Rescue gear in place of the fire engine's hose and pump stowage.
  stowage: {
    fore: { title: 'Rescue truck hydraulic tool stowage', mass: 260 },
    mid: { title: 'Rescue truck lifting bag stowage', mass: 110 },
    wheel: { title: 'Rescue truck cribbing stowage', mass: 150 },
    aft: { title: 'Rescue truck generator stowage', mass: 160 },
  },
  rearStowage: { title: 'Rescue truck rear stowage', mass: 120 },
}
