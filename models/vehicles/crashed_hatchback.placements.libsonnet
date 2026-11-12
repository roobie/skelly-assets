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
    site.overlap('crushed_nose', 'engine',
      'The crushed_nose draws its own block block where the engine part is also placed, so that volume is drawn twice; the owner decides which to drop or shrink.'),
  ],
}
