local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'crashed_light_helicopter.spec.libsonnet';
{
  title: 'Crashed light helicopter',
  sites: [
    one('belly', 'crashed_light_helicopter_belly'),
    one('rear_fairing', 'crashed_light_helicopter_rear_fairing'),
    one('skids', 'crashed_light_helicopter_skids'),
    one('door', 'crashed_light_helicopter_door'),
    one('canopy', 'crashed_light_helicopter_canopy'),
    one('canopy_frame', 'crashed_light_helicopter_canopy_frame'),
    one('tail_boom', 'crashed_light_helicopter_tail_boom'),
    one('tail_surfaces', 'crashed_light_helicopter_tail_surfaces'),
    one('tail_rotor', 'crashed_light_helicopter_tail_rotor'),
    one('main_gearbox', 'light_helicopter_main_gearbox', [0, s.mastFoot - 0.3, 0]),
    one('mast', 'crashed_light_helicopter_mast', [0, s.mastFoot, 0]),
    one('main_rotor', 'crashed_light_helicopter_main_rotor'),
    one('engine', 'light_helicopter_engine', [-0.62, 0.7, 0]),
    one('fuel_tank', 'light_helicopter_fuel_tank', [-0.08, 0.45, 0]),
    one('console', 'light_helicopter_console', [1.08, s.floor, 0]),
  ]
  + pair('seat_frame', 'crashed_light_helicopter_seat_frame', [0.5, s.floor, 0.3]),
  overlaps: [
    site.overlap('main_gearbox', 'seat_frame_far', 0.05,
      'The tall seat back reaches up into the mount plate of the gearbox.'),
    site.overlap('main_gearbox', 'seat_frame_near', 0.05,
      'The tall seat back reaches up into the mount plate of the gearbox.'),
    site.overlap('skids', 'door', 0.05,
      'The door lies flat on the ground and the splayed skid lies across it.'),
  ],
}
