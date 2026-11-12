local site = import 'site.libsonnet';
local s = import 'convertible.spec.libsonnet';
{
  title: 'Convertible',
  sites: (import 'car-sites.libsonnet')('convertible', s, {
    over: {
      engine: { at: [s.frontAxle - 0.02, 0.2, 0] },
      rear_bench: { part: 'bench_seat_3', at: [-0.6, s.floor, 0] },
      steering_wheel: { at: [s.cowl - 0.4, s.waist - 0.16, -0.37] },
      front_seat_near: { part: 'sports_car_bucket_seat', at: [-0.02, s.floor, 0.37] },
      front_seat_far: { part: 'sports_car_bucket_seat', at: [-0.02, s.floor, -0.37] },
      headlamp_near: { at: [s.front - 0.07, 0.56, 0.62] },
      headlamp_far: { at: [s.front - 0.07, 0.56, -0.62] },
    },
    add: [site.one('folded_hood', 'convertible_folded_hood')],
  }),
}
