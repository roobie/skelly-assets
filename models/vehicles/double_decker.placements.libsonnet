local site = import 'site.libsonnet';
local s = import 'double_decker.spec.libsonnet';
{
  sites: (import 'bus-body.libsonnet').fittings(site.kit, 'double_decker', s) + [
    site.one('stairs', 'double_decker_stairs'),
    site.one('stair_rail', 'double_decker_stair_rail', [0, s.decks[1].floor, s.stairWell.z]),
    site.one('pole_door', 'grab_pole_short', [3.42, s.floor, s.stairs.inner + 0.025]),
    site.one('pole_stairs', 'grab_pole_short', [1.58, s.floor, s.stairs.inner + 0.025]),
  ],
}
