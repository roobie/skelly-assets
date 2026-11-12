local site = import 'site.libsonnet';
local s = import 'dirt_bike.spec.libsonnet';
local raised = [0, s.engineLift, 0];
{
  title: 'Dirt bike',
  sites: [
    site.one('frame', 'dirt_bike_frame'),
    site.one('engine', 'motorbike_engine', raised),
    site.one('exhaust', 'dirt_bike_exhaust'),
    site.one('race_stand', 'dirt_bike_race_stand'),
    site.one('swingarm', 'dirt_bike_swingarm'),
    site.one('shock', 'dirt_bike_shock'),
    site.one('rear_wheel', 'dirt_bike_rear_wheel', [s.rearAxle, s.rearHub, 0]),
    site.one('fork', 'dirt_bike_fork'),
    site.one('front_wheel', 'dirt_bike_front_wheel', [s.frontAxle, s.frontHub, 0]),
    site.one('front_mudguard', 'dirt_bike_front_mudguard'),
    site.one('number_plate', 'dirt_bike_number_plate'),
    site.one('handlebar', 'dirt_bike_handlebar'),
    site.one('tank', 'dirt_bike_tank'),
    site.one('seat', 'dirt_bike_seat'),
    site.one('rear_mudguard', 'dirt_bike_rear_mudguard'),
    site.one('tail_lamp', 'tail_lamp_small', [-1.14, 0.88, 0]),
  ]
  + site.pair('footrest', 'motorbike_footrest', raised)
  + site.pair('side_panel', 'dirt_bike_side_panel'),
  unjudged: [
    site.unjudged('frame', 'swingarm', 0.08,
      'The pivot_plate piece of dirt_bike_frame runs into the pivot_tube piece of dirt_bike_swingarm.'),
    site.unjudged('tank', 'seat', 0.05,
      'The tank piece of dirt_bike_tank runs into the saddle_nose piece of dirt_bike_seat.'),
  ],
}
