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
    ]
    + site.pair('front_door_brightwork', 'luxury_saloon_front_door_brightwork', rides='front_door')
    + site.pair('rear_door_brightwork', 'luxury_saloon_rear_door_brightwork', rides='rear_door'),
  }),
}
