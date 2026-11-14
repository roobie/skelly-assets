local site = import 'site.libsonnet';
local t = import 'truck-cab.libsonnet';
local s = t.spec(import 'fire_engine.spec.libsonnet');
{
  title: 'Fire engine',
  sites: t.fittings(site.kit, 'fire_engine', s) + [
    site.one('body', 'fire_engine_body'),
    site.one('cab_stripe', 'fire_engine_cab_stripe'),
    site.one('water_tank', 'fire_engine_water_tank'),
    site.one('gantry', 'fire_engine_gantry'),
    site.one('roof_ladder', 'fire_engine_roof_ladder'),
    site.one('pump_panel', 'fire_engine_pump_panel'),
    site.one('hose_reel', 'fire_engine_hose_reel'),
    site.one('rear_step', 'fire_engine_rear_step'),
    site.one('crew_bench', 'bench_seat_3', [1.32, s.floor, 0]),
  ]
  + std.flattenArrays([site.pair('locker_shutter_' + name, 'fire_engine_locker_shutter_' + name) for name in std.objectFields(s.lockers)])
  + site.pair('cab_beacon', 'beacon_blue', [s.face - s.lean - 0.45, s.roof + 0.11, 0.9])
  + site.pair('rear_beacon', 'beacon_blue', [s.bodyRear + 0.2, s.bodyTop, 0.95]),
  tags: { 'vehicle-role': ['emergency'] },
  unjudged: [
    site.unjudged('chassis', 'engine', 0.08,
      'The heavy I6\'s intake stands in the near rail: the rails sit too close together for it.'),
  ],
}
