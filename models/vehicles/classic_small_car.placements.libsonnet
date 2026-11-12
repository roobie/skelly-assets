local site = import 'site.libsonnet';
local s = import 'classic_small_car.spec.libsonnet';
{
  title: 'Classic small car',
  sites: [
    site.one('shell', 'classic_small_car_shell'),
    site.one('windscreen', 'classic_small_car_windscreen'),
    site.one('bonnet', 'classic_small_car_bonnet'),
    site.one('grille', 'classic_small_car_grille'),
    site.one('boot_lid', 'classic_small_car_boot_lid'),
    site.one('front_bumper', 'classic_small_car_front_bumper'),
    site.one('rear_bumper', 'classic_small_car_rear_bumper'),
    site.one('dashboard', 'classic_small_car_dashboard'),
    site.one('front_axle', 'classic_small_car_front_axle'),
    site.one('rear_axle', 'classic_small_car_rear_axle'),
    site.one('engine', 'engine_i3_small', [s.frontAxle + 0.05, 0.3, 0]),
    site.one('gearbox', 'gearbox_transaxle', [s.frontAxle - 0.02, 0.32, -0.3]),
    site.one('radiator', 'radiator_small', [1.58, 0.34, 0]),
    site.one('fuel_tank', 'fuel_tank_car', [-1.55, 0.42, 0]),
    site.one('exhaust', 'exhaust_small', [s.rear + 0.46, 0.17, 0.28]),
    site.one('steering_wheel', 'steering_wheel', [0.48, 0.66, -0.26]),
    site.one('gear_lever', 'gear_lever', [0.45, s.floor, 0]),
    site.one('front_bench', 'bench_seat_low', [0.12, s.floor, 0]),
    site.one('rear_bench', 'bench_seat_low', [-0.72, s.floor, 0]),
  ]
  + site.pair('front_wing', 'classic_small_car_front_wing')
  + site.pair('door', 'classic_small_car_door')
  + site.pair('headlamp', 'headlamp_round', [1.5, 0.575, 0.62])
  + site.pair('front_wheel', 'wheel_165_70r13', [s.frontAxle, s.hub, s.wheelZ])
  + site.pair('rear_wheel', 'wheel_165_70r13', [s.rearAxle, s.hub, s.wheelZ])
  + site.pair('tail_lamp', 'tail_lamp_small', [s.rear + 0.06, 0.58, 0.44])
  + site.pair('door_mirror', 'door_mirror_bright', [0.76, s.waist, s.body - 0.02])
  + site.batteryBay('battery_tray', [1.3, 0.56, 0.28]),
}
