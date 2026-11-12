local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'news_helicopter.spec.libsonnet';
{
  title: 'News helicopter',
  sites: [
    one('belly', 'news_helicopter_belly'),
    one('rear_fairing', 'news_helicopter_rear_fairing'),
    one('skids', 'news_helicopter_skids'),
    one('nose_cap', 'news_helicopter_nose_cap'),
    one('windscreen', 'news_helicopter_windscreen'),
    one('roof', 'news_helicopter_roof'),
    one('engine_cowl', 'news_helicopter_engine_cowl'),
    one('tail_boom', 'news_helicopter_tail_boom'),
    one('tail_surfaces', 'news_helicopter_tail_surfaces'),
    one('tail_rotor', 'news_helicopter_tail_rotor', [s.tailRotor.x, s.tailRotor.y, s.tailRotor.z]),
    one('main_gearbox', 'news_helicopter_main_gearbox', [0, s.mastFoot - 0.36, 0]),
    one('mast', 'news_helicopter_mast', [0, s.mastFoot, 0]),
    one('main_rotor', 'news_helicopter_main_rotor', [0, s.hub, 0]),
    one('turbine', 'news_helicopter_turbine', [-0.95, 2.22, 0]),
    one('fuel_tank', 'news_helicopter_fuel_tank', [-0.75, 1.15, 0]),
    one('console', 'news_helicopter_console', [1.62, s.floor, 0]),
    one('cyclic', 'control_stick', [1.28, s.floor, 0]),
    one('rear_bench', 'news_helicopter_rear_bench', [-0.02, s.floor, 0]),
    one('camera_ball', 'news_helicopter_camera_ball', [2.16, 0.32, 0]),
    one('downlink_dome', 'news_helicopter_downlink_dome', [-1.05, 0.68, 0]),
    one('beacon', 'helicopter_beacon_red', [-5.68, 2.72, 0]),
    one('landing_lamp', 'helicopter_landing_lamp', [2.34, 1.0, 0]),
  ]
  + pair('front_door', 'news_helicopter_front_door')
  + pair('rear_door', 'news_helicopter_rear_door')
  + pair('seat', 'helicopter_seat', [1.0, s.floor, 0.32]),
  unjudged: [
    site.unjudged('engine_cowl', 'main_gearbox', 0.131,
      'The pylon piece of news_helicopter_engine_cowl runs into the case piece of news_helicopter_main_gearbox.'),
    site.unjudged('rear_fairing', 'downlink_dome', 0.062,
      'The dome piece of news_helicopter_rear_fairing runs into the skin_keel_21_2 piece of news_helicopter_downlink_dome.'),
  ],
}
