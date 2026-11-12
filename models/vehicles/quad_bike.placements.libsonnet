local site = import 'site.libsonnet';
local s = import 'quad_bike.spec.libsonnet';
{
  title: 'Quad bike',
  sites: [
    site.one('frame', 'quad_bike_frame'),
    site.one('swing_arm', 'quad_bike_swing_arm'),
    site.one('front_fenders', 'quad_bike_front_fenders'),
    site.one('rear_fenders', 'quad_bike_rear_fenders'),
    site.one('front_rack', 'quad_bike_front_rack'),
    site.one('rear_rack', 'quad_bike_rear_rack'),
    site.one('seat', 'quad_bike_seat'),
    site.one('tank', 'quad_bike_tank'),
    site.one('engine', 'quad_bike_engine'),
    site.one('exhaust', 'quad_bike_exhaust'),
    site.one('handlebar', 'quad_bike_handlebar'),
    site.one('battery', 'car_battery', [-0.38, 0.56, 0]),
  ]
  + site.pair('footboard', 'quad_bike_footboard')
  + site.pair('front_arm', 'quad_bike_front_arm')
  + site.pair('front_wheel', 'quad_bike_wheel', [s.frontAxle, s.hub, s.wheelZ])
  + site.pair('rear_wheel', 'quad_bike_wheel', [s.rearAxle, s.hub, s.wheelZ])
  + site.pair('tail_lamp', 'tail_lamp_small', [-1.0, 0.6, 0.12])
  + site.pair('headlamp', 'quad_bike_headlamp', [1.0, 0.62, 0.11]),
  unjudged: [
    site.unjudged('front_fenders', 'front_arm_far', 0.05,
      'The fender_top_far piece of quad_bike_front_fenders runs into the shock_far piece of quad_bike_front_arm.'),
    site.unjudged('front_fenders', 'front_arm_near', 0.05,
      'The fender_top_near piece of quad_bike_front_fenders runs into the shock piece of quad_bike_front_arm.'),
    site.unjudged('seat', 'tank', 0.05,
      'The base piece of quad_bike_seat runs into the tank piece of quad_bike_tank.'),
    site.unjudged('swing_arm', 'rear_fenders', 0.06,
      'The shock_mount piece of quad_bike_swing_arm runs into the deck piece of quad_bike_rear_fenders.'),
  ],
}
