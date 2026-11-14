local site = import 'site.libsonnet';
local s = import 'bulldozer.spec.libsonnet';
local track = import 'track-kit.libsonnet';
{
  title: 'Bulldozer',
  sites: [
    site.one('mainframe', 'bulldozer_mainframe'),
    site.one('hood', 'bulldozer_hood'),
    site.one('deck', 'bulldozer_deck'),
    site.one('fuel_tank', 'bulldozer_fuel_tank'),
    site.one('cab', 'bulldozer_cab'),
    site.one('windscreen', 'bulldozer_windscreen'),
    site.one('blade', 'bulldozer_blade'),
    site.one('ripper', 'bulldozer_ripper'),
    site.one('tilt_cylinder', 'bulldozer_tilt_cylinder'),
    site.one('tilt_brace', 'bulldozer_tilt_brace') + { mirror: true },
    site.one('engine', 'engine_i6_heavy_diesel', [0.82, 0.52, 0]),
    site.one('radiator', 'radiator_truck', [1.66, s.frameTop, 0]),
    site.one('transmission', 'gearbox_heavy', [-0.45, 0.42, 0]),
    site.one('exhaust', 'exhaust_stack_small', [1.05, 2.0, -0.25]),
    site.one('seat_riser', 'seat_riser', [-0.75, s.deck + 0.05, 0]),
    site.one('seat', 'front_seat', [-0.75, s.deck + 0.25, 0]),
    site.one('beacon', 'beacon_amber', [-1.1, s.roofTop, -0.55]),
  ]
  + [site.one('ripper_shank_' + i, 'bulldozer_ripper_shank', [0, 0, (i - 1) * 0.85]) for i in std.range(0, 2)]
  + track.pair('bulldozer_track', [0, 0, s.trackZ], 'assembly')
  + site.pair('final_drive', 'bulldozer_final_drive')
  + site.pair('engine_panel', 'bulldozer_engine_panel')
  + site.pair('cab_door', 'bulldozer_cab_door')
  + site.pair('push_arm', 'bulldozer_push_arm')
  + site.pair('lift_cylinder', 'bulldozer_lift_cylinder')
  + site.pair('ripper_cylinder', 'bulldozer_ripper_cylinder')
  + site.pair('control', 'gear_lever', [-0.42, s.deck + 0.55, 0.37])
  + site.pair('work_lamp', 'work_lamp', [s.cabFront - 0.06, s.roofTop, 0.6])
  + site.pair('tail_lamp', 'tail_lamp_small', [-1.98, 1.44, 1.0])
  + site.batteryBay('truck_battery_tray', [-1.63, s.deck, 0.6]),
  tags: { 'vehicle-role': ['construction'] },
}
