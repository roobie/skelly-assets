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
      // A two-seat third row fits between the rear wheel arches; a three-seat one would stand on their liners.
      site.one('third_row', 'bench_seat_2', [-1.5, 0.56, 0]),
      site.one('door_track', 'minivan_door_track'),
    ],
  }),
}
