local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'security_van.spec.libsonnet';
{
  title: 'Security van',
  sites: van.fittings(site.kit, 'security_van', s) + [
    site.one('side_door_bars', 'security_van_side_door_bars'),
    site.one('cash_chute', 'security_van_cash_chute'),
    site.one('roof_hatch', 'security_van_roof_hatch'),
  ]
  + site.pair('cab_plate', 'security_van_cab_plate')
  + site.pair('rear_door_bars', 'security_van_rear_door_bars'),
}
