local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'military_transport_helicopter.spec.libsonnet';
local id = 'military_transport_helicopter';
{
  title: 'Military transport helicopter',
  sites: [
    one('belly', id + '_belly'),
    one('tail_cone', id + '_tail_cone'),
    one('roof', id + '_roof'),
    one('windscreen', id + '_windscreen'),
    one('engine_cowling', id + '_engine_cowling'),
    one('tail_boom', id + '_tail_boom'),
    one('tail_surfaces', id + '_tail_surfaces'),
    one('tail_rotor', id + '_tail_rotor', [s.tailRotor.x, s.tailRotor.y, s.tailRotor.z]),
    one('main_gearbox', id + '_main_gearbox', [0, 3.1, 0]),
    one('mast', id + '_mast', [0, s.mastFoot, 0]),
    one('main_rotor', id + '_main_rotor', [0, s.hub, 0]),
    one('fuel_tank', id + '_fuel_tank', [-2.45, 1.45, 0]),
    one('main_gear', id + '_main_gear'),
    one('tail_gear', id + '_tail_gear'),
    one('tail_wheel', id + '_tail_wheel', [s.tailGear.x, s.tailGear.radius, 0]),
    one('console', id + '_console', [3.85, s.floor, 0]),
    one('beacon', 'helicopter_beacon_red', [-9.12, 4.38, 0]),
    one('landing_lamp', id + '_landing_lamp', [5.0, 0.86, 0]),
  ]
  + pair('turbine', id + '_turbine', [s.engine.x, s.engine.y, s.engine.z])
  + pair('cockpit_door', id + '_cockpit_door')
  + pair('cabin_door', id + '_cabin_door')
  + pair('side_window', id + '_side_window')
  + pair('main_wheel', id + '_main_wheel', [s.mainGear.x, s.mainGear.radius, s.mainGear.z])
  + pair('crew_seat', id + '_crew_seat', [2.95, s.floor, 0.56])
  + pair('control_stick', 'control_stick', [3.3, s.floor, 0.56])
  + pair('troop_bench', id + '_troop_bench', [0, s.floor, 0]),
  tags: { 'vehicle-role': ['military'] },
  unjudged: [
    site.unjudged('tail_cone', 'tail_gear', 0.058,
      'The strut piece of military_transport_helicopter_tail_cone runs into the wall_6_23 piece of military_transport_helicopter_tail_gear.'),
    site.unjudged('tail_surfaces', 'tail_rotor', 0.044,
      'The fin piece of military_transport_helicopter_tail_surfaces runs into the hub piece of military_transport_helicopter_tail_rotor.'),
  ],
}
