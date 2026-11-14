local site = import 'site.libsonnet';
local s = import 'muscle_car.spec.libsonnet';
{
  title: 'Muscle car',
  sites: [
    site.one('shell', 'muscle_car_shell'),
    site.one('windscreen', 'muscle_car_windscreen'),
    site.one('boot_lid', 'muscle_car_boot_lid'),
    site.one('bonnet', 'muscle_car_bonnet'),
    site.one('front_bumper', 'muscle_car_front_bumper'),
    site.one('rear_bumper', 'muscle_car_rear_bumper'),
    site.one('dashboard', 'muscle_car_dashboard'),
    site.one('engine', 'engine_v8_petrol', [s.frontAxle - 0.3, 0.22, 0]),
    site.one('gearbox', 'gearbox_inline', [s.cowl + 0.0, 0.2, 0]),
    site.one('rear_axle', 'beam_axle_light', [s.rearAxle, -0.003, 0]),
    site.one('prop_shaft', 'prop_shaft_short', [-0.38, 0.24, 0]),
    site.one('radiator', 'radiator_car', [s.front - 0.3, 0.32, 0]),
    site.one('fuel_tank', 'fuel_tank_car', [s.rearAxle - 0.5, 0.22, 0]),
    site.one('steering_wheel', 'steering_wheel', [s.cowl - 0.4, s.waist - 0.2, -0.37]),
    site.one('gear_lever', 'gear_lever', [s.cowl - 0.4, 0.55, 0]),
    site.one('rear_bench', 'bench_seat_2', [-0.6, s.floor, 0]),
  ]
  + site.pair('front_wing', 'muscle_car_front_wing')
  + site.pair('front_door', 'muscle_car_front_door')
  + site.pair('tail_lamp', 'muscle_car_tail_lamp')
  // The cat cans run under the floor pan beneath the rear bench, their tops at the pan's underside.
  + site.pair('exhaust', 'exhaust_small', [s.rear + 0.46, s.floor - 0.18, 0.5])
  + site.pair('front_strut', 'front_strut', [s.frontAxle, 0.331, s.side - 0.12 - 0.05])
  + site.pair('front_wheel', 'wheel_235_75r15', [s.frontAxle, 0.367, s.side - 0.12])
  + site.pair('rear_wheel', 'wheel_235_75r15', [s.rearAxle, 0.367, s.side - 0.12])
  + site.pair('front_seat', 'front_seat', [-0.02, s.floor, 0.37])
  + site.pair('door_mirror', 'door_mirror', [s.cowl - 0.04, s.waist, s.side - 0.03])
  + site.headlamps(s.front - 0.07, 0.68, 0.7)
  + site.batteryBay('battery_tray', [s.aPost + 0.25, 0.5, -0.44]),
}
