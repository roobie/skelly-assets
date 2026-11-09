// A utility truck on the box truck's measures in white: a locker body, and an insulated boom folded back along it with the basket over the tail.
(import 'box_truck.spec.libsonnet') + {
  paint: 'paint-white',
  chassisMass: 2900, shellMass: 1140,
  bodyRear: -3.72, bodyFront: 1.86, bodyLow: 0.98, deckTop: 1.5, lockerIn: 0.72, lockerBottom: 0.9,
  turretX: -2.05, boomY: 2.46, boomTopY: 2.82, knuckleX: 1.2, cradleX: 0.45,
  // The cab's glass, bumpers and guards are the box truck's pressings.
  borrow: { _windscreen: 'box_truck_windscreen', _rear_underrun: 'box_truck_rear_underrun', _mudguard: 'box_truck_mudguard', _front_bumper: 'box_truck_front_bumper' },
  basketFront: -3.1, basketRear: -3.88, basketFloor: 1.72, basketTop: 2.86,
}
