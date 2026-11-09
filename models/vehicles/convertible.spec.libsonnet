// A two-door convertible on a coupe's measures, hood folded: only the windscreen stands above the waist. Metres in the vehicle frame.
(import 'coupe.spec.libsonnet') + {
  roof: 1.2, aLean: 0.42,
  open: true,
  shellMass: 690, paint: 'paint-red',
  // Its dash and the panels below its waist are the coupe's pressings.
  borrow: {
    _dashboard: 'coupe_dashboard', _bonnet: 'coupe_bonnet', _front_wing: 'coupe_front_wing', _boot_lid: 'coupe_boot_lid',
    _front_bumper: 'coupe_front_bumper', _rear_bumper: 'coupe_rear_bumper',
  },
}
