local site = import 'site.libsonnet';
local s = import 'hearse.spec.libsonnet';
{
  title: 'Hearse',
  sites: (import 'car-sites.libsonnet')('hearse', s, {
    engine: { name: 'v6_petrol' },
    drop: ['rear_bench'],
    over: {
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
  unjudged: [
    site.unjudged('curtains', 'partition', 0.056,
      'The front drapes hang through the partition\'s head.'),
    site.unjudged('curtains', 'shell', 0.043,
      'The rear drapes hang through the quarter lights.'),
    site.unjudged('deck', 'shell', 0.116,
      'The coffin deck\'s bed runs into the rear arch liners.'),
    site.unjudged('partition', 'shell', 0.151,
      'The partition stands through the tunnel.'),
  ],
}
