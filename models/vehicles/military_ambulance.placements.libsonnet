local site = import 'site.libsonnet';
local m = import 'military-kit.libsonnet';
local s = import 'military_ambulance.spec.libsonnet';
local id = 'military_ambulance';
{
  sites: m.truckFittings(site.kit, id, s) + [
    site.one('box_floor', id + '_box_floor'),
    site.one('box', id + '_box'),
    site.one('rear_step', id + '_rear_step'),
    site.one('beacon', 'beacon_blue', [0.08, s.boxTop + 0.05, 0]),
  ]
  + site.pair('rear_door', id + '_rear_door')
  + site.pair('stretcher_rack', id + '_stretcher_rack')
  + site.pair('roof_marker', 'marker_lamp', [s.bedRear + 0.04, s.boxTop + 0.05, 1.1])
  + site.pair('roof_marker_front', 'marker_lamp', [s.bedFront - 0.04, s.boxTop + 0.05, 1.1]),
  tags: { 'vehicle-role': ['military', 'emergency'] },
}
