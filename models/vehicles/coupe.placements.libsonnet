local site = import 'site.libsonnet';
local engine = import 'engine-kit.libsonnet';
local wheel = import 'wheel-kit.libsonnet';
local cooling = import 'cooling-kit.libsonnet';
local tank = import 'fuel-tank-kit.libsonnet';
local exhaust = import 'exhaust-kit.libsonnet';
local s = import 'coupe.spec.libsonnet';
{
  title: 'Coupe',
  sites: [
    site.one('shell', 'coupe_shell'),
    site.one('windscreen', 'coupe_windscreen'),
    site.one('boot_lid', 'coupe_boot_lid'),
    site.one('bonnet', 'coupe_bonnet'),
    site.one('front_bumper', 'coupe_front_bumper'),
    site.one('rear_bumper', 'coupe_rear_bumper'),
    site.one('dashboard', 'coupe_dashboard'),
  ] + engine.sites('i4_petrol', [s.frontAxle - 0.02, 0.2, 0], 'assembly') + [
    site.one('gearbox', 'gearbox_transaxle', [s.frontAxle - 0.02, 0.3, -0.36]),
  ] + cooling.sites(engine.radiator('i4_petrol'), [s.front - 0.3, 0.32, 0], 'assembly')
  + tank.sites('fuel_tank_car', [s.rearAxle + 0.65, s.sill, 0], 'assembly')
  + exhaust.sites('exhaust_coupe', [s.rear + 0.46, 0.2, 0.42], 'assembly') + [
    site.one('rear_axle', 'twist_beam', [s.rearAxle, 0, 0]),
    site.one('steering_wheel', 'steering_wheel', [s.cowl - 0.4, s.waist - 0.16, -0.37]),
    site.one('gear_lever', 'gear_lever', [s.cowl - 0.4, 0.55, 0]),
    site.one('rear_bench', 'bench_seat_2', [-0.6, s.floor, 0]),
  ]
  + site.pair('front_wing', 'coupe_front_wing')
  + site.pair('front_door', 'coupe_front_door')
  + site.pair('tail_lamp', 'coupe_tail_lamp')
  + site.pair('front_strut', 'front_strut', [s.frontAxle, 0.28, s.side - 0.105 - 0.05])
  + wheel.pair(site.kit, 'front_wheel', 'wheel_205_55r16', [s.frontAxle, 0.316, s.side - 0.105], 'disc')
  + wheel.pair(site.kit, 'rear_wheel', 'wheel_205_55r16', [s.rearAxle, 0.316, s.side - 0.105], 'disc')
  + site.pair('front_seat', 'front_seat', [-0.02, s.floor, 0.37])
  + site.pair('door_mirror', 'door_mirror', [s.cowl - 0.04, s.waist, s.side - 0.03])
  + site.headlamps(s.front - 0.07, 0.56, 0.62)
  + site.batteryBay('battery_tray', [s.aPost + 0.25, 0.5, -0.44]),
  swingUnjudged: [
    site.swingUnjudged('boot_lid', 'shell', 0.0196, 'skin meets boot_side_far'),
  ],
}
