// A food truck: the step van's body with one serving window, and no sliding-door glass to compete with it.
(import 'step_van.spec.libsonnet') + {
  shellMass: 2600, paint: 'paint-crane-yellow',
  bands: [{ finish: 'paint-charcoal', y: [0.88, 1.02] }],
  slideGlass: false, rearShutter: false,
  windows: [[-2.1, -0.5]],
  borrow: { _windscreen: 'step_van_windscreen', _dashboard: 'step_van_dashboard', _rear_bumper: 'step_van_rear_bumper', _load_floor: 'step_van_load_floor' },
}
