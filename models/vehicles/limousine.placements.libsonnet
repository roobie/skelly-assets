local site = import 'site.libsonnet';
local s = import 'limousine.spec.libsonnet';
{
  title: 'Limousine',
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
  swingUnjudged: [
    site.swingUnjudged('boot_lid', 'shell', 0.0196, 'skin meets boot_side_far'),
    site.swingUnjudged('front_door_far', 'brightwork', 0.0118, 'glass_0_far meets front_belt_far'),
    site.swingUnjudged('front_door_near', 'brightwork', 0.0118, 'glass_0 meets front_belt_near'),
    site.swingUnjudged('rear_door_far', 'brightwork', 0.0118, 'glass_0_far meets rear_belt_far'),
    site.swingUnjudged('rear_door_near', 'brightwork', 0.0118, 'glass_0 meets rear_belt_near'),
  ],
}
