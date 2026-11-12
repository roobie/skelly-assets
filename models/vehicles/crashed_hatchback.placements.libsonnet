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
    one('rear_bench', 'crashed_hatchback_rear_bench', [-0.72, s.floor + 0.02, 0]),
    one('front_wheel_near', 'crashed_hatchback_flat_wheel', [s.frontNear, s.axleY, s.wheelZ]),
    one('front_wheel_far', 'crashed_hatchback_flat_wheel', [s.frontFar, s.axleY, -s.wheelZ]) + { mirror: true },
  ]
  + pair('tail_lamp', 'crashed_hatchback_tail_lamp')
  + pair('front_seat', 'crashed_hatchback_front_seat', [-0.02, s.floor, 0.37])
  + pair('rear_wheel', 'crashed_hatchback_flat_wheel', [s.rearAxle, s.axleY, s.wheelZ]),
  overlaps: [
    site.overlap('crushed_nose', 'engine', 0.25,
      'The crash has driven the crushed nose mass back over the engine block.'),
    site.overlap('front_bumper', 'front_wheel_far', 0.063,
      'The flat front wheel is pushed in under the crumpled bumper.'),
    site.overlap('front_bumper', 'front_wheel_near', 0.063,
      'The flat front wheel is pushed in under the crumpled bumper.'),
    site.overlap('rear_bench', 'rear_wheel_far', 0.06,
      'The flat rear wheel has sunk up into the rear bench cushion.'),
    site.overlap('rear_bench', 'rear_wheel_near', 0.06,
      'The flat rear wheel has sunk up into the rear bench cushion.'),
    site.overlap('shell', 'crushed_nose', 0.06,
      'The crushed nose is folded back into the shell.'),
  ],
}
