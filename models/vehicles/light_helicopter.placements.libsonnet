local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'light_helicopter.spec.libsonnet';
{
  title: 'Light helicopter',
  sites: [
    one('belly', 'light_helicopter_belly'),
    one('rear_fairing', 'light_helicopter_rear_fairing'),
    one('skids', 'light_helicopter_skids'),
    one('canopy', 'light_helicopter_canopy'),
    one('canopy_frame', 'light_helicopter_canopy_frame'),
    one('tail_boom', 'light_helicopter_tail_boom'),
    one('tail_surfaces', 'light_helicopter_tail_surfaces'),
    one('tail_rotor', 'light_helicopter_tail_rotor', [s.tailRotor.x, s.tailRotor.y, s.tailRotor.z]),
    one('main_gearbox', 'light_helicopter_main_gearbox', [0, s.mastFoot - 0.3, 0]),
    one('mast', 'light_helicopter_mast', [0, s.mastFoot, 0]),
    one('main_rotor', 'light_helicopter_main_rotor', [0, s.hub, 0]),
    one('engine', 'light_helicopter_engine', [-0.62, 1.15, 0]),
    one('fuel_tank', 'light_helicopter_fuel_tank', [-0.08, 0.9, 0]),
    one('console', 'light_helicopter_console', [1.32, s.floor, 0]),
    one('cyclic', 'control_stick', [1.0, s.floor, 0]),
    one('beacon', 'light_helicopter_beacon', [-4.28, 2.3, 0]),
    one('landing_lamp', 'light_helicopter_landing_lamp', [2.05, 0.9, 0]),
  ]
  + pair('door', 'light_helicopter_door')
  + pair('seat', 'helicopter_seat', [0.64, s.floor, 0.3]),
  unjudged: [
    site.unjudged('belly', 'skids', 0.054,
      'The belly_13 piece of light_helicopter_belly runs into the cross_0 piece of light_helicopter_skids.'),
    site.unjudged('door_far', 'seat_far', 0.05,
      'The back_far piece of light_helicopter_door runs into the rear_rib_0_0_far piece of helicopter_seat.'),
    site.unjudged('door_near', 'seat_near', 0.05,
      'The back piece of light_helicopter_door runs into the rear_rib_0_0 piece of helicopter_seat.'),
    site.unjudged('rear_fairing', 'main_gearbox', 0.05,
      'The case piece of light_helicopter_rear_fairing runs into the bulkhead_0 piece of light_helicopter_main_gearbox.'),
    site.unjudged('rear_fairing', 'mast', 0.055,
      'The shaft piece of light_helicopter_rear_fairing runs into the wall_33_7 piece of light_helicopter_mast.'),
    site.unjudged('rear_fairing', 'skids', 0.062,
      'The cross_1 piece of light_helicopter_rear_fairing runs into the wall_26_1 piece of light_helicopter_skids.'),
  ],
}
