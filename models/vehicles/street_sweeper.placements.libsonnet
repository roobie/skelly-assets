local site = import 'site.libsonnet';
local t = import 'truck-cab.libsonnet';
local s = t.spec(import 'street_sweeper.spec.libsonnet');
{
  title: 'Street sweeper',
  sites: t.fittings(site.kit, 'street_sweeper', s) + [
    site.one('subframe', 'street_sweeper_subframe'),
    site.one('hopper', 'street_sweeper_hopper'),
    site.one('rear_door', 'street_sweeper_rear_door'),
    site.one('water_tank', 'street_sweeper_water_tank'),
    site.one('fan_housing', 'street_sweeper_fan_housing'),
    site.one('main_broom', 'street_sweeper_main_broom'),
    site.one('suction', 'street_sweeper_suction'),
  ]
  + site.pair('gutter_brush', 'street_sweeper_gutter_brush')
  + site.pair('cab_beacon', 'beacon_amber', [s.face - s.lean - 0.6, s.roof + 0.15, 0.5])
  + site.pair('rear_beacon', 'beacon_amber', [-2.3, s.bodyTop - 0.04, 0.72]),
  tags: { 'vehicle-role': ['utility'] },
}
