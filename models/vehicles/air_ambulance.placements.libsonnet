local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'air_ambulance.spec.libsonnet';
{
  title: 'Air ambulance',
  sites: [
    one('belly', 'air_ambulance_belly'),
    one('cabin_floor', 'air_ambulance_cabin_floor'),
    one('skids', 'air_ambulance_skids'),
    one('nose_cap', 'air_ambulance_nose_cap'),
    one('cabin_rear', 'air_ambulance_cabin_rear'),
    one('roof', 'air_ambulance_roof'),
    one('windscreen', 'air_ambulance_windscreen'),
    one('engine_cowl', 'air_ambulance_engine_cowl'),
    one('tail_boom', 'air_ambulance_tail_boom'),
    one('tail_surfaces', 'air_ambulance_tail_surfaces'),
    one('tail_rotor', 'air_ambulance_tail_rotor', [s.tailRotor.x, s.tailRotor.y, s.tailRotor.z]),
    one('main_gearbox', 'air_ambulance_main_gearbox', [0, s.mastFoot - 0.36, 0]),
    one('mast', 'air_ambulance_mast', [0, s.mastFoot, 0]),
    one('main_rotor', 'air_ambulance_main_rotor', [0, s.hub, 0]),
    one('fuel_tank', 'air_ambulance_fuel_tank', [0, 0.56, 0]),
    one('console', 'air_ambulance_console', [2.02, 0.92, 0]),
    one('cyclic', 'control_stick', [1.6, s.floor, 0]),
    one('stretcher', 'stretcher', [-0.7, s.floor, -0.36]),
    // The locker stands at the stretcher's head, behind the far sliding door's leading edge and its rib.
    one('locker', 'air_ambulance_locker', [0.42, s.floor, -0.36]),
    one('attendant_seat', 'attendant_seat', [0.3, s.floor, 0.42]),
    one('tail_beacon', 'air_ambulance_beacon', [-6.98, 3.25, 0]),
    one('cowl_beacon', 'air_ambulance_beacon', [-1.5, 2.9, 0]),
    one('landing_lamp', 'air_ambulance_landing_lamp', [2.69, 1.05, 0]),
  ]
  + pair('turbine', 'air_ambulance_turbine', [-1.1, 2.56, 0.22])
  + pair('front_door', 'air_ambulance_front_door')
  + pair('sliding_door', 'air_ambulance_sliding_door')
  + pair('door_track', 'air_ambulance_door_track')
  + pair('clamshell_door', 'air_ambulance_clamshell_door')
  + pair('seat', 'air_ambulance_seat', [1.28, s.floor, 0.4]),
  tags: { 'vehicle-role': ['emergency'] },
  unjudged: [
    site.unjudged('belly', 'skids', 0.062,
      'The keel_17_5 piece of air_ambulance_belly runs into the cross_1 piece of air_ambulance_skids.'),
    site.unjudged('cabin_rear', 'engine_cowl', 0.055,
      'The roof_16_3 piece of air_ambulance_cabin_rear runs into the cowl_17 piece of air_ambulance_engine_cowl.'),
    site.unjudged('engine_cowl', 'main_gearbox', 0.207,
      'The pylon piece of air_ambulance_engine_cowl runs into the case piece of air_ambulance_main_gearbox.'),
  ],
}
