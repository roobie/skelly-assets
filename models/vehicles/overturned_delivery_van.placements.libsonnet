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
  overlaps: [
    site.overlap('chassis', 'engine', 0.071,
      'The roll tore the engine from its mounts and drove its gearbox down through the floor pan onto the front axle.'),
    site.overlap('chassis', 'wheel_front_up', 0.08,
      'The front drum runs up into the rim of the wheel on it.'),
    site.overlap('chassis', 'wheel_rear_road', 0.091,
      'The rear axle runs on into the hub of the wheel on it.'),
    site.overlap('chassis', 'wheel_rear_up', 0.061,
      'The rear axle runs on into the rim of the wheel on it.'),
    site.overlap('shell', 'bumper', 0.041,
      'The roll bent the bumper back into the wing.'),
    site.overlap('shell', 'engine', 0.161,
      'The roll tore the engine from its mounts and drove its gearbox down through the floor pan onto the front axle.'),
    site.overlap('shell', 'shelving', 0.081,
      'The roll tore the shelving from its fixings and threw it against the wheel tub.'),
    site.overlap('shell', 'wheel_rear_road', 0.191,
      'The roll crushed the body down onto the rear wheels, whose tyres stand up through its buckled floor.'),
    site.overlap('shell', 'wheel_rear_up', 0.191,
      'The roll crushed the body down onto the rear wheels, whose tyres stand up through its buckled floor.'),
    site.overlap('shelving', 'parcels', 0.191,
      'The roll threw the parcels through the shelving\'s buckled shelves.'),
  ],
}
