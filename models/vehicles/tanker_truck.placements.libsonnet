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
}
