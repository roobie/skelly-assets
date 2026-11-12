local site = import 'site.libsonnet';
local s = import 'skid_steer.spec.libsonnet';
{
  title: 'Skid-steer loader',
  sites: [
    site.one('frame', 'skid_steer_frame'),
    site.one('cage', 'skid_steer_cage'),
    site.one('door', 'skid_steer_door'),
    site.one('engine_cover', 'skid_steer_engine_cover'),
    site.one('tail_door', 'skid_steer_tail_door'),
    site.one('lift_arms', 'skid_steer_lift_arms'),
    site.one('bucket', 'skid_steer_bucket'),
    site.one('engine', 'engine_i4_diesel', [-0.82, 0.5, 0]),
    site.one('radiator', 'radiator_small', [-1.18, 0.6, 0]),
    site.one('fuel_tank', 'fuel_tank_car', [-0.1, 0.42, 0]),
    site.one('exhaust', 'skid_steer_exhaust', [-0.7, 1.42, -0.25]),
    site.one('seat', 'pan_seat', [0.0, s.floor + 0.2, 0]),
    site.one('beacon', 'beacon_amber', [-0.1, s.roof + 0.05, 0]),
  ]
  + site.pair('chain_case', 'skid_steer_chain_case')
  + site.pair('front_wheel', 'wheel_265_75r16', [s.frontAxle, s.hub, s.wheelZ])
  + site.pair('rear_wheel', 'wheel_265_75r16', [s.rearAxle, s.hub, s.wheelZ])
  + site.pair('lift_ram', 'skid_steer_lift_ram')
  + site.pair('tilt_ram', 'skid_steer_tilt_ram')
  + site.pair('control', 'gear_lever', [0.34, s.floor + 0.34, 0.33])
  + site.pair('work_lamp', 'work_lamp', [s.cageFront + 0.04, s.roof + 0.05, 0.34])
  + site.pair('tail_lamp', 'tail_lamp_small', [-1.26, 1.06, 0.38])
  + site.batteryBay('battery_tray', [-0.55, 0.5, 0.3]),
  tags: { 'vehicle-role': ['construction'] },
  unjudged: [
    site.unjudged('engine_cover', 'engine', 0.308,
      'The hood piece of skid_steer_engine_cover runs into the block piece of engine_i4_diesel.'),
    site.unjudged('frame', 'engine_cover', 0.12,
      'The sponson_near piece of skid_steer_frame runs into the hood piece of skid_steer_engine_cover.'),
  ],
}
