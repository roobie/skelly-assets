local site = import 'site.libsonnet';
local t = import 'truck-cab.libsonnet';
local s = t.spec(import 'airport_crash_tender.spec.libsonnet');
{
  title: 'Airport crash tender',
  sites: t.fittings(site.kit, 'airport_crash_tender', s) + [
    site.one('body', 'airport_crash_tender_body'),
    site.one('cab_stripe', 'airport_crash_tender_cab_stripe'),
    site.one('water_tank', 'airport_crash_tender_water_tank'),
    site.one('foam_tank', 'airport_crash_tender_foam_tank'),
    site.one('pump', 'airport_crash_tender_pump'),
    site.one('roof_turret_mount', 'airport_crash_tender_roof_turret_mount'),
    site.one('roof_turret', 'airport_crash_tender_roof_turret'),
    site.one('bumper_turret', 'airport_crash_tender_bumper_turret'),
    site.one('roof_rail', 'airport_crash_tender_roof_rail'),
    site.one('rear_ladder', 'airport_crash_tender_rear_ladder'),
    site.one('crew_bench', 'bench_seat_3', [3.35, s.floor, 0]),
    site.one('light_bar', 'light_bar_blue', [s.face - s.lean - 0.3, s.crown, 0]),
  ]
  + std.flattenArrays([site.pair('locker_shutter_' + name, 'airport_crash_tender_locker_shutter_' + name) for name in std.objectFields(s.lockers)])
  + site.pair('rear_beacon', 'beacon_blue', [s.bodyRear + 0.2, s.bodyTop, 1.3]),
  tags: { 'vehicle-role': ['emergency'] },
}
