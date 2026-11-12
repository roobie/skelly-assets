local site = import 'site.libsonnet';
local s = import 'excavator.spec.libsonnet';
local track = import 'track-kit.libsonnet';
{
  title: 'Excavator',
  sites: [
    site.one('carbody', 'excavator_carbody'),
    site.one('house', 'excavator_house'),
    site.one('counterweight', 'excavator_counterweight'),
    site.one('cab', 'excavator_cab'),
    site.one('cab_door', 'excavator_cab_door'),
    site.one('windscreen', 'excavator_windscreen'),
    site.one('boom', 'excavator_boom'),
    site.one('arm', 'excavator_arm'),
    site.one('bucket', 'excavator_bucket'),
    site.one('arm_ram', 'excavator_arm_ram'),
    site.one('bucket_ram', 'excavator_bucket_ram'),
    site.one('engine', 'engine_i6_diesel', [-1.05, s.deck, 0]),
    site.one('radiator', 'radiator_van', [-0.45, s.deck + 0.05, 0.55]),
    site.one('fuel_tank', 'fuel_tank_truck', [0.5, s.deck, 0.8]),
    site.one('exhaust', 'excavator_exhaust', [-1.3, s.hoodTop, -0.7]),
    site.one('seat', 'front_seat', [0.15, s.deck + 0.2, -0.78]),
    site.one('beacon', 'beacon_amber', [-0.1, s.cabRoof + 0.03, -0.78]),
    site.one('work_lamp', 'work_lamp', [s.cabFront + 0.02, s.cabRoof - 0.2, -0.78]),
    site.one('control_inner', 'gear_lever', [0.52, s.deck + 0.52, -0.56]),
    site.one('control_outer', 'gear_lever', [0.52, s.deck + 0.52, -1.0]),
    site.one('tail_lamp_near', 'tail_lamp_small', [-2.2, 1.5, 0.9]),
    site.one('tail_lamp_far', 'tail_lamp_small', [-2.2, 1.5, -0.9]),
  ]
  + track.pair('excavator_track', [0, 0, s.trackZ], 'fused')
  + site.pair('boom_ram', 'excavator_boom_ram')
  + site.batteryBay('battery_tray', [-0.05, s.deck, 0.7]),
  tags: { 'vehicle-role': ['construction'] },
  unjudged: [
    site.unjudged('boom', 'arm', 0.191,
      'The reach piece of excavator_boom runs into the stick piece of excavator_arm.'),
    site.unjudged('carbody', 'track_far', 0.06,
      'The centre piece of excavator_carbody runs into the link_45_shoe_far piece of excavator_track.'),
    site.unjudged('carbody', 'track_near', 0.06,
      'The centre piece of excavator_carbody runs into the link_45_shoe piece of excavator_track.'),
    site.unjudged('house', 'boom', 0.282,
      'The boom_foot piece of excavator_house runs into the foot piece of excavator_boom.'),
    site.unjudged('house', 'engine', 0.375,
      'The hood piece of excavator_house runs into the block piece of engine_i6_diesel.'),
    site.unjudged('house', 'fuel_tank', 0.26,
      'The tool_cover piece of excavator_house runs into the body piece of fuel_tank_truck.'),
  ],
}
