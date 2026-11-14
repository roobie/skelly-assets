local site = import 'site.libsonnet';
local s = import 'city_car.spec.libsonnet';
{
  title: 'City car',
  sites: [
    site.one('shell', 'city_car_shell'),
    site.one('windscreen', 'city_car_windscreen'),
    site.one('tailgate', 'city_car_tailgate'),
    site.one('bonnet', 'city_car_bonnet'),
    site.one('front_bumper', 'city_car_front_bumper'),
    site.one('rear_bumper', 'city_car_rear_bumper'),
    site.one('dashboard', 'city_car_dashboard'),
    site.one('engine', 'engine_i3_small', [s.frontAxle - 0.02, 0.3, 0]),
    site.one('gearbox', 'gearbox_transaxle', [s.frontAxle - 0.02, 0.3, -0.36]),
    site.one('radiator', 'radiator_small', [s.front - 0.3, 0.32, 0]),
    site.one('fuel_tank', 'fuel_tank_car', [-0.62, s.sill, 0]),
    site.one('exhaust', 'exhaust_small', [s.rear + 0.46, 0.2, 0.38]),
    site.one('rear_axle', 'twist_beam', [s.rearAxle, 0, 0]),
    site.one('steering_wheel', 'steering_wheel', [s.cowl - 0.4, s.waist - 0.2, -0.37]),
    site.one('gear_lever', 'gear_lever', [s.cowl - 0.4, 0.55, 0]),
    site.one('rear_bench', 'bench_seat_2', [-0.72, s.floor, 0]),
  ]
  + site.pair('front_wing', 'city_car_front_wing')
  + site.pair('front_door', 'city_car_front_door')
  + site.pair('tail_lamp', 'city_car_tail_lamp')
  + site.pair('front_strut', 'front_strut', [s.frontAxle, 0.245, s.side - 0.085 - 0.05])
  + site.pair('front_wheel', 'wheel_165_70r13', [s.frontAxle, 0.281, s.side - 0.085])
  + site.pair('rear_wheel', 'wheel_165_70r13', [s.rearAxle, 0.281, s.side - 0.085])
  + site.pair('front_seat', 'front_seat', [0, s.floor, 0.37])
  + site.pair('door_mirror', 'door_mirror', [s.cowl - 0.04, s.waist, s.side - 0.03])
  + site.headlamps(s.front - 0.07, 0.62, 0.5)
  + site.batteryBay('battery_tray', [s.aPost + 0.25, 0.5, -0.36]),
}
