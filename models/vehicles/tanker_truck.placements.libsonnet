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
  overlaps: [
    site.overlap('barrel', 'walkway', 0.05,
      'The bearers of the walkway are let into the shell of the barrel.'),
    site.overlap('saddle', 'valve_gear', 0.069,
      'The manifold pipe of the valve gear runs through a rear cradle plate of the saddle.'),
  ],
  unjudged: [
    site.unjudged('chassis', 'engine', 0.08,
      'The heavy I6\'s intake stands in the near rail.'),
  ],
}
