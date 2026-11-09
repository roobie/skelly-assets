// The saloon's measures in patrol livery, with a heavier shell for its reinforced fittings. Metres in the vehicle frame.
(import 'saloon.spec.libsonnet') + {
  paint: 'paint-police-blue', doorPaint: 'paint-white', roofPaint: 'paint-white', bumperPaint: 'plastic-black',
  shellMass: 870,
  // Its glass, lamps and dash are the saloon's pressings, its paint showing only on the panels.
  borrow: { _windscreen: 'saloon_windscreen', _tail_lamp: 'saloon_tail_lamp', _dashboard: 'saloon_dashboard' },
}
