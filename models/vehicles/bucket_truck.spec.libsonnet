// A utility truck on the box truck's measures in white: a locker body, and an insulated boom folded back along it with the basket over the tail.
(import 'box_truck.spec.libsonnet') + {
  paint: 'paint-white',
  bodyRear: -3.72, bodyFront: 1.86, bodyLow: 0.98, deckTop: 1.5, lockerIn: 0.72, lockerBottom: 0.9,
  turretX: -2.05, boomY: 2.46, boomTopY: 2.82, knuckleX: 1.2, cradleX: 0.45,
  // The chassis, the cab and its glass, dash, door, bumpers and guards are the box truck's pressings; the boom's weight
  // rides on its own parts, so stripping them lightens the truck.
  borrow: {
    _chassis: 'box_truck_chassis', _cab: 'box_truck_cab', _dashboard: 'box_truck_dashboard', _front_panel: 'box_truck_front_panel', _door: 'box_truck_door',
    _windscreen: 'box_truck_windscreen', _rear_underrun: 'box_truck_rear_underrun', _mudguard: 'box_truck_mudguard', _front_bumper: 'box_truck_front_bumper',
  },
  basketFront: -3.1, basketRear: -3.88, basketFloor: 1.72, basketTop: 2.86,
}
