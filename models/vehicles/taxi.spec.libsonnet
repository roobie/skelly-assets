// The saloon's body in cab yellow. Metres in the vehicle frame.
(import 'saloon.spec.libsonnet') + {
  paint: 'paint-signal-yellow', bumperPaint: 'paint-charcoal',
  // Its glass, lamps and dash are the saloon's pressings, its paint showing only on the panels.
  borrow: { _windscreen: 'saloon_windscreen', _tail_lamp: 'saloon_tail_lamp', _dashboard: 'saloon_dashboard' },
}
