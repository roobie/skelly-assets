local site = import 'site.libsonnet';
local pair = site.pair;
local hull = import 'armoured-hull-kit.libsonnet';
local s = import 'cv9040.spec.libsonnet';
{
  sites: hull.sites(s) + [
    site.one('rear', 'cv9040_hull_rear'),
    site.one('rear_door', 'cv9040_rear_door'),
  ]
  + pair('side_skirt', 'cv9040_side_skirt')
  + std.flattenArrays([pair('troop_seat_' + i, 'cv9040_troop_seat', [-2.8 + 0.5 * i, hull.floorTop(s), hull.innerWall(s)]) for i in std.range(0, 3)])
  + pair('troop_hatch', 'apc_hatch', [-2.4, s.roofTop, 0.7]),
  tags: { 'vehicle-role': ['military'] },
}
