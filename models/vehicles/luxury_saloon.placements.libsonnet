local site = import 'site.libsonnet';
local s = import 'luxury_saloon.spec.libsonnet';
{
  title: 'Luxury saloon',
  sites: (import 'car-sites.libsonnet')('luxury_saloon', s, {
    over: {
      engine: { part: 'engine_v8_petrol' },
      gearbox: { part: 'gearbox_inline', at: [s.frontAxle - 0.7, 0.26, 0] },
      rear_bench: { at: [-0.75, s.floor, 0] },
    },
    add: [
      site.one('grille', 'luxury_saloon_grille'),
      site.one('brightwork', 'luxury_saloon_brightwork'),
    ],
  }),
  swingUnjudged: [
    site.swingUnjudged('boot_lid', 'shell', 0.0196, 'skin meets boot_side_far'),
    site.swingUnjudged('front_door_far', 'brightwork', 0.0168, 'skin_far meets front_sill_far'),
    site.swingUnjudged('front_door_near', 'brightwork', 0.0118, 'trim meets front_sill_near'),
    site.swingUnjudged('rear_door_far', 'brightwork', 0.0168, 'skin_far meets rear_sill_far'),
    site.swingUnjudged('rear_door_near', 'brightwork', 0.0118, 'trim meets rear_sill_near'),
  ],
}
