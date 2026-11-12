local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'police_helicopter.spec.libsonnet';
{
  title: 'Police helicopter',
  sites: [
    one('belly', 'police_helicopter_belly'),
    one('rear_fairing', 'police_helicopter_rear_fairing'),
    one('skids', 'police_helicopter_skids'),
    one('nose_cap', 'police_helicopter_nose_cap'),
    one('windscreen', 'police_helicopter_windscreen'),
    one('roof', 'police_helicopter_roof'),
    one('engine_cowl', 'police_helicopter_engine_cowl'),
    one('tail_boom', 'police_helicopter_tail_boom'),
    one('tail_surfaces', 'police_helicopter_tail_surfaces'),
    one('tail_rotor', 'police_helicopter_tail_rotor', [s.tailRotor.x, s.tailRotor.y, s.tailRotor.z]),
    one('main_gearbox', 'police_helicopter_main_gearbox', [0, s.mastFoot - 0.36, 0]),
    one('mast', 'police_helicopter_mast', [0, s.mastFoot, 0]),
    one('main_rotor', 'police_helicopter_main_rotor', [0, s.hub, 0]),
    one('turbine', 'police_helicopter_turbine', [-1.3, 2.38, 0]),
    one('fuel_tank', 'police_helicopter_fuel_tank', [-0.85, 1.05, 0]),
    one('console', 'police_helicopter_console', [1.72, s.floor, 0]),
    one('cyclic', 'control_stick', [1.36, s.floor, 0]),
    one('rear_bench', 'police_helicopter_rear_bench', [0.05, s.floor, 0]),
    one('searchlight', 'police_helicopter_searchlight', [1.45, 0.3, 0.52]),
    one('tail_beacon', 'police_helicopter_beacon', [-6.35, 2.95, 0]),
    one('cowl_beacon', 'police_helicopter_beacon', [-1.5, 2.72, 0]),
    one('landing_lamp', 'helicopter_landing_lamp', [2.44, 1.0, 0]),
  ]
  + pair('front_door', 'police_helicopter_front_door')
  + pair('rear_door', 'police_helicopter_rear_door')
  + pair('seat', 'police_helicopter_seat', [1.05, s.floor, 0.38]),
  tags: { 'vehicle-role': ['emergency'] },
}
