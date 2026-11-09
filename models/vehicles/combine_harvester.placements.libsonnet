local site = import 'site.libsonnet';
local s = import 'combine_harvester.spec.libsonnet';
{
  sites: [
    site.one('body', 'combine_harvester_body'),
    site.one('cab', 'combine_harvester_cab'),
    site.one('cab_door', 'combine_harvester_cab_door'),
    site.one('windscreen', 'combine_harvester_windscreen'),
    site.one('grain_tank', 'combine_harvester_grain_tank'),
    site.one('grain_floor', 'combine_harvester_grain_floor'),
    site.one('unloading_auger', 'combine_harvester_unloading_auger'),
    site.one('feeder', 'combine_harvester_feeder'),
    site.one('header', 'combine_harvester_header'),
    site.one('reel', 'combine_harvester_reel'),
    site.one('front_axle', 'combine_harvester_front_axle'),
    site.one('rear_axle', 'combine_harvester_rear_axle'),
    site.one('ladder', 'combine_harvester_ladder'),
    site.one('straw_chopper', 'combine_harvester_straw_chopper'),
    site.one('engine', 'engine_i6_heavy_diesel', [-2.9, 1.72, 0]),
    site.one('gearbox', 'gearbox_heavy', [-1.7, 1.3, 0]),
    site.one('radiator', 'radiator_truck', [-3.6, 1.72, 0]),
    site.one('fuel_tank', 'fuel_tank_truck', [-0.3, 1.5, 0]),
    site.one('exhaust', 'exhaust_stack', [-2.6, 1.55, -0.6]),
    site.one('seat', 'front_seat', [s.cabRear + 0.56, s.cabFloor + 0.04, 0]),
    site.one('steering_column', 'steering_column_short', [s.cabFront - 0.4, 2.86, 0]),
    site.one('steering_wheel', 'steering_wheel', [s.cabFront - 0.48, 2.98, 0]),
    site.one('control', 'gear_lever', [s.cabRear + 0.74, s.cabFloor + 0.04, 0.46]),
    site.one('beacon', 'beacon_amber', [s.cabRear + 0.1, s.cabRoof, 0]),
  ]
  + site.pair('front_wheel', 'wheel_16_9r30', [s.frontAxle, s.frontHub, s.frontZ])
  + site.pair('rear_wheel', 'wheel_295_80r22_5', [s.rearAxle, s.rearHub, s.rearZ])
  + site.pair('tail_lamp', 'tail_lamp_small', [s.bodyRear - 0.03, 2.4, 0.8])
  + site.pair('work_lamp', 'work_lamp', [s.cabFront + 0.2, s.cabRoof - 0.26, 0.5])
  + site.pair('mirror', 'door_mirror', [s.cabFront, 3.2, s.cabSide + 0.02])
  + site.batteryBay('truck_battery_tray', [-1.0, 1.0, 0.6]),
  tags: { 'vehicle-role': ['farm'] },
}
