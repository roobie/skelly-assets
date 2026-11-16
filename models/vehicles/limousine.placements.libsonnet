local site = import 'site.libsonnet';
local s = import 'limousine.spec.libsonnet';
{
  title: 'Limousine',
  sites: (import 'car-sites.libsonnet')('limousine', s, {
    engine: { name: 'v8_petrol', at: [s.frontAxle - 0.02, 0.2, 0] },
    over: {
      gearbox: { part: 'gearbox_inline', at: [s.frontAxle - 0.7, 0.26, 0] },
      exhaust: { part: 'exhaust_long', at: [s.rear + 0.56, 0.12, 0.42] },
      rear_bench: { at: [-1.55, s.floor, 0] },
      front_seat_near: { at: [1.05, s.floor, 0.37] },
      front_seat_far: { at: [1.05, s.floor, -0.37] },
    },
    add: [
      site.one('stretch', 'limousine_stretch'),
      site.one('grille', 'luxury_saloon_grille', [0.65, -0.0225, 0]),
      site.one('facing_seat', 'limousine_facing_seat'),
    ]
    + site.pair('front_door_brightwork', 'limousine_front_door_brightwork', rides='front_door')
    + site.pair('rear_door_brightwork', 'limousine_rear_door_brightwork', rides='rear_door'),
  }),
  unjudged: [
    site.unjudged('dashboard', 'gearbox', 0.241,
      'The inline gearbox\'s case rises above the tunnel into the dashboard\'s console.'),
    site.unjudged('gearbox', 'shell', 0.191,
      'The inline gearbox\'s case is taller and wider than the tunnel drawn for it, so it stands up through the tunnel or the bulkhead; the tunnel or the case wants resizing.'),
  ],
}
