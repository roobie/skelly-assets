local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'army_jeep.spec.libsonnet';
{
  title: 'Army 4x4',
  sites: [
    one('frame', 'army_jeep_frame'),
    one('tub', 'army_jeep_tub'),
    one('bonnet', 'army_jeep_bonnet'),
    one('grille', 'army_jeep_grille'),
    one('windscreen', 'army_jeep_windscreen'),
    one('dashboard', 'army_jeep_dashboard'),
    one('folded_canvas', 'army_jeep_folded_canvas'),
    one('steering_box', 'army_jeep_steering_box'),
    one('front_axle', 'beam_axle_light', [s.frontAxle, 0, 0]),
    one('rear_axle', 'beam_axle_light', [s.rearAxle, 0, 0]),
    one('engine', 'engine_i4_petrol', [0.66, 0.36, 0]),
    one('gearbox', 'gearbox_inline', [0.14, 0.38, 0]),
    one('prop_shaft', 'prop_shaft_short', [-0.42, 0.36, 0]),
    one('radiator', 'radiator_small', [1.44, 0.58, 0]),
    one('fuel_tank', 'fuel_tank_car', [-1.42, 0.35, 0]),
    one('exhaust', 'exhaust_military', [s.rearAxle - 0.34, 0.44, 0.42]),
    one('spare_wheel', 'spare_wheel_carrier', [s.rear, 0.76, 0]),
    one('tow_hitch', 'tow_hitch', [s.rear, 0.42, 0]),
    one('steering_wheel', 'steering_wheel', [0.08, 0.98, -0.3]),
    one('gear_lever', 'gear_lever', [0.02, s.floor + 0.1, 0]),
  ]
  + pair('front_wheel', 'wheel_military_16', [s.frontAxle, s.hub, s.wheelZ])
  + pair('rear_wheel', 'wheel_military_16', [s.rearAxle, s.hub, s.wheelZ])
  + pair('front_wing', 'army_jeep_front_wing')
  + pair('rear_fender', 'army_jeep_rear_fender')
  + pair('side_rail', 'army_jeep_side_rail')
  + pair('front_seat', 'army_jeep_seat', [-0.26, s.floor, 0.3])
  + pair('rear_seat', 'army_jeep_seat', [-0.86, s.floor, 0.3])
  + pair('mirror', 'door_mirror', [s.cowl - 0.03, s.bonnetBack + 0.18, 0.62])
  + pair('tail_lamp', 'tail_lamp_small', [s.rear - 0.02, 0.76, 0.5])
  + pair('headlamp', 'headlamp_military', [s.nose + 0.06, 0.595, 0.27])
  + site.batteryBay('battery_tray', [0.72, 0.72, -0.3]),
  tags: { 'vehicle-role': ['military'] },
}
