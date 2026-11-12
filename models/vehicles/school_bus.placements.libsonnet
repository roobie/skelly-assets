local site = import 'site.libsonnet';
local bus = import 'bus-body.libsonnet';
local s = import 'school_bus.spec.libsonnet';
local headerX(y) = bus.layout(s).xf(y) + 0.03;
{
  title: 'School bus',
  sites: bus.fittings(site.kit, 'school_bus', s) + [
    site.one('rear_door', 'school_bus_rear_door'),
    site.one('stop_arm', 'school_bus_stop_arm', [2.95, 1.5, -s.side - 0.03]),
  ]
  + site.pair('warning_red', 'tail_lamp_small', [headerX(2.66), 2.66, 0.98])
  + site.pair('warning_amber', 'marker_lamp', [headerX(2.66), 2.7, 0.72])
  + site.pair('warning_red_rear', 'tail_lamp_small', [s.rear - 0.03, 2.56, 0.98])
  + site.pair('warning_amber_rear', 'marker_lamp', [s.rear - 0.02, 2.6, 0.72]),
}
