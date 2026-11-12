local site = import 'site.libsonnet';
local s = import 'small_tractor.spec.libsonnet';
{
  title: 'Small tractor',
  sites: [
    site.one('chassis', 'small_tractor_chassis'),
    site.one('bonnet', 'small_tractor_bonnet'),
    site.one('roll_bar', 'small_tractor_roll_bar'),
    site.one('front_axle', 'small_tractor_front_axle', [s.frontAxle, 0, 0]),
    site.one('rear_axle', 'beam_axle_light', [s.rearAxle, s.rearHub - 0.37, 0]),
    site.one('engine', 'engine_i3_small', [0.85, 0.66, 0]),
    site.one('gearbox', 'gearbox_inline', [0.15, 0.5, 0]),
    site.one('radiator', 'radiator_small', [1.3, 0.72, 0]),
    site.one('fuel_tank', 'fuel_tank_car', [0.2, 1.1, 0]),
    site.one('exhaust', 'exhaust_stack_small', [0.85, 1.22, -0.18]),
    site.one('hitch', 'tow_hitch', [s.rear - 0.04, 0.34, 0]),
    site.one('seat', 'pan_seat', [-0.56, s.deck + 0.06, 0]),
    site.one('steering_wheel', 'steering_wheel_raked', [0.075, 1.46, 0]),
    site.one('gear_lever', 'gear_lever', [-0.15, s.deck, 0.14]),
    site.one('beacon', 'beacon_amber', [s.barX, s.barTop, 0]),
  ]
  + site.pair('footboard', 'small_tractor_footboard')
  + site.pair('rear_fender', 'small_tractor_fender')
  + site.pair('front_wheel', 'wheel_6_50r16_ag', [s.frontAxle, s.frontHub, s.frontZ])
  + site.pair('rear_wheel', 'wheel_11_2r24', [s.rearAxle, s.rearHub, s.rearZ])
  // On the dark roll bar, because the fender is as red as the lens.
  + site.pair('tail_lamp', 'tail_lamp_small', [s.barX - 0.07, 1.3, s.barZ])
  + site.headlamps(s.nose, 0.98, 0.2)
  + site.batteryBay('battery_tray', [0.2, 0.92, 0]),
  tags: { 'vehicle-role': ['farm'] },
}
