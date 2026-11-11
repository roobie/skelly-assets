local site = import 'site.libsonnet';
local hull = import 'armoured-hull-kit.libsonnet';
local s = import 'main_battle_tank.spec.libsonnet';
{
  sites: hull.sites(s) + [
    site.one('rear', 'mbt_hull_rear'),
  ] + site.pair('side_skirt', 'mbt_side_skirt'),
  tags: { 'vehicle-role': ['military'] },
}
