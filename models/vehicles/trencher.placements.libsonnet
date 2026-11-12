local site = import 'site.libsonnet';
local s = import 'trencher.spec.libsonnet';
local track = import 'track-kit.libsonnet';
{
  title: 'Trencher',
  sites: [
    site.one('chassis', 'trencher_chassis'),
    site.one('hood', 'trencher_hood'),
    site.one('platform', 'trencher_platform'),
    site.one('canopy', 'trencher_canopy'),
    site.one('digging_boom', 'trencher_digging_boom'),
    site.one('spoil_auger', 'trencher_spoil_auger'),
    site.one('backfill_blade', 'trencher_backfill_blade'),
    site.one('engine', 'engine_i4_diesel', [0.82, s.deck, 0]),
    site.one('radiator', 'radiator_small', [1.38, s.deck + 0.1, 0]),
    site.one('fuel_tank', 'fuel_tank_car', [-0.1, 0.38, 0]),
    site.one('exhaust', 'trencher_exhaust', [0.5, s.hoodTop, -0.34]),
    site.one('seat', 'front_seat', [-0.6, s.deck + 0.36, 0]),
    site.one('steering_column', 'steering_column_short', [-0.21, 1.56, 0]),
    site.one('steering_wheel', 'steering_wheel', [-0.28, 1.68, 0]),
    site.one('travel_lever', 'gear_lever', [-0.08, 1.56, 0.26]),
    site.one('beacon', 'beacon_amber', [-0.42, s.canopy, 0]),
  ]
  + track.pair('trencher_track', [0.1, 0, s.trackZ], 'fused')
  + site.pair('lift_ram', 'trencher_lift_ram')
  + site.pair('step_hanger', 'trencher_step_hanger')
  + site.pair('step', 'trencher_step')
  + site.pair('tail_lamp', 'tail_lamp_small', [-1.03, 1.32, 0.56])
  + site.headlamps(s.hoodFront + 0.02, 1.34, 0.42)
  + site.batteryBay('battery_tray', [0.2, s.deck, 0.3]),
  tags: { 'vehicle-role': ['construction'] },
  unjudged: [
    site.unjudged('chassis', 'digging_boom', 0.24,
      'The rear_tower piece of trencher_chassis runs into the head_sprocket piece of trencher_digging_boom.'),
    site.unjudged('hood', 'engine', 0.308,
      'The hood piece of trencher_hood runs into the block piece of engine_i4_diesel.'),
  ],
}
