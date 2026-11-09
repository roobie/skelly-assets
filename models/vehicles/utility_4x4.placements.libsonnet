local site = import 'site.libsonnet';
local s = import 'utility_4x4.spec.libsonnet';
local wheel = 'utility_4x4_wheel';
{
  sites: [
    site.one('frame', 'utility_4x4_frame'),
    site.one('hull', 'utility_4x4_hull'),
    site.one('hood', 'utility_4x4_hood'),
    site.one('face', 'utility_4x4_face'),
    site.one('guard', 'utility_4x4_guard'),
    site.one('windscreen', 'utility_4x4_windscreen'),
    site.one('dashboard', 'utility_4x4_dashboard'),
    site.one('hatch', 'utility_4x4_hatch'),
    site.one('steering_box', 'utility_4x4_steering_box'),
    site.one('front_axle', 'beam_axle_van', [s.frontAxle, s.hub - 0.37, 0]),
    site.one('rear_axle', 'beam_axle_van', [s.rearAxle, s.hub - 0.37, 0]),
    site.one('engine', 'engine_i4_diesel', [1.3, 0.5, 0]),
    site.one('gearbox', 'gearbox_inline', [0.74, 0.5, 0]),
    site.one('prop_shaft', 'prop_shaft_long', [-0.4, 0.42, 0]),
    site.one('radiator', 'radiator_van', [2.14, 0.56, 0]),
    site.one('fuel_tank', 'fuel_tank_car', [-2.0, 0.42, 0]),
    site.one('exhaust', 'exhaust_car', [-1.92, 0.36, 0.55]),
    site.one('tow_hitch', 'tow_hitch', [s.rear - 0.07, 0.5, 0]),
    site.one('steering_wheel', 'steering_wheel', [s.cabFront - 0.23, s.waist + 0.13, -0.51]),
    site.one('gear_lever', 'gear_lever', [0.46, s.floor + 0.26, 0]),
  ]
  + site.pair('front_wheel', wheel, [s.frontAxle, s.hub, s.wheelZ])
  + site.pair('rear_wheel', wheel, [s.rearAxle, s.hub, s.wheelZ])
  + site.pair('front_door', 'utility_4x4_front_door')
  + site.pair('rear_door', 'utility_4x4_rear_door')
  + site.pair('front_seat', 'front_seat', [0.24, s.floor, 0.52])
  + site.pair('rear_seat', 'front_seat', [-0.54, s.floor, 0.52])
  + site.pair('mirror', 'door_mirror', [s.cabFront - 0.02, s.waist + 0.12, s.skin])
  + site.pair('headlamp', 'headlamp_large', [s.nose - 0.02, 0.8, 0.8])
  + site.pair('tail_lamp', 'tail_lamp_small', [s.rear - 0.02, 0.92, 0.9])
  + site.batteryBay('hatchback_battery_tray', [1.9, 0.92, 0.42]),
  tags: { 'vehicle-body': ['armoured'] },
}
