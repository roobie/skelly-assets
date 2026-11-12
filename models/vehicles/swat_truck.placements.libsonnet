local site = import 'site.libsonnet';
local s = import 'swat_truck.spec.libsonnet';
{
  title: 'SWAT truck',
  sites: (import 'truck-cab.libsonnet').fittings(site.kit, 'swat_truck', s) + [
    site.one('body_floor', 'swat_truck_body_floor'),
    site.one('body_glass', 'swat_truck_body_glass'),
    site.one('body_front', 'swat_truck_body_front'),
    site.one('body_roof', 'swat_truck_body_roof'),
    site.one('rear_step', 'swat_truck_rear_step'),
    site.one('engine_guard', 'swat_truck_engine_guard'),
    site.one('ram', 'swat_truck_ram'),
    site.one('windscreen_guard', 'swat_truck_windscreen_guard'),
  ]
  + site.pair('door_guard', 'swat_truck_door_guard')
  + site.pair('body_side', 'swat_truck_body_side')
  + site.pair('rear_door', 'swat_truck_rear_door')
  + site.pair('roof_beacon', 'beacon_blue', [-0.55, s.body.top + 0.05, 0.85])
  + site.pair('crew_bench', 'crew_bench', [s.benchX, s.body.floorTop, s.benchZ]),
  tags: { 'vehicle-role': ['emergency'] },
  overlaps: [
    site.overlap('body_floor', 'rear_step', 0.05,
      'The rear step\'s hangers are let into the rear apron of the body floor.'),
  ],
}
