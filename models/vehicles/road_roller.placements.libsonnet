local site = import 'site.libsonnet';
local s = import 'road_roller.spec.libsonnet';
{
  title: 'Road roller',
  sites: [
    site.one('platform', 'road_roller_platform'),
    site.one('front_yoke', 'road_roller_front_yoke'),
    site.one('rear_yoke', 'road_roller_rear_yoke'),
    site.one('front_drum', 'road_roller_drum', [s.frontAxle, s.drumRadius, 0]),
    site.one('rear_drum', 'road_roller_drum', [s.rearAxle, s.drumRadius, 0]),
    site.one('engine_hood', 'road_roller_engine_hood'),
    site.one('water_tank', 'road_roller_water_tank'),
    site.one('canopy', 'road_roller_canopy'),
    site.one('engine', 'engine_i3_small', [-1.3, 1.28, 0]),
    site.one('radiator', 'radiator_small', [-1.86, 1.34, 0]),
    site.one('fuel_tank', 'fuel_tank_car', [-0.9, 0.76, 0]),
    site.one('exhaust', 'road_roller_exhaust', [-1.1, s.hoodTop, -0.34]),
    site.one('seat', 'front_seat', [-0.1, s.deck + 0.26, 0]),
    site.one('steering_column', 'steering_column_short', [0.37, 1.56, 0]),
    site.one('steering_wheel', 'steering_wheel', [0.3, 1.66, 0]),
    site.one('travel_lever', 'gear_lever', [0.48, 1.56, 0.2]),
    site.one('beacon', 'beacon_amber', [0, s.canopy, 0]),
  ]
  + site.pair('step_hanger', 'road_roller_step_hanger')
  + site.pair('step', 'road_roller_step')
  + site.pair('tail_lamp', 'tail_lamp_small', [-2.02, 1.42, 0.5])
  + site.headlamps(2.02, 1.4, 0.46)
  + site.batteryBay('battery_tray', [-1.08, 1.28, 0.42]),
  tags: { 'vehicle-role': ['construction'] },
  overlaps: [
    site.overlap('platform', 'rear_drum',
      'The rear_drum is let into the platform at its mount (roll runs into spine); not yet judged against a render, so the owner confirms it reads as a joint or fixes it.'),
    site.overlap('front_yoke', 'front_drum',
      'The front_drum is let into the front_yoke at its mount (neck runs into roll); not yet judged against a render, so the owner confirms it reads as a joint or fixes it.'),
  ],
}
