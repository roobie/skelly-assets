local site = import 'site.libsonnet';
local s = import 'luxury_saloon.spec.libsonnet';
{
  title: 'Luxury saloon',
  sites: (import 'car-sites.libsonnet')('luxury_saloon', s, {
    engine: { name: 'v8_petrol' },
    over: {
      gearbox: { part: 'gearbox_inline', at: [s.frontAxle - 0.7, 0.26, 0] },
      rear_bench: { at: [-0.75, s.floor, 0] },
    },
    add: [
      site.one('grille', 'luxury_saloon_grille'),
      site.one('brightwork', 'luxury_saloon_brightwork'),
    ],
  }),
}
