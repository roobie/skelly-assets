local site = import 'site.libsonnet';
local s = import 'minivan.spec.libsonnet';
{
  title: 'Minivan',
  sites: (import 'car-sites.libsonnet')('minivan', s, {
    over: {
      front_seat_near: { at: [s.cowl - 0.57, s.floor, 0.42] },
      front_seat_far: { at: [s.cowl - 0.57, s.floor, -0.42] },
      rear_bench: { at: [-0.5, s.floor, 0] },
      exhaust: { at: [s.rear + 0.46, s.sill, 0.42] },
      headlamp_near: { at: [s.front - 0.07, 0.72, 0.62] },
      headlamp_far: { at: [s.front - 0.07, 0.72, -0.62] },
      battery_tray: { at: [s.aPost + 0.25, 0.56, -0.44] },
      battery: { at: [s.aPost + 0.25, 0.59, -0.44] },
    },
    add: [
      site.one('third_row', 'bench_seat_3', [-1.5, 0.56, 0]),
      site.one('door_track', 'minivan_door_track'),
    ],
  }),
  unjudged: [
    site.unjudged('shell', 'third_row', 0.063,
      'The cushion piece of minivan_shell runs into the rear_liner_top_near piece of bench_seat_3.'),
  ],
}
