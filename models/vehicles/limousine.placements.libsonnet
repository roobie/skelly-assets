local site = import 'site.libsonnet';
local s = import 'limousine.spec.libsonnet';
{
  sites: (import 'car-sites.libsonnet')('limousine', s, {
    over: {
      engine: { part: 'engine_v8_petrol', at: [s.frontAxle - 0.02, 0.2, 0] },
      gearbox: { part: 'gearbox_inline', at: [s.frontAxle - 0.7, 0.26, 0] },
      exhaust: { part: 'exhaust_long', at: [s.rear + 0.56, 0.2, 0.42] },
      rear_bench: { at: [-1.55, s.floor, 0] },
      front_seat_near: { at: [1.05, s.floor, 0.37] },
      front_seat_far: { at: [1.05, s.floor, -0.37] },
    },
    add: [
      site.one('stretch', 'limousine_stretch'),
      site.one('grille', 'luxury_saloon_grille', [0.65, -0.0225, 0]),
      site.one('brightwork', 'limousine_brightwork'),
      site.one('facing_seat', 'limousine_facing_seat'),
    ],
  }),
}
