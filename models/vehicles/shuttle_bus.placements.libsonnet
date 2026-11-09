local site = import 'site.libsonnet';
local s = import 'shuttle_bus.spec.libsonnet';
{
  sites: (import 'bus-body.libsonnet').fittings(site.kit, 'shuttle_bus', s) + [
    site.one('pole_door_fwd', 'grab_pole_short', [2.2, s.floor, 0.45]),
    site.one('pole_door_aft', 'grab_pole_short', [0.85, s.floor, 0.45]),
    site.one('luggage_rack', 'shuttle_bus_luggage_rack', [s.rack.x, 0, 0]),
    site.one('roof_unit', 'shuttle_bus_roof_unit'),
  ],
}
