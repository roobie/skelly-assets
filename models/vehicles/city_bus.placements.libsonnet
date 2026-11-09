local site = import 'site.libsonnet';
local s = import 'city_bus.spec.libsonnet';
local pole(id, x, z) = site.one(id, 'grab_pole', [x, s.floor, z]);
{
  sites: (import 'bus-body.libsonnet').fittings(site.kit, 'city_bus', s) + [
    pole('pole_front', 3.9, 0.3),
    pole('pole_door_fwd', 1.6, 0.3),
    pole('pole_door_aft', 0.12, 0.3),
    pole('pole_stand_far', 1.02, -0.3),
    pole('pole_step', -0.58, -0.3),
    site.one('roof_unit', 'city_bus_roof_unit', [-2.6, s.roof, 0]),
  ]
  + site.pair('rail', 'city_bus_ceiling_rail', [0.95, 2.62, 0.3]),
}
