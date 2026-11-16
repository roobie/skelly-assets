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
  overlaps: [
    site.overlap('crushed_nose', 'front_wheel_far', 0.126,
      'The crash drove the crushed nose back over the front wheels, so its folds bury the front of each tyre.'),
    site.overlap('crushed_nose', 'front_wheel_near', 0.131,
      'The crash drove the crushed nose back over the front wheels, so its folds bury the front of each tyre.'),
    site.overlap('crushed_nose', 'engine', 0.331,
      'The crushed nose is drawn as a solid mass through the engine bay, so the engine block sits inside it.'),
    site.overlap('front_bumper', 'front_wheel_far', 0.116,
      'The bar ends of the crumpled bumper are driven into the front of the flat front wheel.'),
    site.overlap('front_bumper', 'front_wheel_near', 0.081,
      'The bar ends of the crumpled bumper are driven into the front of the flat front wheel.'),
    site.overlap('shell', 'crushed_nose', 0.06,
      'The top plate of the crushed nose folds back over the front edge of the shell.'),
    site.overlap('front_wheel_far', 'shell', 0.071,
      'The flat tyres have let the buckled shell down onto its wheels, which stand up through its floor pan.'),
    site.overlap('front_wheel_near', 'shell', 0.131,
      'The flat tyres have let the buckled shell down onto its wheels, which stand up through its floor pan.'),
    site.overlap('rear_wheel_far', 'shell', 0.216,
      'The flat tyres have let the buckled shell down onto its wheels, which stand up through its floor pan.'),
    site.overlap('rear_wheel_near', 'shell', 0.216,
      'The flat tyres have let the buckled shell down onto its wheels, which stand up through its floor pan.'),
  ],
  unjudged: [
    site.unjudged('crushed_nose', 'front_bumper', 0.033,
      'The crushed nose\'s face runs into the crumpled bumper\'s bar.'),
    site.unjudged('engine', 'front_bumper', 0.17,
      'The crumpled bumper\'s bar runs through the engine block.'),
    site.unjudged('engine', 'shell', 0.101,
      'The engine block stands through the bulkhead: the crash may be meant to have driven it back.'),
  ],
}
