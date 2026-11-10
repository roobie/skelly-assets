local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'cab_over_field_car.spec.libsonnet';
local id = 'cab_over_field_car';
{
  sites: [
    one('frame', id + '_frame'),
    one('hull', id + '_hull'),
    one('front_bumper', id + '_front_bumper'),
    one('grille', id + '_grille'),
    one('windscreen', id + '_windscreen'),
    one('dashboard', id + '_dashboard'),
    one('engine_cover', id + '_engine_cover'),
    one('front_axle', id + '_axle', [s.frontAxle, 0, 0]),
    one('rear_axle', id + '_axle', [s.rearAxle, 0, 0]),
    one('engine', 'engine_i4_petrol', [s.engineX, s.engineY, 0]),
    one('gearbox', 'gearbox_inline', [s.engineX - 0.53, s.engineY, 0]),
    one('transfer_case', id + '_transfer_case', [s.engineX - 1.02, 0.48, 0]),
    one('front_prop_shaft', id + '_front_prop_shaft', [0.7, s.driveY, 0.2]),
    one('rear_prop_shaft', id + '_rear_prop_shaft', [-0.43, s.driveY, 0]),
    one('radiator', 'radiator_small', [1.84, 0.58, 0]),
    one('fuel_tank', 'fuel_tank_car', [-1.3, 0.47, 0]),
    one('exhaust', 'exhaust_military', [-1.6, 0.46, -0.45]),
    one('steering_wheel', 'steering_wheel', [1.6, s.floor + 0.63, -s.seatZ]),
    one('gear_lever', 'gear_lever', [0.45, s.floor, 0]),
  ]
  + pair('front_wheel', id + '_wheel', [s.frontAxle, s.hub, s.wheelZ])
  + pair('rear_wheel', id + '_wheel', [s.rearAxle, s.hub, s.wheelZ])
  + pair('front_door', id + '_front_door')
  + pair('rear_door', id + '_rear_door')
  + pair('front_seat', 'front_seat', [s.seatX, s.floor, s.seatZ])
  + pair('headlamp', id + '_headlamp', [s.front - 0.0625, 0.92, 0.62])
  + pair('tail_lamp', 'tail_lamp_small', [s.rear + 0.03, 0.62, 0.7])
  + site.batteryBay('battery_tray', [1.6, 0.58, 0.55]),
  tags: { 'vehicle-role': ['military'] },
}
