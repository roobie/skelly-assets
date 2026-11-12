local site = import 'site.libsonnet';
local van = import 'van-body.libsonnet';
local s = import 'riot_van.spec.libsonnet';
{
  title: 'Riot van',
  sites: van.fittings(site.kit, 'riot_van', s) + [
    site.one('windscreen_grille', 'riot_van_windscreen_grille'),
    site.one('side_door_grille', 'riot_van_side_door_grille'),
    site.one('side_grilles', 'riot_van_side_grilles'),
    site.one('markings', 'riot_van_markings'),
    site.one('side_door_markings', 'riot_van_side_door_markings'),
    site.one('light_bar', 'light_bar_blue', [-0.325, s.roof, 0]),
    site.one('push_bar', 'riot_van_push_bar'),
    site.one('crew_bench', 'bench_seat_3', [-0.9, s.floor, 0]),
    site.one('rear_bench', 'bench_seat_3', [-2.5, s.floor, 0]),
  ]
  + site.pair('door_grille', 'riot_van_door_grille')
  + site.pair('rear_grille', 'riot_van_rear_grille')
  + site.pair('door_markings', 'riot_van_door_markings')
  + site.pair('rear_markings', 'riot_van_rear_markings'),
  tags: { 'vehicle-role': ['emergency'] },
}
