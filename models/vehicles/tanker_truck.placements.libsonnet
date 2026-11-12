local site = import 'site.libsonnet';
local s = import 'tanker_truck.spec.libsonnet';
{
  title: 'Tanker truck',
  sites: (import 'truck-cab.libsonnet').fittings(site.kit, 'tanker_truck', s) + [
    site.one('saddle', 'tanker_truck_saddle'),
    site.one('barrel', 'tanker_truck_barrel'),
    site.one('walkway', 'tanker_truck_walkway'),
    site.one('ladder', 'tanker_truck_ladder'),
    site.one('valve_gear', 'tanker_truck_valve_gear'),
  ],
  unjudged: [
    site.unjudged('barrel', 'walkway', 0.05,
      'The shell piece of tanker_truck_barrel runs into the bearer_0 piece of tanker_truck_walkway.'),
    site.unjudged('gearbox', 'saddle', 0.05,
      'The foot_2 piece of gearbox_heavy runs into the case piece of tanker_truck_saddle.'),
    site.unjudged('saddle', 'barrel', 0.185,
      'The shell piece of tanker_truck_saddle runs into the high_2 piece of tanker_truck_barrel.'),
    site.unjudged('saddle', 'valve_gear', 0.066,
      'The manifold piece of tanker_truck_saddle runs into the low_0 piece of tanker_truck_valve_gear.'),
  ],
}
