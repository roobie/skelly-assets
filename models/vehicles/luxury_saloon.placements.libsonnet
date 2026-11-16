local site = import 'site.libsonnet';
local s = import 'luxury_saloon.spec.libsonnet';
{
  title: 'Luxury saloon',
  sites: (import 'car-sites.libsonnet')('luxury_saloon', s, {
    engine: { name: 'v8_petrol' },
    over: {
      gearbox: { part: 'gearbox_inline', at: s.gearboxAt },
      rear_bench: { at: [-0.75, s.floor, 0] },
    },
    add: [
      site.one('grille', 'luxury_saloon_grille'),
    ]
    + site.pair('front_door_brightwork', 'luxury_saloon_front_door_brightwork', rides='front_door')
    + site.pair('rear_door_brightwork', 'luxury_saloon_rear_door_brightwork', rides='rear_door'),
  }),
  unjudged: [
    site.unjudged('air_box', 'bonnet', 0.042,
      'The air box stands through the bonnet\'s skin.'),
  ],
}
