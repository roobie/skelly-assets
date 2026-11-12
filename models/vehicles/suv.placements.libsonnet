local site = import 'site.libsonnet';
local s = import 'suv.spec.libsonnet';
{
  title: 'SUV',
  sites: [
    site.one('shell', 'suv_shell'),
    site.one('windscreen', 'suv_windscreen'),
    site.one('tailgate', 'suv_tailgate'),
    site.one('bonnet', 'suv_bonnet'),
    site.one('front_bumper', 'suv_front_bumper'),
    site.one('rear_bumper', 'suv_rear_bumper'),
    site.one('dashboard', 'suv_dashboard'),
    site.one('engine', 'engine_v6_petrol', [1.35, 0.45, 0]),
    site.one('gearbox', 'gearbox_inline', [0.79, 0.42, 0]),
    site.one('rear_axle', 'beam_axle_light', [s.rearAxle, 0.032, 0]),
    site.one('prop_shaft', 'prop_shaft_short', [-0.48, 0.42, 0]),
    site.one('radiator', 'radiator_van', [s.front - 0.3, 0.48, 0]),
    site.one('fuel_tank', 'fuel_tank_van', [s.rearAxle - 0.55, 0.34, -0.06]),
    site.one('steering_wheel', 'steering_wheel', [s.cowl - 0.4, s.waist - 0.2, -0.37]),
    site.one('gear_lever', 'gear_lever', [s.cowl - 0.4, 0.75, 0]),
    site.one('rear_bench', 'bench_seat_3', [-0.72, s.floor, 0]),
    site.one('roof_rails', 'suv_roof_rails'),
    site.one('spare_wheel', 'spare_wheel_carrier', [s.rear + 0.05, 1.15, 0]),
    site.one('front_axle', 'beam_axle_light', [s.frontAxle, 0.032, 0]),
    site.one('front_prop_shaft', 'prop_shaft_short', [1.05, 0.42, 0]),
    site.one('exhaust', 'exhaust_long', [s.rear + 0.58, 0.34, 0.5]),
    site.one('tow_hitch', 'tow_hitch', [s.rear + 0.02, 0.35, 0]),
  ]
  + site.pair('front_wing', 'suv_front_wing')
  + site.pair('front_door', 'suv_front_door')
  + site.pair('rear_door', 'suv_rear_door')
  + site.pair('tail_lamp', 'suv_tail_lamp')
  + site.pair('arch_flare', 'suv_arch_flare')
  + site.pair('side_step', 'suv_side_step')
  + site.pair('front_strut', 'front_strut', [s.frontAxle, 0.366, s.side - 0.1325 - 0.05])
  + site.pair('front_wheel', 'wheel_265_75r16', [s.frontAxle, 0.402, s.side - 0.1325])
  + site.pair('rear_wheel', 'wheel_265_75r16', [s.rearAxle, 0.402, s.side - 0.1325])
  + site.pair('front_seat', 'front_seat', [0.05, s.floor, 0.37])
  + site.pair('door_mirror', 'door_mirror', [s.cowl - 0.04, s.waist, s.side - 0.03])
  + site.headlamps(s.front - 0.07, 0.95, 0.62)
  + site.batteryBay('battery_tray', [s.aPost + 0.25, 0.7, -0.44]),
}
