local site = import 'site.libsonnet';
local s = import 'police_car.spec.libsonnet';
{
  sites: [
    site.one('shell', 'police_car_shell'),
    site.one('windscreen', 'police_car_windscreen'),
    site.one('boot_lid', 'police_car_boot_lid'),
    site.one('bonnet', 'police_car_bonnet'),
    site.one('front_bumper', 'police_car_front_bumper'),
    site.one('rear_bumper', 'police_car_rear_bumper'),
    site.one('dashboard', 'police_car_dashboard'),
    site.one('engine', 'engine_i4_petrol', [s.frontAxle - 0.02, 0.28, 0]),
    site.one('gearbox', 'gearbox_transaxle', [s.frontAxle - 0.02, 0.3, -0.36]),
    site.one('radiator', 'radiator_car', [s.front - 0.3, 0.32, 0]),
    site.one('fuel_tank', 'fuel_tank_car', [s.rearAxle + 0.65, s.sill, 0]),
    site.one('exhaust', 'exhaust_car', [s.rear + 0.46, 0.2, 0.42]),
    site.one('rear_axle', 'twist_beam', [s.rearAxle, 0, 0]),
    site.one('steering_wheel', 'steering_wheel', [s.cowl - 0.4, s.waist - 0.2, -0.37]),
    site.one('gear_lever', 'gear_lever', [s.cowl - 0.4, 0.55, 0]),
    site.one('rear_bench', 'bench_seat_3', [-0.55, s.floor, 0]),
    site.one('light_bar', 'police_car_light_bar'),
    site.one('push_bar', 'police_car_push_bar'),
  ]
  + site.pair('front_wing', 'police_car_front_wing')
  + site.pair('front_door', 'police_car_front_door')
  + site.pair('rear_door', 'police_car_rear_door')
  + site.pair('tail_lamp', 'police_car_tail_lamp')
  + site.pair('beacon', 'beacon_blue', [-0.4, s.roof + 0.12, 0.34])
  + site.pair('front_strut', 'front_strut', [s.frontAxle, 0.28, s.side - 0.105 - 0.05])
  + site.pair('front_wheel', 'wheel_205_55r16', [s.frontAxle, 0.316, s.side - 0.105])
  + site.pair('rear_wheel', 'wheel_205_55r16', [s.rearAxle, 0.316, s.side - 0.105])
  + site.pair('front_seat', 'front_seat', [0.05, s.floor, 0.37])
  + site.pair('door_mirror', 'door_mirror', [s.cowl - 0.04, s.waist, s.side - 0.03])
  + site.headlamps(s.front - 0.07, 0.66, 0.62)
  + site.batteryBay('hatchback_battery_tray', [s.aPost + 0.25, 0.5, -0.44]),
  tags: { 'vehicle-role': ['emergency'] },
}
