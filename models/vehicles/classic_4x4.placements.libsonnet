local site = import 'site.libsonnet';
local s = import 'classic_4x4.spec.libsonnet';
{
  title: 'Classic 4x4',
  sites: [
    site.one('shell', 'classic_4x4_shell'),
    site.one('windscreen', 'classic_4x4_windscreen'),
    site.one('tailgate', 'classic_4x4_tailgate'),
    site.one('bonnet', 'classic_4x4_bonnet'),
    site.one('front_bumper', 'classic_4x4_front_bumper'),
    site.one('rear_bumper', 'classic_4x4_rear_bumper'),
    site.one('dashboard', 'classic_4x4_dashboard'),
    site.one('engine', 'engine_v8_petrol', [1.25, 0.49, 0]),
    site.one('gearbox', 'gearbox_inline', [0.63, 0.45, 0]),
    site.one('front_axle', 'beam_axle_light', [s.frontAxle, s.hub - 0.37, 0]),
    site.one('rear_axle', 'beam_axle_light', [s.rearAxle, s.hub - 0.37, 0]),
    site.one('prop_shaft', 'prop_shaft_short', [-0.5, 0.33, 0]),
    site.one('front_prop_shaft', 'prop_shaft_short', [0.74, 0.33, 0]),
    site.one('radiator', 'radiator_van', [s.front - 0.3, 0.5, 0]),
    site.one('fuel_tank', 'fuel_tank_van', [s.rear + 0.42, 0.36, -0.16]),
    site.one('exhaust', 'exhaust_car', [s.rear + 0.42, 0.27, 0.42]),
    site.one('steering_wheel', 'steering_wheel', [s.cowl - 0.4, s.waist - 0.2, -0.37]),
    site.one('gear_lever', 'gear_lever', [s.cowl - 0.4, 0.77, 0]),
    // A two-seat bench fits between the rear wheel arches; a three-seat one would stand on the tyres.
    site.one('rear_bench', 'bench_seat_2', [-1.0, 0.7, 0]),
    site.one('spare_wheel', 'spare_wheel_carrier', [s.rear + 0.05, 1.2, 0]),
    site.one('tow_hitch', 'tow_hitch', [s.rear + 0.02, 0.37, 0]),
  ]
  + site.pair('front_wing', 'classic_4x4_front_wing')
  + site.pair('front_door', 'classic_4x4_front_door')
  + site.pair('tail_lamp', 'classic_4x4_tail_lamp')
  + site.pair('front_strut', 'front_strut', [s.frontAxle, s.hub, s.wheelZ - 0.05])
  + site.pair('front_wheel', 'wheel_265_75r16', [s.frontAxle, s.hub, s.wheelZ])
  + site.pair('rear_wheel', 'wheel_265_75r16', [s.rearAxle, s.hub, s.wheelZ])
  + site.pair('front_seat', 'front_seat', [-0.05, s.floor, 0.37])
  + site.pair('door_mirror', 'door_mirror', [s.cowl - 0.04, s.waist, s.side - 0.03])
  + site.pair('headlamp', 'headlamp_round', [s.front - 0.035, 0.76, 0.6])
  + site.batteryBay('battery_tray', [s.aPost + 0.25, 0.72, -0.44]),
  swingUnjudged: [
    site.swingUnjudged('bonnet', 'shell', 0.0118, 'skin meets bulkhead'),
    site.swingUnjudged('tailgate', 'shell', 0.0127, 'glass_1 meets roof'),
    site.swingUnjudged('tailgate', 'spare_wheel', 0.0349, 'skin meets tyre'),
  ],
}
