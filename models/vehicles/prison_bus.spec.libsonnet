// A prison transport on the coach's body: the same 12.2 m high-floor chassis in plain paint, with no sign, no luggage
// doors and white pillars, so each barred window stands alone in the side. The door is solid to shoulder height.
local coach = import 'coach.spec.libsonnet';
std.objectRemoveKey(coach, 'sign') + {
  paint: 'paint-white', band: 'paint-white', pillarFinish: 'paint-white',
  bumperFinish: 'paint-charcoal',
  stripes: [],
  seats: [row { part: 'bus_seat_pair' } for row in coach.seats],
  doorKick: 2.0, doorFinish: 'paint-charcoal',
  shellMass: 10330,
  bars: { z: 0.04, width: 0.05, pitch: 0.2, rail: 0.06 },
  // Its glass, dash and end panels are the coach's pressings.
  borrow: {
    _front_panel: 'coach_front_panel', _rear_panel: 'coach_rear_panel',
    _windscreen: 'coach_windscreen', _side_window: 'coach_side_window', _rear_window: 'coach_rear_window', _dashboard: 'coach_dashboard',
  },
  bulkhead: { x: 4.04, panelTop: 2.15 },
}
