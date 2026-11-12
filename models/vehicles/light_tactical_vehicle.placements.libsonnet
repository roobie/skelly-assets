local site = import 'site.libsonnet';
local one = site.one;
local pair = site.pair;
local s = import 'light_tactical_vehicle.spec.libsonnet';
local id = 'light_tactical_vehicle';
local wheel = id + '_wheel';
{
  title: 'Light tactical vehicle',
  sites: [
    one('frame', id + '_frame'),
    one('hull', id + '_hull'),
    one('bonnet', id + '_bonnet'),
    one('grille', id + '_grille'),
    one('brush_guard', id + '_brush_guard'),
    one('bed_floor', id + '_bed_floor'),
    one('tailgate', id + '_tailgate'),
    one('windscreen', id + '_windscreen'),
    one('dashboard', id + '_dashboard'),
    one('roof_hatch', id + '_roof_hatch'),
    one('steering_box', id + '_steering_box'),
    one('front_axle', id + '_portal_axle', [s.frontAxle, 0, 0]),
    one('rear_axle', id + '_portal_axle', [s.rearAxle, 0, 0]),
    one('engine', 'engine_i6_diesel', [1.38, 0.5, 0]),
    one('gearbox', 'gearbox_truck', [0.59, 0.58, 0]),
    one('rear_prop_shaft', id + '_rear_prop_shaft', [-0.87, 0.54, 0]),
    one('front_prop_shaft', 'prop_shaft_short', [1.02, 0.55, 0.2]),
    one('radiator', 'radiator_van', [2.02, 0.62, 0]),
    one('fuel_tank', 'fuel_tank_car', [-2.3, 0.62, 0]),
    one('exhaust', 'exhaust_military', [-1.4, 0.52, 0.3]),
    one('steering_wheel', 'steering_wheel', [0.5, 1.32, -s.seatZ]),
    one('gear_lever', 'gear_lever', [0.3, 1.0, 0]),
  ]
  + pair('front_wheel', wheel, [s.frontAxle, s.hub, s.wheelZ])
  + pair('rear_wheel', wheel, [s.rearAxle, s.hub, s.wheelZ])
  + pair('front_door', id + '_front_door')
  + pair('rear_door', id + '_rear_door')
  + pair('front_seat', 'front_seat', [s.frontSeat, s.floor, s.seatZ])
  + pair('rear_seat', 'front_seat', [s.rearSeat, s.floor, s.seatZ])
  + pair('mirror', 'door_mirror', [s.topFront, s.waist + 0.04, s.upperSkin])
  + pair('headlamp', id + '_headlamp', [s.nose, 0.86, 0.72])
  + pair('side_lamp', 'marker_lamp', [s.nose + 0.02, 0.8, 0.94])
  + pair('tail_lamp', 'tail_lamp_small', [s.rear, 0.92, 0.88])
  + site.batteryBay('truck_battery_tray', [1.25, 0.9, -0.5]),
  tags: { 'vehicle-role': ['military'] },
  overlaps: [
    site.overlap('hull', 'gearbox', 0.34,
      'The gearbox sits in the floor tunnel, which the cab part draws as a solid block around it.'),
  ],
  unjudged: [
    site.unjudged('frame', 'front_prop_shaft', 0.034,
      'The tube piece of light_tactical_vehicle_frame runs into the cross_4 piece of prop_shaft_short.'),
    site.unjudged('frame', 'rear_prop_shaft', 0.032,
      'The tube piece of light_tactical_vehicle_frame runs into the cross_2 piece of light_tactical_vehicle_rear_prop_shaft.'),
    site.unjudged('tailgate', 'fuel_tank', 0.052,
      'The gate piece of light_tactical_vehicle_tailgate runs into the body piece of fuel_tank_car.'),
  ],
}
