local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'crashed_military_helicopter.spec.libsonnet';
{
  title: 'Crashed military helicopter',
  sites: [
    one('fuselage', 'crashed_military_helicopter_fuselage'),
    one('windscreen', 'crashed_military_helicopter_windscreen'),
    one('cowling', 'crashed_military_helicopter_cowling'),
    one('main_gearbox', 'military_transport_helicopter_main_gearbox', [0, 2.0, 0]),
    one('mast', 'crashed_military_helicopter_mast', [0, s.mastFoot, 0]),
    one('main_rotor', 'crashed_military_helicopter_main_rotor'),
    one('snapped_blade', 'crashed_military_helicopter_snapped_blade'),
    one('tail_boom', 'crashed_military_helicopter_tail_boom'),
    one('tail_rotor', 'crashed_military_helicopter_tail_rotor'),
    one('cabin_door', 'crashed_military_helicopter_cabin_door'),
    one('console', 'crashed_military_helicopter_console'),
    one('gear_strut', 'crashed_military_helicopter_gear_strut'),
    one('main_wheel', 'crashed_military_helicopter_main_wheel', [0.17, 0.38, 1.68]),
    one('loose_wheel', 'military_transport_helicopter_main_wheel', [1.6, 0.4375, -2.9]),
  ]
  + pair('engine', 'crashed_military_helicopter_engine', [-0.75, s.enginesY, s.enginesZ])
  + pair('seat_frame', 'crashed_military_helicopter_seat_frame', [2.15, s.deck + 0.18, 0.55]),
  tags: { 'vehicle-role': ['military'] },
  overlaps: [
    site.overlap('cowling', 'engine_far', 0.04,
      'The front of the far engine reaches past the tapering cowling and into its wall.'),
    site.overlap('fuselage', 'main_gearbox', 0.044,
      'The base of the gearbox sits in the roof skin of the fuselage.'),
  ],
}
