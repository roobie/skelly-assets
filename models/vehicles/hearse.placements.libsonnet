local site = import 'site.libsonnet';
local s = import 'hearse.spec.libsonnet';
{
  title: 'Hearse',
  sites: (import 'car-sites.libsonnet')('hearse', s, {
    drop: ['rear_bench'],
    over: {
      engine: { part: 'engine_v6_petrol' },
      fuel_tank: { at: [s.rearAxle + 0.75, s.sill, 0] },
    },
    add: [
      site.one('coach', 'hearse_coach'),
      site.one('curtains', 'hearse_curtains'),
      site.one('grille', 'hearse_grille'),
      site.one('deck', 'hearse_deck'),
      site.one('partition', 'hearse_partition'),
      site.one('brightwork', 'hearse_brightwork'),
    ],
  }),
  swingUnjudged: [
    site.swingUnjudged('bonnet', 'shell', 0.0083, 'skin meets a_post_far'),
  ],
}
