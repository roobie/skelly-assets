// The saloon's measures in patrol livery, with a heavier shell for its reinforced fittings. Metres in the vehicle frame.
(import 'saloon.spec.libsonnet') + {
  paint: 'paint-police-blue', doorPaint: 'paint-white', roofPaint: 'paint-white', bumperPaint: 'plastic-black',
  shellMass: 870,
  // Its glass, lamps, dash and opening panels are the saloon's pressings; its shell and bumpers differ.
  borrow: {
    _windscreen: 'saloon_windscreen', _tail_lamp: 'saloon_tail_lamp', _dashboard: 'saloon_dashboard',
    _bonnet: 'saloon_bonnet', _front_wing: 'saloon_front_wing', _front_door: 'saloon_front_door', _rear_door: 'saloon_rear_door', _boot_lid: 'saloon_boot_lid',
  },
}
