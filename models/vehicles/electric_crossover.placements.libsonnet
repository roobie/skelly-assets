local site = import 'site.libsonnet';
local s = import 'electric_crossover.spec.libsonnet';
{
  sites: [
    site.one('shell', 'electric_crossover_shell'),
    site.one('windscreen', 'electric_crossover_windscreen'),
    site.one('tailgate', 'electric_crossover_tailgate'),
    site.one('bonnet', 'electric_crossover_bonnet'),
    site.one('front_bumper', 'electric_crossover_front_bumper'),
    site.one('rear_bumper', 'electric_crossover_rear_bumper'),
    site.one('dashboard', 'electric_crossover_dashboard'),
    site.one('rear_axle', 'twist_beam', [s.rearAxle, 0.05, 0]),
    site.one('steering_wheel', 'steering_wheel', [s.cowl - 0.4, s.waist - 0.2, -0.37]),
    site.one('gear_lever', 'gear_lever', [s.cowl - 0.4, 0.65, 0]),
    site.one('rear_bench', 'bench_seat_3', [-0.62, s.floor, 0]),
    site.one('motor', 'traction_motor_car', [s.frontAxle - 0.02, 0.3, 0]),
    site.one('inverter', 'inverter_car', [s.frontAxle - 0.05, 0.64, 0.05]),
    site.one('pack', 'traction_pack_car', [(s.rearFloorFront + s.cowl) / 2, s.sill, 0]),
    site.one('charge_port', 'charge_port', [s.rearAxle - 0.15, s.archTop + 0.05, s.side]),
  ]
  + site.pair('front_wing', 'electric_crossover_front_wing')
  + site.pair('front_door', 'electric_crossover_front_door')
  + site.pair('rear_door', 'electric_crossover_rear_door')
  + site.pair('tail_lamp', 'electric_crossover_tail_lamp')
  + site.pair('cladding', 'electric_crossover_cladding')
  + site.pair('front_strut', 'front_strut', [s.frontAxle, 0.331, s.side - 0.1175 - 0.05])
  + site.pair('front_wheel', 'wheel_235_75r15', [s.frontAxle, 0.367, s.side - 0.1175])
  + site.pair('rear_wheel', 'wheel_235_75r15', [s.rearAxle, 0.367, s.side - 0.1175])
  + site.pair('front_seat', 'front_seat', [0.08, s.floor, 0.37])
  + site.pair('door_mirror', 'door_mirror', [s.cowl - 0.04, s.waist, s.side - 0.03])
  + site.headlamps(s.front - 0.07, 0.8, 0.62)
  + site.batteryBay('battery_tray', [s.aPost + 0.25, 0.55, -0.44]),
}
