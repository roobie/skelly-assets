local site = import 'site.libsonnet';
local s = import 'tour_bus_open_top.spec.libsonnet';
{
  title: 'Open-top tour bus',
  doorPairs:: (import 'bus-body.libsonnet').doorPairs(s),
  sites: (import 'bus-body.libsonnet').fittings(site.kit, 'tour_bus_open_top', s) + [
    site.one('upper_floor', 'double_decker_upper_floor'),
    site.one('stairs', 'double_decker_stairs'),
    site.one('stair_rail', 'double_decker_stair_rail', [0, s.upperDeck, s.stairWell.z]),
    site.one('pole_door', 'grab_pole_short', [3.42, s.floor, s.stairs.inner + 0.025]),
    site.one('pole_stairs', 'grab_pole_short', [1.58, s.floor, s.stairs.inner + 0.025]),
    site.one('deck_rail', 'tour_bus_open_top_deck_rail'),
    site.one('deflector', 'tour_bus_open_top_deflector'),
  ],
}
