local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'food_truck.spec.libsonnet';
{
  title: 'Food truck',
  sites: van.fittings(site.kit, 'food_truck', s) + [
    site.one('counter', 'food_truck_counter'),
    site.one('awning', 'food_truck_awning'),
    site.one('kitchen', 'food_truck_kitchen'),
    site.one('flue', 'food_truck_flue'),
  ]
  + site.pair('door_step', 'door_step_walk_in', [s.bFront, 0.3, s.side]),
  unjudged: [
    site.unjudged('exhaust', 'rear_axle', 0.054,
      'The silencer piece of exhaust_long runs into the beam piece of beam_axle_van.'),
  ],
}
