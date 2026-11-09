local site = import 'site.libsonnet';
local s = import 'tractor.spec.libsonnet';
{
  sites: [
    site.one('chassis', 'tractor_chassis'),
    site.one('bonnet', 'tractor_bonnet'),
    site.one('cab', 'tractor_cab'),
    site.one('windscreen', 'tractor_windscreen'),
    site.one('rear_window', 'tractor_rear_window'),
    site.one('front_pivot', 'tractor_front_pivot'),
    site.one('front_axle', 'beam_axle_light', [s.frontAxle, 0, 0]),
    site.one('rear_axle', 'beam_axle_truck', [s.rearAxle, s.rearHub - 0.52, 0]),
    site.one('front_weight', 'tractor_front_weight'),
    site.one('engine', 'engine_i6_diesel', [0.92, 0.74, 0]),
    site.one('gearbox', 'gearbox_heavy', [-0.2, 0.5, 0]),
    site.one('radiator', 'radiator_van', [1.55, 0.9, 0]),
    site.one('fuel_tank', 'fuel_tank_car', [0.22, 1.32, 0]),
    site.one('exhaust', 'exhaust_stack_small', [1.2, 1.54, -0.22]),
    site.one('hitch', 'tow_hitch', [-1.78, 0.5, 0]),
    site.one('seat', 'front_seat', [-0.72, s.deck + 0.05, 0]),
    site.one('steering_wheel', 'steering_wheel_raked', [s.cabFront - 0.33, 1.74, 0]),
    site.one('gear_lever', 'gear_lever', [s.cabFront - 0.42, s.deck + 0.05, 0.28]),
    site.one('beacon', 'beacon_amber', [-0.72, s.roof + 0.1, 0]),
  ]
  + site.pair('rear_fender', 'tractor_fender')
  + site.pair('cab_door', 'tractor_cab_door')
  + site.pair('front_wheel', 'wheel_6_50r16_ag', [s.frontAxle, s.frontHub, s.frontZ])
  + site.pair('rear_wheel', 'wheel_16_9r30', [s.rearAxle, s.rearHub, s.rearZ])
  + site.pair('tail_lamp', 'tail_lamp_small', [-1.98, 1.1, 0.9])
  + site.pair('mirror', 'door_mirror', [s.cabFront - 0.02, 2.2, s.cabSide])
  + site.headlamps(s.nose - 0.02, 1.2, 0.3)
  + site.batteryBay('hatchback_battery_tray', [0.22, 1.1, 0]),
  tags: { 'vehicle-role': ['farm'] },
}
