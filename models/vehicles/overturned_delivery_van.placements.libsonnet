local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'overturned_delivery_van.spec.libsonnet';
local hubAcross = s.across - s.hub;
local seatAcross = s.across - s.floor;
{
  title: 'Overturned delivery van',
  sites: [
    one('shell', 'overturned_delivery_van_shell'),
    one('chassis', 'overturned_delivery_van_chassis'),
    one('bonnet', 'overturned_delivery_van_bonnet'),
    one('bumper', 'overturned_delivery_van_bumper'),
    one('engine', 'overturned_delivery_van_engine'),
    one('cab_door_up', 'overturned_delivery_van_cab_door_sprung'),
    one('cab_door_road', 'overturned_delivery_van_cab_door'),
    one('rear_door_upper', 'overturned_delivery_van_rear_door_upper'),
    one('rear_door_lower', 'overturned_delivery_van_rear_door_lower'),
    one('shelving', 'overturned_delivery_van_shelving'),
    one('parcels', 'overturned_delivery_van_parcels'),
    one('seat_up', 'overturned_delivery_van_seat', [0.75, s.up + 0.5, seatAcross]),
    one('seat_road', 'overturned_delivery_van_seat', [0.75, s.up - 0.5, seatAcross]),
    one('wheel_front_up', 'overturned_delivery_van_wheel', [s.frontAxle, s.up + s.wheelZ, hubAcross]),
    one('wheel_rear_up', 'overturned_delivery_van_wheel', [s.rearAxle, s.up + s.wheelZ, hubAcross]),
    one('wheel_rear_road', 'overturned_delivery_van_wheel', [s.rearAxle, s.up - s.wheelZ, hubAcross]),
    // Sheared off in the roll, it has rolled clear and fallen flat on the road.
    one('wheel_loose', 'overturned_delivery_van_wheel', [3.3, 0.11, 1.5]),
  ],
  unjudged: [
    site.unjudged('chassis', 'wheel_front_up', 0.08,
      'The drum piece of overturned_delivery_van_chassis runs into the rim piece of overturned_delivery_van_wheel.'),
    site.unjudged('chassis', 'wheel_rear_road', 0.059,
      'The axle_rear piece of overturned_delivery_van_chassis runs into the rim piece of overturned_delivery_van_wheel.'),
    site.unjudged('chassis', 'wheel_rear_up', 0.059,
      'The axle_rear piece of overturned_delivery_van_chassis runs into the rim piece of overturned_delivery_van_wheel.'),
  ],
}
