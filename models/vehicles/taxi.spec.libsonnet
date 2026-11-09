// The saloon's body in cab yellow. Metres in the vehicle frame.
(import 'saloon.spec.libsonnet') + {
  paint: 'paint-signal-yellow', bumperPaint: 'paint-charcoal',
  // All but its bumpers are the saloon's pressings.
  borrow: {
    _windscreen: 'saloon_windscreen', _tail_lamp: 'saloon_tail_lamp', _dashboard: 'saloon_dashboard',
    _bonnet: 'saloon_bonnet', _front_wing: 'saloon_front_wing', _front_door: 'saloon_front_door', _rear_door: 'saloon_rear_door', _boot_lid: 'saloon_boot_lid', _shell: 'saloon_shell',
  },
}
