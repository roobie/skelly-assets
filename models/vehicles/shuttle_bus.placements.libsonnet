local site = import 'site.libsonnet';
local s = import 'shuttle_bus.spec.libsonnet';
{
  title: 'Shuttle bus',
  sites: (import 'bus-body.libsonnet').fittings(site.kit, 'shuttle_bus', s) + [
    site.one('pole_door_fwd', 'grab_pole_short', [2.2, s.floor, 0.45]),
    site.one('pole_door_aft', 'grab_pole_short', [0.85, s.floor, 0.45]),
    site.one('luggage_rack', 'shuttle_bus_luggage_rack', [s.rack.x, 0, 0]),
    site.one('roof_unit', 'shuttle_bus_roof_unit'),
  ],
  unjudged: [
    site.unjudged('rear_axle', 'gearbox', 0.06,
      'The diff piece of beam_axle_truck runs into the case piece of gearbox_truck.'),
  ],
}
