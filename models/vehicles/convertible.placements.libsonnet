local site = import 'site.libsonnet';
local s = import 'convertible.spec.libsonnet';
{
  title: 'Convertible',
  sites: (import 'car-sites.libsonnet')('convertible', s, {
    engine: { at: [s.frontAxle - 0.02, 0.2, 0] },
    over: {
      rear_bench: { part: 'bench_seat_3', at: [-0.6, s.floor, 0] },
      // The cat can runs under the floor pan beneath the rear bench, its top at the pan's underside.
      exhaust: { at: [s.rear + 0.46, s.floor - 0.18, 0.42] },
      // The tank hangs under the floor pan beneath the rear bench, mirrored so that its filler neck leaves on the far
      // side, clear of the cat can.
      fuel_tank: { at: [s.rearAxle + 0.65, s.floor - 0.16, 0], mirror: true },
      steering_wheel: { at: [s.cowl - 0.4, s.waist - 0.16, -0.37] },
      front_seat_near: { part: 'sports_car_bucket_seat', at: [-0.02, s.floor, 0.37] },
      front_seat_far: { part: 'sports_car_bucket_seat', at: [-0.02, s.floor, -0.37] },
      headlamp_near: { at: [s.front - 0.07, 0.56, 0.62] },
      headlamp_far: { at: [s.front - 0.07, 0.56, -0.62] },
    },
    add: [site.one('folded_hood', 'convertible_folded_hood')],
  }),
  unjudged: [
    site.unjudged('folded_hood', 'rear_bench', 0.045,
      'The folded hood\'s tonneau runs into the rear bench\'s back.'),
    site.unjudged('folded_hood', 'shell', 0.041,
      'The folded hood\'s tonneau runs into the boot\'s side.'),
  ],
}
