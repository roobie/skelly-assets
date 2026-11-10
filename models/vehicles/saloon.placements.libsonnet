local site = import 'site.libsonnet';
local engine = import 'engine-kit.libsonnet';
local s = import 'saloon.spec.libsonnet';
{
  sites: [
    site.one('shell', 'saloon_shell'),
    site.one('windscreen', 'saloon_windscreen'),
    site.one('boot_lid', 'saloon_boot_lid'),
    site.one('bonnet', 'saloon_bonnet'),
    site.one('front_bumper', 'saloon_front_bumper'),
    site.one('rear_bumper', 'saloon_rear_bumper'),
    site.one('dashboard', 'saloon_dashboard'),
  ] + engine.sites('i4_petrol', [s.frontAxle - 0.02, 0.28, 0], 'assembly') + [
    site.one('gearbox', 'gearbox_transaxle', [s.frontAxle - 0.02, 0.3, -0.36]),
    site.one('radiator', engine.radiator('i4_petrol'), [s.front - 0.3, 0.32, 0]),
    site.one('fuel_tank', 'fuel_tank_car', [s.rearAxle + 0.65, s.sill, 0]),
    site.one('exhaust', 'exhaust_car', [s.rear + 0.46, 0.2, 0.42]),
    site.one('rear_axle', 'twist_beam', [s.rearAxle, 0, 0]),
    site.one('steering_wheel', 'steering_wheel', [s.cowl - 0.4, s.waist - 0.2, -0.37]),
    site.one('gear_lever', 'gear_lever', [s.cowl - 0.4, 0.55, 0]),
    site.one('rear_bench', 'bench_seat_3', [-0.55, s.floor, 0]),
  ]
  + site.pair('front_wing', 'saloon_front_wing')
  + site.pair('front_door', 'saloon_front_door')
  + site.pair('rear_door', 'saloon_rear_door')
  + site.pair('tail_lamp', 'saloon_tail_lamp')
  + site.pair('front_strut', 'front_strut', [s.frontAxle, 0.28, s.side - 0.105 - 0.05])
  + site.pair('front_wheel', 'wheel_205_55r16', [s.frontAxle, 0.316, s.side - 0.105])
  + site.pair('rear_wheel', 'wheel_205_55r16', [s.rearAxle, 0.316, s.side - 0.105])
  + site.pair('front_seat', 'front_seat', [0.05, s.floor, 0.37])
  + site.pair('door_mirror', 'door_mirror', [s.cowl - 0.04, s.waist, s.side - 0.03])
  + site.headlamps(s.front - 0.07, 0.66, 0.62)
  + site.batteryBay('battery_tray', [s.aPost + 0.25, 0.5, -0.44]),
}
