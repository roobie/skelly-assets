local site = import 'site.libsonnet';
local pair = site.pair;
local hull = import 'armoured-hull-kit.libsonnet';
local k = import 'kit.libsonnet';
local s = import 'cv9040.spec.libsonnet';
{
  title: 'Tracked infantry fighting vehicle',
  sites: hull.sites(s) + [
    site.one('rear', 'cv9040_hull_rear'),
    site.one('rear_door', 'cv9040_rear_door'),
    // Drawn on the roof, the troop hatch's lid and hinge would graze the roof and the rear plate's top as it starts to
    // open, so it stands `k.swingGap` off them.
    site.one('troop_hatch', 'cv9040_troop_hatch', [s.troopHatch.x, s.roofTop + k.swingGap, 0]),
  ]
  + pair('side_skirt', 'cv9040_side_skirt')
  + std.flattenArrays([pair('troop_seat_' + i, 'cv9040_troop_seat', [-2.8 + 0.5 * i, hull.floorTop(s), hull.innerWall(s)]) for i in std.range(0, 3)]),
  tags: { 'vehicle-role': ['military'] },
}
