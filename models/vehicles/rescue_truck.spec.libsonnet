// A heavy rescue truck on the fire engine's cab and locker body, its tank and ladder swapped for stowed rescue gear.
(import 'fire_engine.spec.libsonnet') + {
  rackY: 3.12, rackRear: -3.4, rackFront: 0.62, rackSide: 1.06,
  // The racking's rear face inside the body; the rear compartment runs back from it to the shutter.
  rackingRear: -3.3,
  mastX: 0.78, mastTop: 3.66,
  shutterSide: 0.84, shutterLow: 1.18, shutterTop: 2.82,
  // Each locker's fit-out for rescue gear in place of the fire engine's hose and pump stowage: its title and mass. The
  // kit it holds is its site's load-out.
  stowage: {
    fore: { title: 'Rescue truck hydraulic tool stowage', mass: 20 },
    mid: { title: 'Rescue truck lifting bag stowage', mass: 8 },
    wheel: { title: 'Rescue truck cribbing stowage', mass: 20 },
    aft: { title: 'Rescue truck generator stowage', mass: 15 },
  },
  rearStowage: { title: 'Rescue truck rear stowage', mass: 25 },
}
