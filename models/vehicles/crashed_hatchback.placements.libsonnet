local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'crashed_hatchback.spec.libsonnet';
{
  title: 'Crashed hatchback',
  sites: [
    one('shell', 'crashed_hatchback_shell'),
    one('crushed_nose', 'crashed_hatchback_crushed_nose'),
    one('windscreen', 'crashed_hatchback_windscreen'),
    one('tailgate', 'crashed_hatchback_tailgate'),
    one('rear_bumper', 'crashed_hatchback_rear_bumper'),
    one('front_bumper', 'crashed_hatchback_front_bumper'),
    one('dash', 'crashed_hatchback_dash'),
    one('engine', 'crashed_hatchback_engine', [0.95, s.floor - 0.1, 0]),
    one('rear_bench', 'crashed_hatchback_rear_bench', [-0.65, s.floor + 0.02, 0]),
    one('front_wheel_near', 'crashed_hatchback_flat_wheel', [s.frontNear, s.axleY, s.wheelZ]),
    one('front_wheel_far', 'crashed_hatchback_flat_wheel', [s.frontFar, s.axleY, -s.wheelZ]) + { mirror: true },
  ]
  + pair('tail_lamp', 'crashed_hatchback_tail_lamp')
  + pair('front_seat', 'crashed_hatchback_front_seat', [-0.02, s.floor, 0.37])
  + pair('rear_wheel', 'crashed_hatchback_flat_wheel', [s.rearAxle, s.axleY, s.wheelZ]),
  unjudged: [
    site.unjudged('crushed_nose', 'engine', 0.25,
      'The crushed_mass piece of crashed_hatchback_crushed_nose runs into the block piece of crashed_hatchback_engine.'),
    site.unjudged('front_bumper', 'front_wheel_far', 0.063,
      'The bar_2_3 piece of crashed_hatchback_front_bumper runs into the tyre_far piece of crashed_hatchback_flat_wheel.'),
    site.unjudged('front_bumper', 'front_wheel_near', 0.063,
      'The bar_24_1 piece of crashed_hatchback_front_bumper runs into the tyre piece of crashed_hatchback_flat_wheel.'),
    site.unjudged('shell', 'crushed_nose', 0.06,
      'The near_45_10 piece of crashed_hatchback_shell runs into the top_0_19 piece of crashed_hatchback_crushed_nose.'),
  ],
}
